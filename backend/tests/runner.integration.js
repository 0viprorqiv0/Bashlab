import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { SessionManager } from '../src/services/sessionManager.js';
import { dockerTransport } from '../src/services/sandboxRunner.js';

const manager = new SessionManager();
async function fixture(t) {
  const session = await manager.create();
  t.after(() => manager.remove(session));
  const run = (command, cwd = '/home/student') => dockerTransport({ command, cwd,
    workspacePath: `/var/tmp/bashlab/workspaces/${session.id}` });
  return { session, run };
}

test('real runner preserves cwd and exit status, isolates stdin and system mounts', async t => {
  const { run } = await fixture(t);
  let result = await run('mkdir demo; cd demo; printf hello; printf warning >&2; exit 7');
  assert.equal(result.stdout, 'hello');
  assert.equal(result.stderr, 'warning');
  assert.equal(result.exitCode, 7);
  assert.equal(result.cwd, '/home/student/demo');
  assert.equal(result.cwdUpdated, true);
  result = await run('pwd; read -r value; printf "read=%s" "$?"', result.cwd);
  assert.equal(result.stdout, '/home/student/demo\nread=1');
  result = await run('test ! -e /var/tmp/bashlab/workspaces; test ! -w /usr; test ! -w /; test ! -w /dev/shm');
  assert.equal(result.exitCode, 0);
});
test('real runner enforces the deadline and reaps a background child', async t => {
  const { run, session } = await fixture(t);
  const started = performance.now();
  const result = await run('sleep 20 & wait');
  assert.equal(result.termination, 'timeout');
  assert.equal(result.exitCode, 124);
  assert.ok(performance.now() - started < 6000);
  const background = await run('(sleep 1; printf late > late.txt) & printf done');
  assert.equal(background.stdout, 'done');
  await new Promise(resolve => setTimeout(resolve, 1200));
  await assert.rejects(fs.stat(`${session.workspacePath}/home/late.txt`), { code: 'ENOENT' });
});
test('real runner caps combined stdout/stderr and completes cleanup', async t => {
  const { run } = await fixture(t);
  const result = await run("python3 -c 'import sys; sys.stdout.write(\"x\" * 100000)' ");
  assert.equal(Buffer.byteLength(result.stdout) + Buffer.byteLength(result.stderr), 65536);
  assert.equal(result.outputTruncated, true);
  assert.equal(result.termination, 'output_limit');
});
test('real runner recovers a deleted cwd and keeps persistent tmp data', async t => {
  const { run } = await fixture(t);
  await run('printf saved > /tmp/data');
  const result = await run('cat /tmp/data; pwd', '/home/student/missing');
  assert.equal(result.stdout, 'saved/home/student\n');
  assert.equal(result.cwd, '/home/student');
});
test('student stderr cannot be mistaken for trusted runner diagnostics', async t => {
  const { run } = await fixture(t);
  const result = await run("printf 'bwrap: this is exercise output\\n' >&2; exit 1");
  assert.equal(result.exitCode, 1);
  assert.equal(result.termination, 'completed');
});
test('invalid UTF-8 output still respects the JSON text output budget', async t => {
  const { run } = await fixture(t);
  const result = await run("python3 -c 'import os; os.write(1, bytes([255]) * 70000)' ");
  assert.ok(Buffer.byteLength(result.stdout) + Buffer.byteLength(result.stderr) <= 65536);
  assert.equal(result.outputTruncated, true);
});
test('exec without an EXIT trap preserves the previous cwd', async t => {
  const { run } = await fixture(t);
  const result = await run('exec true');
  assert.equal(result.termination, 'completed');
  assert.equal(result.cwdUpdated, false);
  assert.equal(result.cwd, '/home/student');
});
test('runner has only loopback and enforces a 10 MiB file size limit', async t => {
  const { run, session } = await fixture(t);
  const network = await run("python3 -c 'import socket; print([name for _, name in socket.if_nameindex()])'");
  assert.equal(network.stdout.trim(), "['lo']");
  const result = await run("python3 -c 'with open(\"large.bin\", \"wb\") as f: f.write(bytes(10 * 1024 * 1024 + 1))'");
  assert.notEqual(result.exitCode, 0);
  assert.equal((await fs.stat(`${session.workspacePath}/home/large.bin`)).size, 10 * 1024 * 1024);
});
