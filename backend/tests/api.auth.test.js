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

test('one learner cannot exhaust the sandbox: open sessions are capped per user', async (t) => {
  const { call } = await startApp(t, fakeAuth({ maxSessionsPerUser: 2 }));
  const first = await (await call('alice', 'POST', '/api/sessions', {})).json();
  assert.equal((await call('alice', 'POST', '/api/sessions', {})).status, 201);
  const blocked = await call('alice', 'POST', '/api/sessions', {});
  assert.equal(blocked.status, 429);
  assert.equal((await blocked.json()).error.code, 'SESSION_LIMIT');
  // Another user is unaffected, and closing one frees a slot.
  assert.equal((await call('bob', 'POST', '/api/sessions', {})).status, 201);
  assert.equal((await call('alice', 'DELETE', `/api/sessions/${first.sessionId}`)).status, 204);
  assert.equal((await call('alice', 'POST', '/api/sessions', {})).status, 201);
});
