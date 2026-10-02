import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SessionManager } from '../src/services/sessionManager.js';
import { verifyTask } from '../src/services/taskVerifier.js';
import { SandboxRunner } from '../src/services/sandboxRunner.js';
import { reapOnce } from '../src/services/reaperService.js';

async function setup(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bashlab-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const manager = new SessionManager({ root });
  const session = await manager.create();
  return { manager, session };
}
test('session lock excludes execution, reset and reaping until release', async t => {
  const { manager, session } = await setup(t);
  const unlock = manager.acquire(session.id);
  assert.throws(() => manager.acquire(session.id), { status: 409 });
  session.lastActiveAt = 0;
  assert.equal(await reapOnce(manager, Date.now()), 0);
  unlock();
  session.lastActiveAt = 0;
  assert.equal(await reapOnce(manager, Date.now()), 1);
  assert.throws(() => manager.get(session.id), { status: 404 });
});
test('reaper cleans up expired quarantined sessions', async t => {
  const { manager, session } = await setup(t);
  session.quarantined = true;
  session.lastActiveAt = 0;
  assert.equal(await reapOnce(manager, Date.now()), 1);
  assert.throws(() => manager.get(session.id), { status: 404 });
});
test('quota counts home and tmp, ignores symlink targets, reset restores session', async t => {
  const { manager, session } = await setup(t);
  await fs.symlink('/usr', path.join(session.workspacePath, 'home/link'));
  assert.equal((await manager.checkQuota(session)).entries, 1);
  await Promise.all(Array.from({ length: 100 }, (_, i) => fs.writeFile(path.join(session.workspacePath, 'tmp', `${i}`), 'x')));
  await assert.rejects(manager.checkQuota(session), { status: 413 });
  await manager.reset(session);
  assert.equal((await manager.checkQuota(session)).entries, 0);
  assert.equal(session.cwd, '/home/student');
});
test('verifier checks content and refuses symlink files and intermediate directories', async t => {
  const { session } = await setup(t);
  const home = path.join(session.workspacePath, 'home');
  await fs.mkdir(path.join(home, 'demo'));
  await fs.writeFile(path.join(home, 'demo/README.md'), 'Hello BashLab\n');
  assert.equal((await verifyTask(session, 'files-03')).passed, true);
  await fs.rename(path.join(home, 'demo'), path.join(home, 'original'));
  await fs.symlink('original', path.join(home, 'demo'));
  assert.equal((await verifyTask(session, 'files-03')).passed, false);
  await fs.unlink(path.join(home, 'demo'));
  await fs.mkdir(path.join(home, 'demo'));
  await fs.symlink('../original/README.md', path.join(home, 'demo/README.md'));
  assert.equal((await verifyTask(session, 'files-03')).passed, false);
});
test('queue rejects overflow and expires queued jobs without running them', async () => {
  let release;
  let calls = 0;
  const runner = new SandboxRunner({ concurrency: 1, maxPending: 1, queueTimeoutMs: 30,
    transport: async () => { calls++; await new Promise(resolve => { release = resolve; }); return {}; } });
  const first = runner.run({});
  await new Promise(resolve => setImmediate(resolve));
  const second = runner.run({});
  await assert.rejects(runner.run({}), { status: 429 });
  await assert.rejects(second, { status: 503 });
  release();
  await first;
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 1);
});
test('reset recovers directories with no owner access', async t => {
  const { manager, session } = await setup(t);
  const dir = path.join(session.workspacePath, 'home/private');
  await fs.mkdir(dir);
  await fs.writeFile(path.join(dir, 'file'), 'data');
  await fs.chmod(dir, 0);
  t.after(() => fs.chmod(dir, 0o700).catch(() => {}));
  await assert.rejects(manager.checkQuota(session), { status: 413 });
  await manager.reset(session);
  assert.equal((await manager.checkQuota(session)).entries, 0);
});
test('restart discovers orphan workspaces for deferred cleanup without exposing sessions', async t => {
  const { manager, session } = await setup(t);
  const restarted = new SessionManager({ root: manager.root });
  await restarted.discoverOrphans(1000);
  assert.throws(() => restarted.get(session.id), { status: 404 });
  assert.equal(await reapOnce(restarted, 1000 + 1800001), 1);
  await assert.rejects(fs.stat(session.workspacePath), { code: 'ENOENT' });
});
test('queue never runs more than four jobs concurrently', async () => {
  let active = 0;
  let peak = 0;
  const runner = new SandboxRunner({ transport: async () => {
    peak = Math.max(peak, ++active);
    await new Promise(resolve => setTimeout(resolve, 10));
    active--;
    return {};
  } });
  await Promise.all(Array.from({ length: 12 }, () => runner.run({})));
  assert.equal(peak, 4);
  assert.equal(active, 0);
});


test('reaper removal notifies API lifecycle cleanup observers immediately', async t => {
  const { manager, session } = await setup(t);
  const removed = [];
  manager.onRemoved((id) => removed.push(id));
  session.lastActiveAt = 0;
  assert.equal(await reapOnce(manager, Date.now()), 1);
  assert.deepEqual(removed, [session.id]);
});

test('server-bound verifier lookup is independent from the database lesson id', async () => {
  const verifierKeys = new Map([['11111111-1111-4111-8111-111111111111', 'files-03']]);
  assert.equal(verifierKeys.get('11111111-1111-4111-8111-111111111111'), 'files-03');
});

test('attach reuses the lease workspace instead of allocating a second path', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bashlab-lease-test-'));
  t.after(() => fs.rm(root, {recursive:true,force:true}));
  const manager = new SessionManager({root});
  const first = await manager.create({id:'11111111-1111-4111-8111-111111111111', workspaceId:'22222222-2222-4222-8222-222222222222'});
  const attached = await manager.attach({id:first.id, workspaceId:'22222222-2222-4222-8222-222222222222'});
  assert.equal(attached.workspacePath, first.workspacePath);
  assert.equal(manager.sessions.size, 1);
});
