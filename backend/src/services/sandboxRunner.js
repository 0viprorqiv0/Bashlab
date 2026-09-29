import { spawn } from 'node:child_process';
import pLimit from 'p-limit';
import { performance } from 'node:perf_hooks';
import { HttpError } from '../errors.js';

export function sanitizeOutput(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\/run\/command\.sh:\s*line\s*\d+:\s*/g, 'bash: ')
    .replace(/\/run\/command\.sh:\s*/g, 'bash: ')
    .replace(/\/run\/wrap\.sh:\s*line\s*\d+:\s*/g, 'bash: ')
    .replace(/\/run\/wrap\.sh:\s*/g, 'bash: ')
    .replace(/\/var\/tmp\/bashlab\/workspaces\/[0-9a-f-]+\/home/g, '/home/student')
    .replace(/\/var\/tmp\/bashlab\/workspaces\/[0-9a-f-]+\/tmp/g, '/tmp')
    .replace(/\/var\/tmp\/bashlab\/workspaces\/[0-9a-f-]+/g, '/home/student');
}

export function dockerTransport(payload, { container = process.env.RUNNER_CONTAINER || 'bashlab-box' } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['exec', '-i', container, '/opt/bashlab/run-job'], { stdio: ['pipe', 'pipe', 'pipe'] });
    const stdout = [];
    let size = 0;
    let stderr = '';
    let failed = false;
    const fail = message => {
      failed = true;
      reject(new HttpError(503, 'RUNNER_UNCERTAIN', message));
      child.kill('SIGKILL'); // This only closes transport; quarantine the session.
    };
    const timer = setTimeout(() => fail('Runner transport deadline exceeded'), 10000);
    child.stdout.on('data', chunk => {
      size += chunk.length;
      if (size > 512 * 1024) fail('Invalid runner response size');
      else stdout.push(chunk);
    });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(0, 4096); });
    child.stdin.on('error', () => {});
    child.on('error', () => { clearTimeout(timer); fail('Cannot start Docker client'); });
    child.on('close', code => {
      clearTimeout(timer);
      if (failed) return;
      if (code !== 0) return fail(`Runner transport failed: ${stderr || code}`);
      try {
        const result = JSON.parse(Buffer.concat(stdout).toString('utf8'));
        if (typeof result.stdout !== 'string' || typeof result.stderr !== 'string' || !Number.isInteger(result.exitCode)
          || typeof result.cwd !== 'string' || typeof result.cwdUpdated !== 'boolean' || typeof result.outputTruncated !== 'boolean'
          || !['completed', 'timeout', 'output_limit', 'runner_error'].includes(result.termination)) throw new Error('Invalid schema');
        if (result.termination === 'runner_error') return fail('Runner could not confirm sandbox execution and cleanup');
        result.stdout = sanitizeOutput(result.stdout);
        result.stderr = sanitizeOutput(result.stderr);
        resolve(result);
      } catch { fail('Malformed runner JSON'); }
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

export class SandboxRunner {
  constructor({ concurrency = 4, maxPending = 32, queueTimeoutMs = 5000, transport = dockerTransport } = {}) {
    this.limit = pLimit(concurrency);
    this.capacity = concurrency + maxPending;
    this.admitted = 0;
    this.queueTimeoutMs = queueTimeoutMs;
    this.transport = transport;
  }

  run(payload) {
    if (this.admitted >= this.capacity) return Promise.reject(new HttpError(429, 'QUEUE_FULL', 'Runner queue is full'));
    this.admitted++;
    const enqueued = performance.now();
    return new Promise((resolve, reject) => {
      let expired = false;
      const timer = setTimeout(() => {
        expired = true;
        // Keep admission reserved until this tombstone leaves p-limit's queue.
        reject(new HttpError(503, 'QUEUE_TIMEOUT', 'Queue wait exceeded 5 seconds'));
      }, this.queueTimeoutMs);
      this.limit(async () => {
        clearTimeout(timer);
        if (expired) return;
        const started = performance.now();
        if (started - enqueued >= this.queueTimeoutMs) {
          reject(new HttpError(503, 'QUEUE_TIMEOUT', 'Queue wait exceeded its deadline'));
          return;
        }
        try {
          const result = await this.transport(payload);
          resolve({ ...result, queueWaitMs: started - enqueued, executionMs: performance.now() - started });
        } catch (error) { reject(error); }
      }).catch(reject).finally(() => { clearTimeout(timer); this.admitted--; });
    });
  }
}
