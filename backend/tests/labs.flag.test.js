import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { LABS, checkFlag, hasFlag, seedFilesFor } from '../src/labs/catalog.js';
import { seedLabWorkspace } from '../src/labs/seed.js';
import { createContentRouter } from '../src/routes/content.js';
import { HttpError } from '../src/errors.js';

const hasBash = spawnSync('bash', ['-c', 'echo ok']).stdout?.toString().trim() === 'ok';
// Symlinks and Unix permission bits need a real POSIX filesystem (Linux/WSL), not NTFS.
const posixOnly = new Set(['safe-file-deletion-symbolic-links', 'posix-permissions-octal-chmod']);
const skipReason = (slug) => (!hasBash ? 'bash is not available' : posixOnly.has(slug) && process.platform === 'win32' ? 'needs a POSIX filesystem (run on Linux/WSL)' : false);

test('every lab has its own well-formed flag, and only that exact flag is accepted', () => {
  const flags = Object.values(LABS).map((lab) => lab.flag);
  for (const flag of flags) assert.match(flag, /^BASHLAB\{[a-z0-9_]+\}$/);
  assert.equal(new Set(flags).size, flags.length, 'flags must be unique per lab');
  for (const [slug, lab] of Object.entries(LABS)) {
    assert.equal(checkFlag(slug, lab.flag), true);
    assert.equal(checkFlag(slug, `  ${lab.flag}\n`), true, 'surrounding whitespace from a paste is ignored');
    assert.equal(checkFlag(slug, lab.flag.toLowerCase()), false);
    assert.equal(checkFlag(slug, 'BASHLAB{nope}'), false);
    assert.equal(checkFlag(slug, null), false);
    assert.equal(checkFlag(slug, 'x'.repeat(5000)), false);
  }
  const [first, second] = Object.keys(LABS);
  assert.equal(checkFlag(first, LABS[second].flag), false, 'a flag from another lab is wrong');
  assert.equal(checkFlag('not-a-lab', 'BASHLAB{x}'), false);
  assert.equal(hasFlag('not-a-lab'), false);
});

test('a lab with a flag also tells the learner where to submit it', () => {
  for (const slug of Object.keys(LABS)) {
    const mission = seedFilesFor(slug).find((file) => file.path === 'MISSION.txt');
    assert.ok(mission && /Submit flag/.test(mission.content), slug);
  }
});

async function seeded(slug) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bashlab-labs-'));
  await fs.mkdir(path.join(root, 'home'), { recursive: true });
  await seedLabWorkspace({ workspacePath: root }, slug);
  return { home: path.join(root, 'home'), done: () => fs.rm(root, { recursive: true, force: true }) };
}
const sh = (home, command) => spawnSync('bash', ['-c', command], { cwd: home, encoding: 'utf8' }).stdout;

test('seeding writes the lab files into home', async () => {
  const { home, done } = await seeded('pattern-matching-with-grep');
  try {
    assert.match(await fs.readFile(path.join(home, 'src/lib/settings.py'), 'utf8'), /config_flag/);
    assert.ok((await fs.readFile(path.join(home, 'MISSION.txt'), 'utf8')).length > 0);
  } finally { await done(); }
});

// Each lab, solved the way its steps teach, must reveal exactly its flag. These run real bash.
const SOLVED = {
  'where-am-i': 'ls -a >/dev/null; cat .where_am_i',
  'terminal-fundamentals-navigation': 'ls -la >/dev/null; cat .secret_flag',
  'inspecting-files-output-pagers': 'cat app.env >/dev/null; head -n 5 audit.log >/dev/null; tail -n 10 audit.log',
  'directory-creation-file-manipulation': 'mkdir -p project/src project/config && touch project/config/app.json && cp project/config/app.json project/config/app.json.bak && ./check.sh',
  'safe-file-deletion-symbolic-links': 'ln -s /etc/bashlab/config.json app-config && rm -f temp.cache && ./check.sh',
  'active-process-inspection-ps-aux': 'grep node ps_snapshot.txt',
  'standard-output-append-redirection': 'echo "BUILD_VERSION=2.4.0" > build.env && echo "DEPLOY_TIME=$(date)" >> build.env && ./check.sh',
  'standard-input-error-descriptors': 'find / -name "*.conf" > output.log 2>&1; ./check.sh',
  'the-power-of-pipes-combining-tools': 'sort audit.log | uniq -c | sort -nr | head -1',
  'pattern-matching-with-grep': 'grep -rn "config" ./src',
  'stream-editing-with-sed': 'sed -i "s/db-local/postgres.internal/g" app.env && ./check.sh',
  'columnar-data-extraction-with-awk': "awk '$3 > 5.0 {print $11}' ps_output.txt",
  'posix-permissions-octal-chmod': 'chmod 600 id_rsa && chmod 755 deploy.sh && ./deploy.sh',
};
// "do it" labs: the same script must NOT reveal the flag before the work is done.
const UNSOLVED = {
  'directory-creation-file-manipulation': './check.sh',
  'safe-file-deletion-symbolic-links': './check.sh',
  'standard-output-append-redirection': './check.sh',
  'standard-input-error-descriptors': './check.sh',
  'stream-editing-with-sed': './check.sh',
  'posix-permissions-octal-chmod': 'chmod 755 deploy.sh && ./deploy.sh',
};

