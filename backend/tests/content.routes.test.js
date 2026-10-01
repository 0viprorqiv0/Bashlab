import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/server.js';
import { SessionManager } from '../src/services/sessionManager.js';
import { HttpError } from '../src/errors.js';
import { createContentService } from '../src/services/contentService.js';

const ID = '11111111-1111-4111-8111-111111111111';
const ID2 = '22222222-2222-4222-8222-222222222222';

const fakeAuth = {
  authenticate: (req, _res, next) => {
    const [, token] = (req.headers.authorization || '').split(' ');
    if (!token) return next(new HttpError(401, 'UNAUTHENTICATED', 'Missing bearer token'));
    req.user = { id: token };
    req.accessToken = `jwt-${token}`;
    next();
  },
  isAdmin: async (userId) => userId === 'admin',
  maxSessionsPerUser: 3,
};

// Minimal chainable stand-in for the service-role Supabase client: records
// every write and answers reads from `tables`.
function fakeAdmin(tables = {}) {
  const writes = [];
  const from = (table) => {
    const state = {};
    const builder = {
      select: () => builder,
      insert: (values) => { writes.push({ table, op: 'insert', values }); state.values = values; return builder; },
      update: (values) => { writes.push({ table, op: 'update', values }); return builder; },
      upsert: (values, options) => { writes.push({ table, op: 'upsert', values, options }); return builder; },
      delete: () => { writes.push({ table, op: 'delete' }); return builder; },
      eq: () => builder,
      maybeSingle: async () => ({ data: tables[table] ?? null, error: null }),
      single: async () => ({ data: { id: ID, ...(state.values || {}) }, error: null }),
      then: (resolve) => resolve({ data: null, error: null }),
    };
    return builder;
  };
  return { from, writes };
}

async function start(t, { admin = fakeAdmin(), rpc = [], sandbox = false } = {}) {
  const userClient = (token) => ({ rpc: async (name, args) => { rpc.push({ token, name, args }); return { data: null, error: null }; } });
  const service = createContentService({ admin, userClient });
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bashlab-content-'));
  const manager = new SessionManager({ root });
  const server = createApp({ manager, rateMax: 1000, auth: fakeAuth, content: { service }, sandbox })
    .listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); await fs.rm(root, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (user, method, url, body) => fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${user}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { call, admin, rpc, base, manager };
}

test('every write endpoint requires a token', async (t) => {
  const { call } = await start(t);
  for (const [method, url] of [
    ['PUT', `/api/progress/${ID}`], ['DELETE', `/api/progress/${ID}`],
    ['POST', '/api/admin/courses'], ['PATCH', `/api/admin/lessons/${ID}`],
    ['POST', `/api/admin/users/${ID}/role`], ['POST', `/api/admin/sessions/${ID}/stop`],
  ]) {
    assert.equal((await call(null, method, url, {})).status, 401, `${method} ${url}`);
  }
});

test('a learner is refused on every /api/admin route and nothing is written', async (t) => {
  const { call, admin, rpc } = await start(t);
  for (const [method, url, body] of [
    ['POST', '/api/admin/courses', { title: 'x', slug: 'x' }],
    ['PATCH', `/api/admin/courses/${ID}`, { title: 'x' }],
    ['POST', `/api/admin/courses/${ID}/chapters`, { title: 'x' }],
    ['PATCH', `/api/admin/chapters/${ID}`, { title: 'x' }],
    ['POST', `/api/admin/chapters/${ID}/lessons`, { title: 'x', slug: 'x' }],
    ['PATCH', `/api/admin/lessons/${ID}`, { status: 'published' }],
    ['POST', '/api/admin/lessons/swap', { items: [{ id: ID, sort_order: 1 }, { id: ID2, sort_order: 2 }] }],
    ['POST', `/api/admin/users/${ID}/role`, { role: 'admin' }],
    ['POST', `/api/admin/users/${ID}/lock`, { locked: true }],
    ['POST', `/api/admin/sessions/${ID}/stop`, { reason: 'x' }],
  ]) {
    const res = await call('alice', method, url, body);
    assert.equal(res.status, 403, `${method} ${url}`);
    assert.equal((await res.json()).error.code, 'FORBIDDEN');
  }
  assert.deepEqual(admin.writes, []);
  assert.deepEqual(rpc, []);
});

