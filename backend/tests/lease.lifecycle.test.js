import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/server.js';
import { SessionManager } from '../src/services/sessionManager.js';
import { SandboxRunner } from '../src/services/sandboxRunner.js';
import { createMemoryLeaseStore } from '../src/services/sandboxLeaseStore.js';

// A real API (fake auth, fake runner transport) so the lease lifecycle can be
// exercised without Docker or Supabase.
async function boot(t, { maxActiveLeases = 100 } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bashlab-lease-'));
  const manager = new SessionManager({ root });
  const runner = new SandboxRunner({ transport: async ({ cwd }) => ({ stdout: '', stderr: '', exitCode: 0, cwd, cwdUpdated: false, outputTruncated: false, termination: 'completed' }) });
  const auth = {
    authenticate: (req, _res, next) => { req.user = { id: `00000000-0000-4000-8000-${String(req.headers['x-user'] || 1).padStart(12, '0')}` }; next(); },
    isAdmin: async () => false,
  };
  const leaseStore = createMemoryLeaseStore({ maxActiveLeases });
  const server = createApp({ manager, runner, sandbox: true, auth, leaseStore }).listen(0);
  t.after(async () => { server.close(); await fs.rm(root, { recursive: true, force: true }); });
  const call = (method, url, user = 1) => fetch(`http://127.0.0.1:${server.address().port}${url}`, {
    method, headers: { 'Content-Type': 'application/json', 'x-user': String(user) }, body: method === 'POST' ? '{}' : undefined,
  }).then(async (response) => ({ status: response.status, body: response.status === 204 ? null : await response.json().catch(() => null) }));
  t.server = { port: server.address().port };
  return { call, leaseStore, manager };
}

test('closing a lab gives its lease back, so the pool is not exhausted by learners who already left', async (t) => {
  const { call, leaseStore } = await boot(t, { maxActiveLeases: 2 });
  for (let user = 1; user <= 5; user++) {
    const opened = await call('POST', '/api/sessions', user);
    assert.equal(opened.status, 201, `learner ${user} should still get a sandbox`);
    assert.equal((await call('DELETE', `/api/sessions/${opened.body.sessionId}`, user)).status, 204);
  }
  assert.equal((await leaseStore.all()).filter((lease) => lease.state !== 'REMOVED').length, 0);
});

test('two parallel opens by one learner end up on the same single session', async (t) => {
  const { call, manager } = await boot(t);
  const [first, second] = await Promise.all([call('POST', '/api/sessions'), call('POST', '/api/sessions')]);
  assert.equal(first.body.sessionId, second.body.sessionId);
  assert.equal(manager.sessions.size, 1);
});

test('a learner at capacity is refused with LEASE_CAPACITY, not a server error', async (t) => {
  const { call } = await boot(t, { maxActiveLeases: 1 });
  assert.equal((await call('POST', '/api/sessions', 1)).status, 201);
  const refused = await call('POST', '/api/sessions', 2);
  assert.equal(refused.status, 503);
});

test('two parallel opens that switch the learner to another lab do not fail with SESSION_BUSY', async (t) => {
  const { call, manager } = await boot(t);
  const labA = '11111111-1111-4111-8111-111111111111';
  const labB = '22222222-2222-4222-8222-222222222222';
  const first = await (async () => {
    const response = await fetch(`http://127.0.0.1:${t.server.port}/api/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user': '1' }, body: JSON.stringify({ lessonId: labA }) });
    return response.json();
  })();
  const open = (lessonId) => fetch(`http://127.0.0.1:${t.server.port}/api/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user': '1' }, body: JSON.stringify({ lessonId }) })
    .then(async (response) => ({ status: response.status, body: await response.json() }));
  const [one, two] = await Promise.all([open(labB), open(labB)]);
  assert.deepEqual([one.status, two.status], [200, 200]);
  assert.equal(one.body.sessionId, first.sessionId);
  assert.equal(two.body.sessionId, first.sessionId);
  assert.equal(manager.sessions.size, 1);
});
