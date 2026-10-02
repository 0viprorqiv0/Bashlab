import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/server.js';
import { SessionManager } from '../src/services/sessionManager.js';
import { SandboxRunner } from '../src/services/sandboxRunner.js';
import { HttpError } from '../src/errors.js';

// Stand-in for requireAuth: "Bearer <userId>" authenticates as that user.
const fakeAuth = (overrides = {}) => ({
  authenticate: (req, _res, next) => {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) return next(new HttpError(401, 'UNAUTHENTICATED', 'Missing bearer token'));
    req.user = { id: token };
    next();
  },
  isAdmin: async (userId) => userId === 'admin',
  maxSessionsPerUser: 2,
  ...overrides,
});

async function startApp(t, auth) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bashlab-auth-'));
  const manager = new SessionManager({ root });
  const runner = new SandboxRunner({ transport: async () => ({ stdout: 'ok', stderr: '', exitCode: 0,
    cwd: '/home/student', cwdUpdated: false, outputTruncated: false, termination: 'completed' }) });
  const server = createApp({ manager, runner, rateMax: 1000, auth }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); await fs.rm(root, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (user, method, url, body) => fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${user}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { call, manager };
}

test('createApp refuses to start without an explicit auth decision', () => {
  assert.throws(() => createApp({}), /explicit auth option/);
});

test('every sandbox endpoint requires a token', async (t) => {
  const { call } = await startApp(t, fakeAuth());
  assert.equal((await call(null, 'POST', '/api/sessions', {})).status, 401);
  assert.equal((await call(null, 'GET', '/api/sessions/anything')).status, 401);
  assert.equal((await call(null, 'POST', '/api/sessions/anything/execute', { command: 'pwd' })).status, 401);
  assert.equal((await call(null, 'DELETE', '/api/sessions/anything')).status, 401);
});

test("a session is private to its owner: another learner gets 404 on every route", async (t) => {
  const { call } = await startApp(t, fakeAuth());
  const created = await call('alice', 'POST', '/api/sessions', {});
  assert.equal(created.status, 201);
  const { sessionId } = await created.json();
  const url = `/api/sessions/${sessionId}`;

  for (const [method, suffix, body] of [
    ['GET', '', undefined],
    ['POST', '/execute', { command: 'cat secret' }],
    ['POST', '/check', { lessonId: 'files-03' }],
    ['POST', '/reset', {}],
    ['DELETE', '', undefined],
  ]) {
    const response = await call('bob', method, url + suffix, body);
    assert.equal(response.status, 404, `${method} ${suffix || '/'} as another user`);
    assert.equal((await response.json()).error.code, 'SESSION_NOT_FOUND');
  }

  assert.equal((await call('alice', 'GET', url)).status, 200);
  assert.equal((await call('alice', 'POST', url + '/execute', { command: 'pwd' })).status, 200);
});

test('an admin can end any session (Activity page); the owner then sees it gone', async (t) => {
  const { call } = await startApp(t, fakeAuth());
  const { sessionId } = await (await call('alice', 'POST', '/api/sessions', {})).json();
  assert.equal((await call('admin', 'DELETE', `/api/sessions/${sessionId}`)).status, 204);
  assert.equal((await call('alice', 'GET', `/api/sessions/${sessionId}`)).status, 404);
});

test('one learner always has one session, including legacy starts without a lesson', async (t) => {
  const { call } = await startApp(t, fakeAuth({ maxSessionsPerUser: 2 }));
  const first = await (await call('alice', 'POST', '/api/sessions', {})).json();
  const repeated = await call('alice', 'POST', '/api/sessions', {});
  assert.equal(repeated.status, 200);
  assert.equal((await repeated.json()).sessionId, first.sessionId);

  const lessonId = '11111111-1111-4111-8111-111111111111';
  const switched = await (await call('alice', 'POST', '/api/sessions', { lessonId })).json();
  assert.equal(switched.sessionId, first.sessionId);
  assert.equal(switched.lessonId, lessonId);
  assert.equal((await call('alice', 'GET', `/api/sessions/${first.sessionId}`)).status, 200);
});

test('session lifecycle: same-lab start is idempotent, active session lookup works, switching labs replaces old session', async (t) => {
  const { call } = await startApp(t, fakeAuth());
  const lab1 = '11111111-1111-4111-8111-111111111111';
  const lab2 = '22222222-2222-4222-8222-222222222222';

  // Initially no active session
  const initialActive = await (await call('alice', 'GET', '/api/sessions/active')).json();
  assert.equal(initialActive.active, false);

  // Start Lab 1
  const start1 = await call('alice', 'POST', '/api/sessions', { lessonId: lab1 });
  assert.equal(start1.status, 201);
  const data1 = await start1.json();
  assert.ok(data1.sessionId);

  // Active session returns Lab 1 session
  const activeRes = await (await call('alice', 'GET', '/api/sessions/active')).json();
  assert.equal(activeRes.active, true);
  assert.equal(activeRes.session.sessionId, data1.sessionId);
  assert.equal(activeRes.session.lessonId, lab1);

  // Re-starting Lab 1 returns existing session (status 200, reused: true)
  const restart1 = await call('alice', 'POST', '/api/sessions', { lessonId: lab1 });
  assert.equal(restart1.status, 200);
  const restartData = await restart1.json();
  assert.equal(restartData.sessionId, data1.sessionId);
  assert.equal(restartData.reused, true);

  // Starting Lab 2 keeps the durable lease/session and rebinds the workspace
  const start2 = await call('alice', 'POST', '/api/sessions', { lessonId: lab2 });
  assert.equal(start2.status, 200);
  const data2 = await start2.json();
  assert.equal(data2.sessionId, data1.sessionId);
  assert.equal(data2.lessonId, lab2);

  // The durable session remains available after lesson replacement
  assert.equal((await call('alice', 'GET', `/api/sessions/${data1.sessionId}`)).status, 200);

  // Active session is now Lab 2
  const active2 = await (await call('alice', 'GET', '/api/sessions/active')).json();
  assert.equal(active2.active, true);
  assert.equal(active2.session.sessionId, data2.sessionId);
  assert.equal(active2.session.lessonId, lab2);
});
