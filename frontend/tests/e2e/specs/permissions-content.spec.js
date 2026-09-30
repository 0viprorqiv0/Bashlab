// Access control around learning content and activity, asserted with real
// user tokens. READS go straight to Supabase under RLS (the browser's own
// access path); WRITES go through the backend API, and direct writes from a
// browser token must be refused (migration 017). Covers: lessons of
// unreleased courses, progress on lessons the user can't see, un-ticking
// progress, and session ownership.
const { test, expect } = require('@playwright/test');
const { signIn, forToken, forBackend } = require('../support/apiClient');
const { adminClient } = require('../support/supabaseAdmin');
const { loadUsers } = require('../support/testUsers');
const { env } = require('../support/env');

let users;
let learnerApi;
let adminApi;
let learnerBackend;
let adminBackend;
const fixtures = {};

// A published lesson inside a course whose status we control.
async function courseWithLesson(status, tag) {
  const slug = `e2e-${tag}-${Date.now()}`;
  const { data: course } = await adminClient.from('courses').insert({ title: `E2E ${tag}`, slug, status, sort_order: 998 }).select('id').single();
  const { data: chapter } = await adminClient.from('chapters').insert({ course_id: course.id, title: 'Chapter', sort_order: 1 }).select('id').single();
  const { data: lesson, error } = await adminClient.from('lessons')
    .insert({ chapter_id: chapter.id, title: `Lesson ${tag}`, slug: `lesson-${tag}`, status: 'published', sort_order: 1, content_md: `secret content ${tag}` })
    .select('id').single();
  if (error) throw error;
  return { courseId: course.id, chapterId: chapter.id, lessonId: lesson.id, slug };
}

test.beforeAll(async () => {
  users = loadUsers();
  const learnerToken = (await signIn(users.learner.email, users.learner.password)).access_token;
  const adminToken = (await signIn(users.admin.email, users.admin.password)).access_token;
  learnerApi = forToken(learnerToken);
  adminApi = forToken(adminToken);
  learnerBackend = forBackend(learnerToken);
  adminBackend = forBackend(adminToken);
  for (const status of ['hidden', 'draft', 'upcoming', 'published']) fixtures[status] = await courseWithLesson(status, status);
});

test.afterAll(async () => {
  for (const fixture of Object.values(fixtures)) await adminClient.from('courses').delete().eq('id', fixture.courseId);
});

test.describe('lessons are only readable when their COURSE is published', () => {
  for (const status of ['hidden', 'draft', 'upcoming']) {
    test(`a published lesson inside a ${status} course is invisible to a learner and to anonymous visitors`, async () => {
      const id = fixtures[status].lessonId;
      const asLearner = await learnerApi.select('lessons', `?select=id,content_md&id=eq.${id}`);
      expect(asLearner.status).toBe(200);
      expect(asLearner.data).toEqual([]);

      const anon = await forToken(env.SUPABASE_ANON_KEY).select('lessons', `?select=id,content_md&id=eq.${id}`);
      expect(anon.data).toEqual([]);

      // Nested access through the course must not leak it either.
      const nested = await learnerApi.select('courses', `?select=slug,chapters(lessons(id,content_md))&slug=eq.${fixtures[status].slug}`);
      const lessons = (nested.data[0]?.chapters || []).flatMap((chapter) => chapter.lessons);
      expect(lessons).toEqual([]);
    });
  }

  test('...while the same lesson in a published course is readable, and admins can read all of them', async () => {
    expect((await learnerApi.select('lessons', `?select=id&id=eq.${fixtures.published.lessonId}`)).data).toHaveLength(1);
    for (const status of ['hidden', 'draft', 'upcoming']) {
      expect((await adminApi.select('lessons', `?select=id&id=eq.${fixtures[status].lessonId}`)).data, status).toHaveLength(1);
    }
  });

  test('a draft lesson in a published course stays hidden too', async () => {
    const { data: lesson } = await adminClient.from('lessons')
      .insert({ chapter_id: fixtures.published.chapterId, title: 'Draft lesson', slug: 'draft-lesson', status: 'draft', sort_order: 2 })
      .select('id').single();
    expect((await learnerApi.select('lessons', `?select=id&id=eq.${lesson.id}`)).data).toEqual([]);
    expect((await adminApi.select('lessons', `?select=id&id=eq.${lesson.id}`)).data).toHaveLength(1);
  });
});