test('admin course create keeps only whitelisted columns and validates them', async (t) => {
  const { call, admin } = await start(t);
  const ok = await call('admin', 'POST', '/api/admin/courses', { title: ' Shell 301 ', slug: 'shell-301', id: 'hack', created_at: 'x', role: 'admin' });
  assert.equal(ok.status, 201);
  assert.deepEqual(admin.writes[0].values, { status: 'draft', sort_order: 0, title: 'Shell 301', slug: 'shell-301' });

  for (const body of [
    { title: 'x', slug: 'Bad Slug' }, { title: '', slug: 'ok' }, { title: 'x', slug: 'ok', status: 'archived' },
    { title: 'x', slug: 'ok', duration_minutes: -5 }, { slug: 'ok' }, [], 'str',
  ]) {
    const res = await call('admin', 'POST', '/api/admin/courses', body);
    assert.equal(res.status, 400, JSON.stringify(body));
  }
  assert.equal(admin.writes.length, 1);
});

test('lesson updates accept only known fields, and ids must be UUIDs', async (t) => {
  const { call, admin } = await start(t);
  assert.equal((await call('admin', 'PATCH', '/api/admin/lessons/not-a-uuid', { title: 'x' })).status, 400);
  assert.equal((await call('admin', 'PATCH', `/api/admin/lessons/${ID}`, { unknown: 1 })).status, 400);
  assert.equal((await call('admin', 'PATCH', `/api/admin/lessons/${ID}`, { lesson_content: 'str' })).status, 400);
  assert.equal((await call('admin', 'PATCH', `/api/admin/lessons/${ID}`, { test_template: { verifier: 1 } })).status, 400);
  const res = await call('admin', 'PATCH', `/api/admin/lessons/${ID}`, { title: 'New', status: 'published', user_id: 'x' });
  assert.equal(res.status, 200);
  assert.deepEqual(admin.writes.at(-1).values, { title: 'New', status: 'published' });
});

test('large lesson content is accepted on admin routes (512kb) but not beyond', async (t) => {
  const { call } = await start(t);
  const big = { lesson_content: { schema: 1, pad: 'x'.repeat(100_000) } };
  assert.equal((await call('admin', 'PATCH', `/api/admin/lessons/${ID}`, big)).status, 200);
  const huge = { lesson_content: { pad: 'x'.repeat(600_000) } };
  assert.equal((await call('admin', 'PATCH', `/api/admin/lessons/${ID}`, huge)).status, 413);
});

test('reordering needs exactly two distinct items with integer sort_order', async (t) => {
  const { call, admin } = await start(t);
  const url = '/api/admin/chapters/swap';
  assert.equal((await call('admin', 'POST', url, { items: [{ id: ID, sort_order: 1 }] })).status, 400);
  assert.equal((await call('admin', 'POST', url, { items: [{ id: ID, sort_order: 1 }, { id: ID, sort_order: 2 }] })).status, 400);
  assert.equal((await call('admin', 'POST', url, { items: [{ id: ID, sort_order: 1.5 }, { id: ID2, sort_order: 2 }] })).status, 400);
  assert.equal((await call('admin', 'POST', '/api/admin/users/swap', { items: [] })).status, 404);
  assert.equal((await call('admin', 'POST', url, { items: [{ id: ID, sort_order: 2 }, { id: ID2, sort_order: 1 }] })).status, 204);
  assert.equal(admin.writes.filter((w) => w.table === 'chapters').length, 2);
});