for (const slug of Object.keys(LABS)) {
  test(`lab ${slug}: doing the lab reveals its flag`, { skip: skipReason(slug) }, async () => {
    assert.ok(SOLVED[slug], 'every lab needs a solved scenario in this test');
    const { home, done } = await seeded(slug);
    try {
      await fs.chmod(path.join(home, 'check.sh'), 0o750).catch(() => {});
      assert.ok(sh(home, SOLVED[slug]).includes(LABS[slug].flag), `${slug} should print ${LABS[slug].flag}`);
    } finally { await done(); }
  });
}

for (const slug of Object.keys(UNSOLVED)) {
  test(`lab ${slug}: the flag stays hidden until the work is done`, { skip: skipReason(slug) }, async () => {
    const { home, done } = await seeded(slug);
    try {
      await fs.chmod(path.join(home, 'check.sh'), 0o750).catch(() => {});
      assert.ok(!sh(home, UNSOLVED[slug]).includes(LABS[slug].flag));
    } finally { await done(); }
  });
}

// ---- the API ---------------------------------------------------------------
function api({ slugs = { 'lesson-1': 'directory-creation-file-manipulation', 'lesson-2': 'not-a-flag-lab' } } = {}) {
  const progress = [];
  const service = {
    async getLessonSlug(lessonId) {
      if (!slugs[lessonId]) throw new HttpError(404, 'LESSON_NOT_FOUND', 'Lesson not found');
      return slugs[lessonId];
    },
    async markProgress(user, lessonId, status) { progress.push({ user: user.id, lessonId, status }); },
    async clearProgress() {},
  };
  const app = express();
  app.use('/api', createContentRouter({
    service, authenticate: (req, _res, next) => { req.user = { id: String(req.headers['x-user'] || 'u1') }; next(); }, isAdmin: async () => false,
  }));
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: { code: error.code } }));
  const server = app.listen(0);
  const call = (method, url, body, user = 'u1') => fetch(`http://127.0.0.1:${server.address().port}/api${url}`, {
    method, headers: { 'Content-Type': 'application/json', 'x-user': user }, body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, body: r.status === 204 ? null : await r.json().catch(() => null) }));
  return { call, progress, close: () => server.close() };
}

test('POST /labs/:id/flag: the right flag completes the lab on the server, a wrong one does not', async (t) => {
  const { call, progress, close } = api(); t.after(close);
  const wrong = await call('POST', '/labs/lesson-1/flag', { flag: 'BASHLAB{nope}' });
  assert.deepEqual([wrong.status, wrong.body], [200, { correct: false }]);
  assert.equal(progress.length, 0);
  const right = await call('POST', '/labs/lesson-1/flag', { flag: LABS['directory-creation-file-manipulation'].flag });
  assert.deepEqual([right.status, right.body], [200, { correct: true }]);
  assert.deepEqual(progress, [{ user: 'u1', lessonId: 'lesson-1', status: 'done' }]);
});

test('a lab without a flag answers 404, and an unknown lesson answers 404', async (t) => {
  const { call, close } = api(); t.after(close);
  assert.equal((await call('POST', '/labs/lesson-2/flag', { flag: 'x' })).body.error.code, 'NO_FLAG');
  assert.equal((await call('POST', '/labs/missing/flag', { flag: 'x' })).status, 404);
});

test('"done" cannot be requested directly for a lab that has a flag, but other labs still can', async (t) => {
  const { call, progress, close } = api(); t.after(close);
  const blocked = await call('PUT', '/progress/lesson-1', { status: 'done' });
  assert.deepEqual([blocked.status, blocked.body.error.code], [403, 'FLAG_REQUIRED']);
  assert.equal(progress.length, 0);
  assert.equal((await call('PUT', '/progress/lesson-1', { status: 'in_progress' })).status, 204, 'starting a flag lab is fine');
  assert.equal((await call('PUT', '/progress/lesson-2', { status: 'done' })).status, 204);
});

test('flag guesses are rate limited per learner', async (t) => {
  const { call, close } = api(); t.after(close);
  let last;
  for (let i = 0; i < 11; i++) last = await call('POST', '/labs/lesson-1/flag', { flag: `BASHLAB{guess_${i}}` });
  assert.equal(last.status, 429);
  assert.equal((await call('POST', '/labs/lesson-1/flag', { flag: 'x' }, 'someone-else')).status, 200, 'another learner is not affected');
});

test('only WRONG flags count towards the limit: solving many labs in a row is never throttled', async (t) => {
  const { call, close } = api(); t.after(close);
  const flag = LABS['directory-creation-file-manipulation'].flag;
  for (let i = 0; i < 15; i++) {
    const right = await call('POST', '/labs/lesson-1/flag', { flag });
    assert.deepEqual([right.status, right.body], [200, { correct: true }], `correct submission ${i + 1}`);
  }
});
