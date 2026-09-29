import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/server.js';
import { SessionManager } from '../src/services/sessionManager.js';
import { SandboxRunner } from '../src/services/sandboxRunner.js';

test('API validates requests, stores cwd, grades and resets sessions', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bashlab-api-'));
  const manager = new SessionManager({ root });
  const runner = new SandboxRunner({ transport: async () => ({ stdout: '', stderr: '', exitCode: 0,
    cwd: '/home/student/demo', cwdUpdated: true, outputTruncated: false, termination: 'completed' }) });
  const server = createApp({ manager, runner, rateMax: 100 }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await fs.rm(root, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (url, body) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  let response = await post('/api/sessions', {});
  assert.equal(response.status, 201);
  const { sessionId } = await response.json();
  const endpoint = `/api/sessions/${sessionId}`;
  response = await post(endpoint + '/execute', { command: '' });
  assert.equal(response.status, 400);
  response = await post(endpoint + '/execute', { command: 'pwd' });
  assert.equal((await response.json()).cwd, '/home/student/demo');
  assert.equal(manager.get(sessionId).commandCount, 1);
  response = await post(endpoint + '/check', { lessonId: 'unknown' });
  assert.equal(response.status, 400);
  response = await post(endpoint + '/reset', {});
  assert.equal((await response.json()).cwd, '/home/student');
});
test('IP rate limiter returns 429 with Retry-After', async t => {
  const server = createApp({ rateMax: 1 }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/sessions/missing`;
  assert.equal((await fetch(url)).status, 404);
  const response = await fetch(url);
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get('retry-after')) > 0);
});
