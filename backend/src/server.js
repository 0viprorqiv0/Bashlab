import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { SessionManager } from './services/sessionManager.js';
import { SandboxRunner } from './services/sandboxRunner.js';
import { startReaper } from './services/reaperService.js';
import { verifyTask } from './services/taskVerifier.js';
import { metrics } from './services/metrics.js';
import { HttpError } from './errors.js';

function rateLimiter(max, windowMs = 60000) {
  const buckets = new Map();
  let lastSweep = 0;
  return (req, res, next) => {
    const now = Date.now();
    if (now - lastSweep >= windowMs) {
      for (const [ip, item] of buckets) if (item.reset <= now) buckets.delete(ip);
      lastSweep = now;
    }
    const ip = req.ip;
    let bucket = buckets.get(ip);
    if (!bucket || bucket.reset <= now) {
      if (buckets.size >= 10000) return next(new HttpError(503, 'RATE_CAPACITY', 'Rate limiter capacity reached'));
      bucket = { count: 0, reset: now + windowMs };
      buckets.set(ip, bucket);
    }
    if (++bucket.count > max) {
      metrics.recordRateLimit();
      res.set('Retry-After', String(Math.ceil((bucket.reset - now) / 1000)));
      return next(new HttpError(429, 'RATE_LIMIT', 'Too many requests from this IP'));
    }
    next();
  };
}

export function createApp({ manager = new SessionManager(), runner = new SandboxRunner(),
  rateMax = Number(process.env.RATE_LIMIT_MAX || 30) } = {}) {
  if (!Number.isInteger(rateMax) || rateMax < 1) throw new Error('RATE_LIMIT_MAX must be a positive integer');
  const app = express();
  app.disable('x-powered-by');
  // No implicit trust of X-Forwarded-For; configure a known proxy at deployment.
  app.set('trust proxy', false);
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(',');
  app.use(cors({ origin: origins, methods: ['GET', 'POST', 'DELETE'] }));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Prometheus and JSON metrics endpoint
  app.get('/metrics', (req, res, next) => {
    const ip = req.socket.remoteAddress || '';
    const isAllowed = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip)
      || process.env.METRICS_ALLOW_ALL === 'true'
      || ip.startsWith('172.') || ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('::ffff:172.');
    if (!isAllowed) return next(new HttpError(403, 'LOCAL_ONLY', 'Local metrics only'));

    const wantsJson = req.query.format === 'json'
      || req.headers['content-type'] === 'application/json'
      || (req.headers.accept?.includes('application/json') && !req.headers.accept?.includes('text/plain'));

    if (wantsJson) {
      return res.json({
        cpu: process.cpuUsage(),
        rss: process.memoryUsage().rss,
        sessions: manager.sessions.size,
        active: runner.limit.activeCount,
        pending: runner.limit.pendingCount,
        counters: metrics.counters
      });
    }

    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics.toPrometheusText({ manager, runner }));
  });
  app.use('/api', rateLimiter(rateMax));
  app.use(express.json({ limit: '16kb', strict: true }));
  app.post('/api/sessions', async (_req, res) => res.status(201).json(manager.describe(await manager.create())));
  app.get('/api/sessions/:id', (req, res) => res.json(manager.describe(manager.get(req.params.id))));
  app.post('/api/sessions/:id/execute', async (req, res) => {
    const command = req.body?.command;
    if (typeof command !== 'string' || !command.trim() || command.includes('\0') || Buffer.byteLength(command) > 8192) {
      throw new HttpError(400, 'INVALID_COMMAND', 'command must contain 1–8192 UTF-8 bytes without NUL');
    }
    const result = await manager.withSession(req.params.id, async session => {
      await manager.checkQuota(session);
      let output;
      try {
        output = await runner.run({ command, cwd: session.cwd,
          workspacePath: `/var/tmp/bashlab/workspaces/${session.id}` });
        metrics.recordCommand(output.termination || 'completed', output.executionMs);
      } catch (error) {
        metrics.recordCommand('error', 0);
        if (error.code === 'RUNNER_UNCERTAIN') session.quarantined = true;
        throw error;
      }
      session.commandCount++;
      if (output.cwdUpdated && output.cwd.startsWith('/') && !output.cwd.includes('\0') && Buffer.byteLength(output.cwd) <= 4096) {
        session.cwd = output.cwd;
      }
      // Preserve command output when the post-run quota check fails.
      try { output.quota = await manager.checkQuota(session); }
      catch (error) {
        if (error.status !== 413) throw error;
        output.quotaExceeded = true;
        output.quotaError = error.message;
        metrics.counters.quota_exceeded++;
      }
      return output;
    });
    res.json(result);
  });
  app.post('/api/sessions/:id/check', async (req, res) => {
    res.json(await manager.withSession(req.params.id, async session => {
      await manager.checkQuota(session);
      return verifyTask(session, req.body?.lessonId);
    }));
  });
  app.post('/api/sessions/:id/reset', async (req, res) => {
    res.json(await manager.withSession(req.params.id, async session => {
      await manager.reset(session);
      return manager.describe(session);
    }));
  });
  app.delete('/api/sessions/:id', async (req, res) => {
    await manager.withSession(req.params.id, session => manager.remove(session));
    res.sendStatus(204);
  });
  app.use((_req, _res, next) => next(new HttpError(404, 'NOT_FOUND', 'Endpoint not found')));
  app.use((error, _req, res, _next) => {
    const status = error.status || 500;
    if (status >= 500) console.error(error.message);
    res.status(status).json({ error: { code: error.code || (status === 400 ? 'INVALID_JSON' : 'INTERNAL_ERROR'),
      message: status === 500 ? 'Internal server error' : error.message } });
  });
  return app;
}

export async function startServer() {
  const manager = new SessionManager();
  const runner = new SandboxRunner();
  // Fail startup if the runner or bind-mount mapping is not usable.
  const probe = await manager.create();
  let probeCompleted = false;
  try {
    const result = await runner.run({ command: 'printf ready > .bashlab-probe; cat .bashlab-probe', cwd: probe.cwd,
      workspacePath: `/var/tmp/bashlab/workspaces/${probe.id}` });
    probeCompleted = true;
    if (result.stdout !== 'ready' || result.exitCode !== 0 || !result.cwdUpdated) throw new Error('Runner readiness probe failed');
    const info = await fs.stat(`${probe.workspacePath}/home/.bashlab-probe`);
    if (process.getuid() !== 0 && info.uid !== process.getuid()) throw new Error('Backend and runner require the same host UID; see RUNNING.md');
  } finally {
    // A broken Docker connection does not prove the helper stopped using the path.
    if (probeCompleted) await manager.remove(probe);
  }
  // Discover after the probe so a full orphan inventory does not prevent the
  // API/reaper from starting and reclaiming that inventory.
  await manager.discoverOrphans();
  const stopReaper = startReaper(manager);
  const host = process.env.HOST || '0.0.0.0';
  const server = createApp({ manager, runner }).listen(Number(process.env.PORT || 3001), host, () => {
    console.log(`BashLab API listening on http://${host}:${server.address().port}`);
  });
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
    stopReaper();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 15000).unref();
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().catch(error => { console.error('Startup failed:', error.message); process.exitCode = 1; });
}
