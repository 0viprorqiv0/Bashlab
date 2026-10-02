// This is the core of "phân quyền" coverage: the UI guard (AdminGate) is
// UX-only by design (see its own comment in the component), so the real
// assertions here go straight at Postgres RLS and the admin_* RPCs — the
// actual security boundary — the same way a learner with dev tools open
// could try to bypass the UI.
const path = require('path');
const { test, expect } = require('../support/session');
const { signIn, forToken, forBackend } = require('../support/apiClient');
const { adminClient } = require('../support/supabaseAdmin');
const { loadUsers } = require('../support/testUsers');

const authDir = path.join(__dirname, '..', '.auth');
let users;
let hiddenCourseId;
let hiddenCourseSlug;
test.beforeAll(async () => {
  users = loadUsers();
  // 'published' and 'upcoming' are public teasers (013_public_upcoming_courses.sql);
  // 'draft'/'hidden' must stay admin-only. Use our own disposable course so
  // this doesn't depend on shell-201/linux-security keeping any particular status.
  hiddenCourseSlug = `e2e-hidden-${Date.now()}`;
  const { data, error } = await adminClient
    .from('courses')
    .insert({ title: 'E2E Hidden Course', slug: hiddenCourseSlug, status: 'hidden', sort_order: 999 })
    .select('id')
    .single();
  if (error) throw error;
  hiddenCourseId = data.id;
});
test.afterAll(async () => {
  if (hiddenCourseId) await adminClient.from('courses').delete().eq('id', hiddenCourseId);
});

test.describe('admin UI guard (UX layer)', () => {
  test.use({ asRole: 'learner' });
  for (const section of ['content', 'users', 'activity']) {
    test(`a logged-in learner sees 403 on /admin/${section}`, async ({ page }) => {
      await page.goto(`/admin/${section}`);
      await expect(page.getByText('You do not have permission to access this page.')).toBeVisible();
    });
  }
});

test.describe('admin UI guard (admin allowed)', () => {
  test.use({ asRole: 'admin' });
  test('an admin reaches /admin/content and does not see the 403 page', async ({ page }) => {
    await page.goto('/admin/content');
    await expect(page.getByRole('heading', { name: 'Content' })).toBeVisible();
    await expect(page.getByText('You do not have permission')).toHaveCount(0);
  });
});

test.describe('RLS / RPC boundary — learner token, bypassing the UI entirely', () => {
  let api;
  let session;

  test.beforeAll(async () => {
    session = await signIn(users.learner.email, users.learner.password);
    api = forToken(session.access_token);
  });

  test('every admin_* RPC rejects a learner with 42501 forbidden', async () => {
    for (const [fn, args] of [
      ['admin_list_users', { p_search: '', p_limit: 5, p_offset: 0 }],
      ['admin_set_user_role', { target: users.target.id, new_role: 'admin', reason: 'e2e probe' }],
      ['admin_set_user_lock', { target: users.target.id, locked: true, reason: 'e2e probe' }],
      ['admin_stop_session', { p_session: '00000000-0000-0000-0000-000000000000', p_reason: 'e2e probe' }],
    ]) {
      const { status, data } = await api.rpc(fn, args);
      expect(status, `${fn} should be rejected`).toBe(403);
      expect(data.code).toBe('42501');
      expect(data.message).toBe('forbidden');
    }
  });

  test('cannot write to courses/chapters/lessons', async () => {
    const { status, data } = await api.insert('courses', { title: 'e2e hack', slug: `e2e-hack-${Date.now()}`, status: 'draft', sort_order: 999 });
    expect(status).toBe(403);
    expect(data.code).toBe('42501');
  });

  test('hidden courses are invisible — only published/upcoming rows come back', async () => {
    const { status, data } = await api.select('courses', '?select=slug,status');
    expect(status).toBe(200);
    expect(data.every((row) => ['published', 'upcoming'].includes(row.status))).toBe(true);
    expect(data.some((row) => row.slug === 'shell-101')).toBe(true);
    expect(data.some((row) => row.slug === hiddenCourseSlug)).toBe(false);
  });

  test('admin_logs is invisible to a learner (RLS filters rows, not an error)', async () => {
    const { status, data } = await api.select('admin_logs', '?select=id&limit=5');
    expect(status).toBe(200);
    expect(data).toEqual([]);
  });

  test('profiles: a learner only ever sees their own row', async () => {
    const { status, data } = await api.select('profiles', '?select=id,email');
    expect(status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe(users.learner.id);
  });

  test('progress: written through the API for the caller only; direct writes and impersonation are refused', async () => {
    const [{ data: lessons }] = await Promise.all([
      adminClient.from('lessons').select('id').eq('slug', 'terminal-fundamentals-navigation').limit(1).then((r) => r),
    ]);
    const lessonId = lessons[0].id;
    const backend = forBackend(session.access_token);

    // This lab has a flag: "done" cannot be asked for directly, only earned by the flag.
    const asked = await backend('PUT', `/api/progress/${lessonId}`, { status: 'done' });
    expect([asked.status, asked.data.error.code]).toEqual([403, 'FLAG_REQUIRED']);
    const own = await backend('POST', `/api/labs/${lessonId}/flag`, { flag: 'BASHLAB{ls_dash_a_shows_hidden_files}' });
    expect([own.status, own.data]).toEqual([200, { correct: true }]);

    // Direct PostgREST writes no longer exist for browser tokens (migration 017).
    const direct = await api.insert('progress', { user_id: users.learner.id, lesson_id: lessonId, status: 'done' });
    expect(direct.status).toBe(403);
    const spoofed = await api.insert('progress', { user_id: users.target.id, lesson_id: lessonId, status: 'done' });
    expect(spoofed.status).toBe(403);

    await adminClient.from('progress').delete().eq('user_id', users.learner.id).eq('lesson_id', lessonId);
  });
});

test.describe('RLS / RPC boundary — admin token', () => {
  let api;

  test.beforeAll(async () => {
    const session = await signIn(users.admin.email, users.admin.password);
    api = forToken(session.access_token);
  });

  test('admin cannot lock their own account (self-lock guard in the RPC, independent of "last admin")', async () => {
    const { status, data } = await api.rpc('admin_set_user_lock', { target: users.admin.id, locked: true, reason: 'e2e self-lock probe' });
    expect(status).toBe(400);
    expect(data.message).toContain('cannot lock your own account');
  });

  test('admin can promote/demote a learner and read hidden content, and every action is written to admin_logs', async () => {
    // admin_set_user_role returns void — PostgREST responds 204 No Content on success.
    const promote = await api.rpc('admin_set_user_role', { target: users.target.id, new_role: 'admin', reason: 'e2e promote' });
    expect(promote.status).toBe(204);

    const demote = await api.rpc('admin_set_user_role', { target: users.target.id, new_role: 'learner', reason: 'e2e demote' });
    expect(demote.status).toBe(204);

    const { data: logs } = await adminClient
      .from('admin_logs')
      .select('action, reason, actor_id, target_id')
      .eq('target_id', users.target.id)
      .order('created_at', { ascending: false })
      .limit(2);
    expect(logs.map((l) => l.action)).toEqual(['set_role:learner', 'set_role:admin']);
    expect(logs.every((l) => l.actor_id === users.admin.id)).toBe(true);

    const hidden = await api.select('courses', `?select=slug,status&slug=eq.${hiddenCourseSlug}`);
    expect(hidden.status).toBe(200);
    expect(hidden.data).toHaveLength(1);
  });
});