test('role/lock actions run as the caller (their own JWT) so the audit log names them', async (t) => {
  const { call, rpc } = await start(t);
  assert.equal((await call('admin', 'POST', `/api/admin/users/${ID}/role`, { role: 'owner' })).status, 400);
  assert.equal((await call('admin', 'POST', `/api/admin/users/${ID}/lock`, { locked: 'yes' })).status, 400);
  assert.equal((await call('admin', 'POST', `/api/admin/users/${ID}/role`, { role: 'admin', reason: 'promote' })).status, 204);
  assert.equal((await call('admin', 'POST', `/api/admin/users/${ID}/lock`, { locked: true, reason: 'abuse' })).status, 204);
  assert.deepEqual(rpc.map((r) => [r.token, r.name]), [['jwt-admin', 'admin_set_user_role'], ['jwt-admin', 'admin_set_user_lock']]);
  assert.deepEqual(rpc[0].args, { target: ID, new_role: 'admin', reason: 'promote' });
});

test('progress: only published lessons of published courses, only own rows, from the token', async (t) => {
  const published = { id: ID, status: 'published', chapters: { courses: { status: 'published' } } };
  const { call, admin } = await start(t, { admin: fakeAdmin({ lessons: published }) });
  assert.equal((await call('alice', 'PUT', '/api/progress/nope', { status: 'done' })).status, 400);
  assert.equal((await call('alice', 'PUT', `/api/progress/${ID}`, { status: 'locked' })).status, 400);
  assert.equal((await call('alice', 'PUT', `/api/progress/${ID}`, { status: 'done', user_id: 'bob' })).status, 204);
  assert.equal(admin.writes.at(-1).values.user_id, 'alice'); // never the body's user_id
  assert.equal((await call('alice', 'PUT', `/api/progress/${ID}`, { status: 'in_progress' })).status, 204);
  assert.equal(admin.writes.at(-1).options.ignoreDuplicates, true); // never downgrades "done"
});

test('progress on a draft lesson or draft course is a 404 for learners', async (t) => {
  const draftLesson = { id: ID, status: 'draft', chapters: { courses: { status: 'published' } } };
  const draftCourse = { id: ID, status: 'published', chapters: { courses: { status: 'draft' } } };
  for (const lesson of [draftLesson, draftCourse]) {
    const { call, admin } = await start(t, { admin: fakeAdmin({ lessons: lesson }) });
    assert.equal((await call('alice', 'PUT', `/api/progress/${ID}`, { status: 'done' })).status, 404);
    assert.equal(admin.writes.length, 0);
  }
  const { call } = await start(t, { admin: fakeAdmin({ lessons: draftLesson }) });
  assert.equal((await call('admin', 'PUT', `/api/progress/${ID}`, { status: 'done' })).status, 204); // admin may preview
});

test('practice sessions cannot be attached to hidden lessons and failed opens clean up the sandbox', async (t) => {
  const hiddenLessons = [
    { id: ID, status: 'draft', chapters: { courses: { status: 'published' } } },
    { id: ID, status: 'published', chapters: { courses: { status: 'draft' } } },
  ];
  for (const lesson of hiddenLessons) {
    const { call, admin, manager } = await start(t, { admin: fakeAdmin({ lessons: lesson }), sandbox: true });
    const response = await call('alice', 'POST', '/api/sessions', { lessonId: ID });
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, 'LESSON_NOT_FOUND');
    assert.equal(manager.sessions.size, 0);
    assert.deepEqual(admin.writes, []);
  }

  const visible = { id: ID, status: 'published', chapters: { courses: { status: 'published' } } };
  const { call, admin } = await start(t, { admin: fakeAdmin({ lessons: visible }), sandbox: true });
  assert.equal((await call('alice', 'POST', '/api/sessions', { lessonId: ID })).status, 201);
  assert.equal(admin.writes.find((write) => write.table === 'practice_sessions').values.lesson_id, ID);
});

test('the API sends hardening headers and hides its stack', async (t) => {
  const { base } = await start(t);
  const res = await fetch(`${base}/health`);
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.match(res.headers.get('content-security-policy'), /default-src 'none'/);
  assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
  assert.ok(res.headers.get('strict-transport-security'));
});
