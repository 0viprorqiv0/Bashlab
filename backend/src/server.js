import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'node:fs/promises';
import { timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { SessionManager } from './services/sessionManager.js';
import { SandboxRunner } from './services/sandboxRunner.js';
import { startReaper } from './services/reaperService.js';
import { verifyTask } from './services/taskVerifier.js';
import { metrics } from './services/metrics.js';
import { HttpError } from './errors.js';
import { isActiveAdmin, requireAuth } from './middleware/auth.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { createAuthRouter } from './routes/auth.js';
import { createContentRouter } from './routes/content.js';
import { createContentService, isUuid } from './services/contentService.js';
import { seedLabWorkspace } from './labs/seed.js';
import { createDashboardService } from './services/dashboardService.js';
import { createAuthService } from './services/authService.js';
import { createSupabaseAdmin, createSupabaseAnonFactory, createSupabaseUserFactory } from './lib/supabaseAdmin.js';
import { createMemoryLeaseStore } from './services/sandboxLeaseStore.js';

// `auth` decides who may use the sandbox:
//   { authenticate, isAdmin, maxSessionsPerUser } — every /api route needs a
//     valid Supabase token; a session belongs to the user who created it and
//     is invisible (404) to anyone else, except that an admin may end it.
//   false — no auth (benchmarks / local stress tests only; startServer only
//     allows this when SANDBOX_REQUIRE_AUTH=false is set explicitly).
// `authApi` ({ service, authenticate, limits }) mounts the /api/auth routes
// (login, register, password reset, profile) — the only place the frontend
// talks to for authentication. `sandbox: false` keeps the API up on machines
// without Docker/Linux; the sandbox endpoints then answer 503.
export function createApp({ manager = new SessionManager(), runner = new SandboxRunner(),
  leaseStore = createMemoryLeaseStore({ maxActiveLeases: Number(process.env.SANDBOX_MAX_ACTIVE_LEASES || 100) }),
  rateMax = Number(process.env.RATE_LIMIT_MAX || 30), auth, authApi = null, content = null, sandbox = true } = {}) {
  if (!Number.isInteger(rateMax) || rateMax < 1) throw new Error('RATE_LIMIT_MAX must be a positive integer');
  if (auth === undefined) throw new Error('createApp needs an explicit auth option (or auth: false)');
  const app = express();
  app.disable('x-powered-by');
  // No implicit trust of X-Forwarded-For; configure a known proxy at deployment.
  app.set('trust proxy', false);
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(',');
  // This server only ever answers JSON, so the policy is "nothing may load
  // or frame anything from here". CORP stays cross-origin: the Next.js app on
  // another origin fetches these endpoints (CORS below is the real gate).
  app.use(helmet({
    contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' },
  }));
  // credentials: the refresh-token cookie travels on cross-origin fetches from the allow-listed frontend only.
  app.use(cors({ origin: origins, credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
  // Every request feeds the admin dashboard (Prometheus scrapes /metrics).
  app.use((req, res, next) => {
    const started = process.hrtime.bigint();
    res.on('finish', () => {
      if (req.path === '/metrics' || req.path === '/health') return;
      metrics.recordHttp(req.method, req.originalUrl, res.statusCode, Number(process.hrtime.bigint() - started) / 1e9);
    });
    next();
  });
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Prometheus and JSON metrics endpoint
  app.get('/metrics', (req, res, next) => {
    // With METRICS_TOKEN set (production), only a caller presenting it may read
    // metrics — no matter which network it comes from. Without a token this
    // stays a development convenience: loopback and private networks only.
    const token = process.env.METRICS_TOKEN;
    if (token) {
      const presented = Buffer.from((req.headers.authorization || '').replace(/^Bearer /, ''));
      const expected = Buffer.from(token);
      if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) {
        return next(new HttpError(401, 'UNAUTHENTICATED', 'Metrics require a bearer token'));
      }
    } else {
      const ip = req.socket.remoteAddress || '';
      const isAllowed = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip)
        || process.env.METRICS_ALLOW_ALL === 'true'
        || ip.startsWith('172.') || ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('::ffff:172.');
      if (!isAllowed) return next(new HttpError(403, 'LOCAL_ONLY', 'Local metrics only'));
    }

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
  // Auth routes have their own (stricter, per-account) limits and must not
  // share a budget with sandbox commands, so they are mounted first.
  if (authApi) app.use('/api/auth', createAuthRouter({ ...authApi, origins }));

  // Progress + admin writes (own body parser, own auth, own — much higher —
  // rate limits): before the shared limiter below, which is sized for sandbox
  // commands and would throttle an admin editing content.
  if (auth && content) {
    app.use('/api', createContentRouter({ service: content.service, dashboard: content.dashboard, authenticate: auth.authenticate, isAdmin: auth.isAdmin, limits: content.limits }));
  }
  app.use('/api', rateLimiter(rateMax));
  if (!sandbox) {
    app.use('/api/sessions', (_req, _res, next) => next(new HttpError(503, 'SANDBOX_DISABLED', 'The practice sandbox is not enabled on this server')));
  }

  // Lease store is the durable ownership source. These maps remain only as
  // process-local indexes for compatibility with existing activity records.
  const sessionLeases = new Map();
  const sessionLessons = new Map();
  // sandbox session id -> practice_sessions row, so the admin Activity page
  // reflects reality without the browser writing those rows itself.
  const records = new Map();
  const closeRecord = (sessionId) => {
    const recordId = records.get(sessionId);
    if (!recordId) return;
    records.delete(sessionId);
    content.service.closePracticeRecord(recordId).catch(() => {});
  };
  // Puts the lab's starting files (and its flag) into the session's home directory.
  // A seeding failure must not take the session down; the lab is just emptier.
  const seedLab = async (session, lessonId) => {
    if (!lessonId || typeof content?.service?.getLessonSlug !== 'function') return;
    try {
      await seedLabWorkspace(session, await content.service.getLessonSlug(lessonId, true));
    } catch (error) {
      console.error('lab files could not be prepared:', error.message);
    }
  };
  const cleanupStaleSession = (sessionId) => {
    sessionLeases.delete(sessionId);
    sessionLessons.delete(sessionId);
    closeRecord(sessionId);
    // Whatever removed the session (DELETE, admin stop, reaper), its lease goes back
    // to the pool; otherwise every learner who ever opened a lab keeps a slot forever.
    Promise.resolve()
      .then(() => leaseStore.beginDeletion({ leaseId: sessionId }))
      .then(() => leaseStore.finishDeletion({ leaseId: sessionId }))
      .catch(() => {});
  };
  const detachSessionCleanup = manager.onRemoved((sessionId) => cleanupStaleSession(sessionId));
  const activeSessionOf = (userId) => {
    for (const [id, owner] of sessionLeases) {
      if (!manager.sessions.has(id)) cleanupStaleSession(id);
      else if (owner === userId) return manager.get(id);
    }
    return null;
  };
  // Another user's session answers exactly like a missing one, so session
  // ids can't be probed for existence.
  const ownSession = (req, _res, next) => {
    if (auth && sessionLeases.get(req.params.id) !== req.user.id) {
      return next(new HttpError(404, 'SESSION_NOT_FOUND', 'Session not found'));
    }
    next();
  };
  if (auth && content) {
    // An admin stopping a learner's session also ends the sandbox behind it.
    app.on('practice-session-stopped', (sandboxSessionId) => {
      if (!sandboxSessionId || !manager.sessions.has(sandboxSessionId)) return;
      manager.withSession(sandboxSessionId, (session) => manager.remove(session), { allowQuarantined: true }).catch(() => {});
      cleanupStaleSession(sandboxSessionId);
    });
  }
  if (auth) app.use('/api', auth.authenticate);

  app.use(express.json({ limit: '16kb', strict: true }));
  app.get('/api/sessions/active', (req, res) => {
    if (!auth) throw new HttpError(503, 'SANDBOX_DISABLED', 'Authentication required for active session lookup');
    const active = activeSessionOf(req.user.id);
    if (!active) return res.json({ active: false, session: null });
    res.json({
      active: true,
      session: {
        ...manager.describe(active),
        lessonId: sessionLessons.get(active.id) || null,
      },
    });
  });
  // One open/switch at a time per learner: a second request that arrives while the first is
  // still creating or resetting waits for it, and is then answered by the session it made
  // (two near-simultaneous opens happen in dev with React StrictMode, and on a double click).
  const openChains = new Map();
  const serializeOpens = (userId, task) => {
    const run = (openChains.get(userId) || Promise.resolve()).then(task);
    const tail = run.catch(() => {});
    openChains.set(userId, tail);
    tail.then(() => { if (openChains.get(userId) === tail) openChains.delete(userId); });
    return run;
  };
  const openSession = async (req, res) => {
    const lessonId = req.body?.lessonId;
    if (lessonId !== undefined && lessonId !== null && !isUuid(lessonId)) {
      throw new HttpError(400, 'INVALID_INPUT', 'lessonId must be a valid id');
    }

    if (auth) {
      const active = activeSessionOf(req.user.id);
      if (active) {
        const boundLesson = sessionLessons.get(active.id) ?? null;
        const requestedLesson = lessonId ?? null;
        // A caller may omit lessonId for legacy/local usage. It is still the
        // same logical lesson when the existing session is also unbound.
        if (boundLesson === requestedLesson) {
          return res.status(200).json({
            ...manager.describe(active),
            lessonId: boundLesson,
            reused: true,
          });
        }
        // The lease remains the same resource owner. A lesson switch resets
        // the recorded workspace instead of allocating a second workspace.
        await manager.withSession(active.id, async (s) => { await manager.reset(s); await seedLab(s, lessonId); }, { allowQuarantined: true });
        sessionLessons.set(active.id, lessonId);
        return res.status(200).json({
          ...manager.describe(active),
          lessonId: lessonId ?? null,
          reused: true,
        });
      }
    }

    let lease = null;
    if (auth) {
      const result = await leaseStore.claim({ userId: req.user.id, lessonId: lessonId ?? null });
      lease = result.lease;
    }
    let session = null;
    try {
    session = await manager.create(lease ? { id: lease.leaseId, workspaceId: lease.workspaceId } : {});
    metrics.recordSessionCreated();
    if (auth) {
      sessionLeases.set(session.id, req.user.id);
      sessionLessons.set(session.id, lessonId);
      await leaseStore.finishAllocation({ leaseId: lease.leaseId });
    }
    await seedLab(session, lessonId);
    if (auth && content) {
      const recordId = await content.service.openPracticeRecord(req.user.id, lessonId, session.id);
      if (recordId) records.set(session.id, recordId);
    }
    } catch (error) {
      // A failed open must not leave a sandbox (or a lease) behind.
      if (session) await manager.remove(session).catch(() => {});
      if (lease) {
        await leaseStore.beginDeletion({ leaseId: lease.leaseId }).catch(() => {});
        await leaseStore.finishDeletion({ leaseId: lease.leaseId }).catch(() => {});
      }
      throw error;
    }
    res.status(201).json({
      ...manager.describe(session),
      ...(lessonId && { lessonId }),
    });
  };
  app.post('/api/sessions', (req, res) => (auth ? serializeOpens(req.user.id, () => openSession(req, res)) : openSession(req, res)));
  app.get('/api/sessions/:id', ownSession, (req, res) => res.json(manager.describe(manager.get(req.params.id))));
  app.post('/api/sessions/:id/execute', ownSession, async (req, res) => {
    const command = req.body?.command;
    if (typeof command !== 'string' || !command.trim() || command.includes('\0') || Buffer.byteLength(command) > 8192) {
      throw new HttpError(400, 'INVALID_COMMAND', 'command must contain 1–8192 UTF-8 bytes without NUL');
    }
    const result = await manager.withSession(req.params.id, async session => {
      if (auth) await leaseStore.beginCommand({ leaseId: session.id });
      try {
      await manager.checkQuota(session);
      let output;
      try {
        output = await runner.run({ command, cwd: session.cwd,
          workspacePath: session.workspacePath });
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
      } finally {
        if (auth) await leaseStore.finishCommand({ leaseId: session.id });
      }
    });
    const recordId = records.get(req.params.id);
    if (recordId) content.service.touchPracticeRecord(recordId).catch(() => {});
    res.json(result);
  });
  app.post('/api/sessions/:id/check', ownSession, async (req, res) => {
    const sessionLessonId = sessionLessons.get(req.params.id);
    const requestedLessonId = sessionLessonId || req.body?.lessonId;
    const verifierKey = content && requestedLessonId
      ? await content.service.getLessonVerifier(requestedLessonId, Boolean(await auth?.isAdmin?.(req.user.id)))
      : requestedLessonId;
    res.json(await manager.withSession(req.params.id, async session => {
      await manager.checkQuota(session);
      return verifyTask(session, verifierKey);
    }));
  });
  app.post('/api/sessions/:id/reset', ownSession, async (req, res) => {
    res.json(await manager.withSession(req.params.id, async session => {
      await manager.reset(session);
      await seedLab(session, sessionLessons.get(session.id));
      return manager.describe(session);
    }));
  });
  // Admins (Activity page) may stop anyone's session; learners only their own.
  app.delete('/api/sessions/:id', async (req, res) => {
    if (auth && sessionLeases.get(req.params.id) !== req.user.id && !(await auth.isAdmin(req.user.id))) {
      throw new HttpError(404, 'SESSION_NOT_FOUND', 'Session not found');
    }
    await manager.withSession(req.params.id, session => manager.remove(session), { allowQuarantined: true });
    cleanupStaleSession(req.params.id);
    res.sendStatus(204);
  });
  app.use((_req, _res, next) => next(new HttpError(404, 'NOT_FOUND', 'Endpoint not found')));
  app.use((error, _req, res, _next) => {
    const status = error.status || 500;
    if (status >= 500 && error.code !== 'SANDBOX_DISABLED') console.error(error.message);
    res.status(status).json({ error: { code: error.code || (status === 400 ? 'INVALID_JSON' : 'INTERNAL_ERROR'),
      message: status === 500 ? 'Internal server error' : error.message } });
  });
  return app;
}

// Everything that needs Supabase, built once from the environment. The auth
// API (login/register/reset/profile) and the sandbox share one token
// verifier, so a verified token is cached once for both.
function servicesFromEnv() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createSupabaseAdmin();
    const authenticate = requireAuth(admin);
    return {
      content: {
        service: createContentService({ admin, userClient: createSupabaseUserFactory() }),
        dashboard: createDashboardService({ admin, prometheusUrl: process.env.PROMETHEUS_URL || 'http://localhost:9090' }),
        limits: {
          ...(process.env.CONTENT_RATE_LIMIT_IP && { perIp: Number(process.env.CONTENT_RATE_LIMIT_IP) }),
          ...(process.env.CONTENT_RATE_LIMIT_USER && { perUser: Number(process.env.CONTENT_RATE_LIMIT_USER) }),
        },
      },
      auth: {
        authenticate,
        isAdmin: (userId) => isActiveAdmin(admin, userId),
        maxSessionsPerUser: Number(process.env.SANDBOX_MAX_SESSIONS_PER_USER || 3),
      },
      authApi: {
        service: createAuthService({ admin, anon: createSupabaseAnonFactory() }),
        authenticate,
        limits: {
          ...(process.env.AUTH_RATE_LIMIT_GENERAL && { perMinute: Number(process.env.AUTH_RATE_LIMIT_GENERAL) }),
          ...(process.env.AUTH_RATE_LIMIT_SENSITIVE && { sensitivePerMinute: Number(process.env.AUTH_RATE_LIMIT_SENSITIVE) }),
          ...(process.env.AUTH_RATE_LIMIT_LOGIN && { loginPerMinute: Number(process.env.AUTH_RATE_LIMIT_LOGIN) }),
        },
      },
    };
  }
  if (process.env.SANDBOX_REQUIRE_AUTH === 'false') {
    console.warn('WARNING: API running WITHOUT authentication (SANDBOX_REQUIRE_AUTH=false) — /api/auth is disabled.');
    return { auth: false, authApi: null, content: null };
  }
  throw new Error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY (see RUNNING.md), '
    + 'or SANDBOX_REQUIRE_AUTH=false for an unauthenticated benchmark run');
}

export async function startServer() {
  const { auth, authApi, content } = servicesFromEnv();
  const manager = new SessionManager();
  const runner = new SandboxRunner();
  const leaseStore = createMemoryLeaseStore({ maxActiveLeases: Number(process.env.SANDBOX_MAX_ACTIVE_LEASES || 100) });
  // Machines without Docker/Linux (e.g. a Windows dev box) still run the auth
  // API: SANDBOX_ENABLED=false skips the runner probe and reaper.
  const sandbox = process.env.SANDBOX_ENABLED !== 'false';
  let stopReaper = () => {};
  if (sandbox) {
    // Fail startup if the runner or bind-mount mapping is not usable.
    const probe = await manager.create();
    let probeCompleted = false;
    try {
      const result = await runner.run({ command: 'printf ready > .bashlab-probe; cat .bashlab-probe', cwd: probe.cwd,
        workspacePath: probe.workspacePath });
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
    stopReaper = startReaper(manager, { leaseStore });
  } else {
    console.warn('Sandbox disabled (SANDBOX_ENABLED=false): only the auth API is served.');
  }
  // Keep the admin Activity numbers honest: sandbox sessions die with the
  // process, so rows still 'active' at startup are stale; afterwards, rows idle
  // past the sandbox's own 30-minute TTL are expired every few minutes.
  let sweeper = null;
  if (content) {
    content.service.expireStalePracticeSessions({ olderThanMs: 0 })
      .then((n) => { if (n) console.log(`Marked ${n} stale practice session(s) as expired.`); }).catch(() => {});
    sweeper = setInterval(() => content.service.expireStalePracticeSessions().catch(() => {}), 5 * 60 * 1000);
    sweeper.unref();
  }
  const host = process.env.HOST || '0.0.0.0';
  const server = createApp({ manager, runner, leaseStore, auth, authApi, content, sandbox }).listen(Number(process.env.PORT || 3001), host, () => {
    console.log(`BashLab API listening on http://${host}:${server.address().port}`);
  });
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
    stopReaper();
    if (sweeper) clearInterval(sweeper);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 15000).unref();
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().catch(error => { console.error('Startup failed:', error.message); process.exitCode = 1; });
}