test.describe('progress (API)', () => {
  test.afterEach(async () => {
    await adminClient.from('progress').delete().eq('user_id', users.learner.id);
  });

  test('cannot record progress on a lesson you are not allowed to see', async () => {
    for (const status of ['hidden', 'draft', 'upcoming']) {
      const response = await learnerBackend('PUT', `/api/progress/${fixtures[status].lessonId}`, { status: 'done' });
      expect(response.status, status).toBe(404);
    }
    const { data } = await adminClient.from('progress').select('lesson_id').eq('user_id', users.learner.id);
    expect(data).toEqual([]);
  });

  test('can record progress on a visible lesson, start never downgrades done, and un-tick removes it', async () => {
    const lessonId = fixtures.published.lessonId;
    expect((await learnerBackend('PUT', `/api/progress/${lessonId}`, { status: 'done' })).status).toBe(204);
    expect((await learnerBackend('PUT', `/api/progress/${lessonId}`, { status: 'in_progress' })).status).toBe(204);
    const { data: row } = await adminClient.from('progress').select('status, completed_at').eq('user_id', users.learner.id).eq('lesson_id', lessonId).single();
    expect(row.status).toBe('done');
    expect(row.completed_at).toBeTruthy();

    expect((await learnerBackend('DELETE', `/api/progress/${lessonId}`)).status).toBe(204);
    const { data } = await adminClient.from('progress').select('lesson_id').eq('user_id', users.learner.id);
    expect(data).toEqual([]);
  });

  test('the user always comes from the token: a spoofed user_id in the body changes nothing', async () => {
    await learnerBackend('PUT', `/api/progress/${fixtures.published.lessonId}`, { status: 'done', user_id: users.target.id });
    const { data } = await adminClient.from('progress').select('user_id').eq('lesson_id', fixtures.published.lessonId);
    expect(data.map((r) => r.user_id)).toEqual([users.learner.id]);
  });

  test("cannot delete or read another user's progress", async () => {
    await adminClient.from('progress').insert({ user_id: users.target.id, lesson_id: fixtures.published.lessonId, status: 'done' });
    try {
      expect((await learnerApi.select('progress', `?select=lesson_id&user_id=eq.${users.target.id}`)).data).toEqual([]);
      await learnerBackend('DELETE', `/api/progress/${fixtures.published.lessonId}`); // only ever the caller's own row
      const { data } = await adminClient.from('progress').select('lesson_id').eq('user_id', users.target.id);
      expect(data).toHaveLength(1);
    } finally {
      await adminClient.from('progress').delete().eq('user_id', users.target.id);
    }
  });

  test('a browser token can no longer write progress directly', async () => {
    const row = { user_id: users.learner.id, lesson_id: fixtures.published.lessonId, status: 'done' };
    expect((await learnerApi.insert('progress', row)).status).toBe(403);
    expect((await learnerApi.update('progress', `?user_id=eq.${users.learner.id}`, { status: 'done' })).status).toBe(403);
    expect((await learnerApi.remove('progress', `?user_id=eq.${users.learner.id}`)).status).toBe(403);
  });
});

test.describe('practice sessions', () => {
  let sessionId;
  test.beforeEach(async () => {
    const { data } = await adminClient.from('practice_sessions')
      .insert({ user_id: users.learner.id, lesson_id: fixtures.published.lessonId, status: 'active' }).select('id').single();
    sessionId = data.id;
  });
  test.afterEach(async () => {
    await adminClient.from('practice_sessions').delete().eq('user_id', users.learner.id);
  });

  test('a learner reads their own session, but cannot insert, update or delete sessions from the browser', async () => {
    expect((await learnerApi.select('practice_sessions', `?select=id&id=eq.${sessionId}`)).data).toHaveLength(1);
    expect((await learnerApi.insert('practice_sessions', { user_id: users.learner.id, lesson_id: fixtures.published.lessonId, status: 'active' })).status).toBe(403);
    expect((await learnerApi.update('practice_sessions', `?id=eq.${sessionId}`, { status: 'stopped' })).status).toBe(403);
    expect((await learnerApi.remove('practice_sessions', `?id=eq.${sessionId}`)).status).toBe(403);
    expect((await adminClient.from('practice_sessions').select('status').eq('id', sessionId).single()).data.status).toBe('active');
  });

  test("a learner cannot see another learner's session, but an admin can", async () => {
    const { data: other } = await adminClient.from('practice_sessions')
      .insert({ user_id: users.target.id, lesson_id: fixtures.published.lessonId, status: 'active' }).select('id').single();
    try {
      expect((await learnerApi.select('practice_sessions', `?select=id&id=eq.${other.id}`)).data).toEqual([]);
      expect((await adminApi.select('practice_sessions', `?select=id&id=eq.${other.id}`)).data).toHaveLength(1);
    } finally {
      await adminClient.from('practice_sessions').delete().eq('id', other.id);
    }
  });

  test('stopping a session is admin-only via the API, recorded with a reason', async () => {
    const url = `/api/admin/sessions/${sessionId}/stop`;
    expect((await learnerBackend('POST', url, { reason: 'nope' })).status).toBe(403);
    expect((await adminClient.from('practice_sessions').select('status').eq('id', sessionId).single()).data.status).toBe('active');
    expect((await adminBackend('POST', url, { reason: 'e2e stop via api' })).status).toBe(204);
    expect((await adminClient.from('practice_sessions').select('status').eq('id', sessionId).single()).data.status).toBe('stopped');
  });
});

test.describe('lesson_content and slug rules are enforced by the database, not just the editor', () => {
  const structured = (overrides = {}) => ({
    version: 1, short_objective: 'Do the thing', track: 'Core', difficulty: 'easy', tag: 'Nav', commands: ['ls'],
    scenario: 'You are on a server.', steps: [{ id: 's1', text: 'Run `ls`.' }], command_syntax: [], examples: [], hint: '', solution_explanation: '',
    ...overrides,
  });

  test('a structured lab can be published only when complete; drafts may be incomplete but must be well-typed', async () => {
    const chapterId = fixtures.published.chapterId;
    const attempt = (slug, status, lesson_content) => adminBackend('POST', `/api/admin/chapters/${chapterId}/lessons`, { title: slug, slug, status, sort_order: 5, lesson_content });

    expect((await attempt('lab-ok', 'published', structured())).status).toBe(201);
    expect((await attempt('lab-no-steps', 'published', structured({ steps: [] }))).status).toBe(400);
    expect((await attempt('lab-no-scenario', 'published', structured({ scenario: '  ' }))).status).toBe(400);
    expect((await attempt('lab-dup-step', 'published', structured({ steps: [{ id: 'a', text: 'x' }, { id: 'a', text: 'y' }] }))).status).toBe(400);
    expect((await attempt('lab-bad-diff', 'draft', structured({ difficulty: 'impossible' }))).status).toBe(400);
    expect((await attempt('lab-bad-type', 'draft', structured({ commands: 'ls' }))).status).toBe(400);
    expect((await attempt('lab-bad-version', 'draft', structured({ version: 2 }))).status).toBe(400);
    expect((await attempt('lab-draft-empty', 'draft', structured({ steps: [], scenario: '', short_objective: '' }))).status).toBe(201);
  });

  test('a learner cannot write lessons at all, even valid ones - via the API or directly', async () => {
    const body = { title: 'x', slug: 'learner-made', status: 'published', sort_order: 9 };
    expect((await learnerBackend('POST', `/api/admin/chapters/${fixtures.published.chapterId}/lessons`, body)).status).toBe(403);
    expect((await learnerApi.insert('lessons', { chapter_id: fixtures.published.chapterId, ...body })).status).toBe(403);
  });

  test('even an admin token cannot write content straight to the database any more', async () => {
    const row = { chapter_id: fixtures.published.chapterId, title: 'direct', slug: 'direct-write', status: 'draft', sort_order: 9 };
    expect((await adminApi.insert('lessons', row)).status).toBe(403);
    expect((await adminApi.insert('courses', { title: 'direct', slug: 'direct-course', status: 'draft' })).status).toBe(403);
    expect((await adminApi.update('lessons', `?id=eq.${fixtures.published.lessonId}`, { title: 'hacked' })).status).toBe(403);
  });

  test('slugs are unique per course (even across chapters) and must be url-safe; other courses may reuse them', async () => {
    const { data: second } = await adminClient.from('chapters').insert({ course_id: fixtures.published.courseId, title: 'Second', sort_order: 2 }).select('id').single();
    const create = (chapterId, body) => adminBackend('POST', `/api/admin/chapters/${chapterId}/lessons`, body);
    await create(fixtures.published.chapterId, { title: 'a', slug: 'shared-slug', status: 'draft', sort_order: 6 });
    const clash = await create(second.id, { title: 'b', slug: 'shared-slug', status: 'draft', sort_order: 1 });
    expect(clash.status).toBe(409);
    expect((await create(second.id, { title: 'c', slug: 'Not A Slug', status: 'draft', sort_order: 2 })).status).toBe(400);
    const otherCourse = await create(fixtures.draft.chapterId, { title: 'd', slug: 'shared-slug', status: 'draft', sort_order: 1 });
    expect(otherCourse.status).toBe(201);
  });
});
