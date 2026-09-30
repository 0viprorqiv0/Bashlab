// Row-level security around learning content and activity, asserted with real
// user tokens straight against Supabase (the browser's own access path).
// Covers the holes closed by migration 015: lessons of unreleased courses,
// progress rows for lessons the user can't see, un-ticking progress, and a
// learner reopening a session an admin stopped.
const { test, expect } = require('@playwright/test');
const { signIn, forToken } = require('../support/apiClient');
const { adminClient } = require('../support/supabaseAdmin');
const { loadUsers } = require('../support/testUsers');
const { env } = require('../support/env');

let users;
let learnerApi;
let adminApi;
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
  learnerApi = forToken((await signIn(users.learner.email, users.learner.password)).access_token);
  adminApi = forToken((await signIn(users.admin.email, users.admin.password)).access_token);
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

test.describe('progress', () => {
  test.afterEach(async () => {
    await adminClient.from('progress').delete().eq('user_id', users.learner.id);
  });

  test('cannot record progress on a lesson you are not allowed to see', async () => {
    const response = await learnerApi.insert('progress', { user_id: users.learner.id, lesson_id: fixtures.hidden.lessonId, status: 'done' });
    expect(response.status).toBe(403);
  });

  test('can record progress on a visible lesson, and can un-tick it again (DELETE own row)', async () => {
    const write = await learnerApi.insert('progress', { user_id: users.learner.id, lesson_id: fixtures.published.lessonId, status: 'done' });
    expect(write.status).toBe(201);
    const removed = await fetchDelete('progress', `?user_id=eq.${users.learner.id}&lesson_id=eq.${fixtures.published.lessonId}`);
    expect(removed.status).toBe(204);
    const { data } = await adminClient.from('progress').select('lesson_id').eq('user_id', users.learner.id);
    expect(data).toEqual([]);
  });

  test("cannot delete or read another user's progress", async () => {
    await adminClient.from('progress').insert({ user_id: users.target.id, lesson_id: fixtures.published.lessonId, status: 'done' });
    try {
      expect((await learnerApi.select('progress', `?select=lesson_id&user_id=eq.${users.target.id}`)).data).toEqual([]);
      await fetchDelete('progress', `?user_id=eq.${users.target.id}`);
      const { data } = await adminClient.from('progress').select('lesson_id').eq('user_id', users.target.id);
      expect(data).toHaveLength(1);
    } finally {
      await adminClient.from('progress').delete().eq('user_id', users.target.id);
    }
  });

  async function fetchDelete(table, query) {
    const { access_token: token } = await signIn(users.learner.email, users.learner.password);
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}${query}`, {
      method: 'DELETE',
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    return { status: response.status };
  }
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

  test('a learner can end their own active session', async () => {
    const response = await learnerApi.update('practice_sessions', `?id=eq.${sessionId}`, { status: 'stopped' });
    expect(response.status).toBe(200);
    expect(response.data[0].status).toBe('stopped');
  });

  test('a session an admin stopped cannot be reopened by the learner', async () => {
    await adminClient.from('practice_sessions').update({ status: 'stopped' }).eq('id', sessionId);
    const reopen = await learnerApi.update('practice_sessions', `?id=eq.${sessionId}`, { status: 'active' });
    expect(reopen.data).toEqual([]); // RLS filters the row: nothing matched, nothing changed
    const { data } = await adminClient.from('practice_sessions').select('status').eq('id', sessionId).single();
    expect(data.status).toBe('stopped');
  });

  test('a learner cannot open a session already marked expired/stopped, or for a lesson they cannot see, or as someone else', async () => {
    const forHidden = await learnerApi.insert('practice_sessions', { user_id: users.learner.id, lesson_id: fixtures.hidden.lessonId, status: 'active' });
    expect(forHidden.status).toBe(403);
    const asOther = await learnerApi.insert('practice_sessions', { user_id: users.target.id, lesson_id: fixtures.published.lessonId, status: 'active' });
    expect(asOther.status).toBe(403);
    const prestopped = await learnerApi.insert('practice_sessions', { user_id: users.learner.id, lesson_id: fixtures.published.lessonId, status: 'expired' });
    expect(prestopped.status).toBe(403);
  });

  test("a learner cannot see or stop another learner's session, but an admin can", async () => {
    const { data: other } = await adminClient.from('practice_sessions')
      .insert({ user_id: users.target.id, lesson_id: fixtures.published.lessonId, status: 'active' }).select('id').single();
    try {
      expect((await learnerApi.select('practice_sessions', `?select=id&id=eq.${other.id}`)).data).toEqual([]);
      expect((await learnerApi.update('practice_sessions', `?id=eq.${other.id}`, { status: 'stopped' })).data).toEqual([]);
      expect((await adminApi.select('practice_sessions', `?select=id&id=eq.${other.id}`)).data).toHaveLength(1);
    } finally {
      await adminClient.from('practice_sessions').delete().eq('id', other.id);
    }
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
    const attempt = (slug, status, lesson_content) => adminApi.insert('lessons', { chapter_id: chapterId, title: slug, slug, status, sort_order: 5, lesson_content });

    expect((await attempt('lab-ok', 'published', structured())).status).toBe(201);
    expect((await attempt('lab-no-steps', 'published', structured({ steps: [] }))).status).toBe(400);
    expect((await attempt('lab-no-scenario', 'published', structured({ scenario: '  ' }))).status).toBe(400);
    expect((await attempt('lab-dup-step', 'published', structured({ steps: [{ id: 'a', text: 'x' }, { id: 'a', text: 'y' }] }))).status).toBe(400);
    expect((await attempt('lab-bad-diff', 'draft', structured({ difficulty: 'impossible' }))).status).toBe(400);
    expect((await attempt('lab-bad-type', 'draft', structured({ commands: 'ls' }))).status).toBe(400);
    expect((await attempt('lab-bad-version', 'draft', structured({ version: 2 }))).status).toBe(400);
    expect((await attempt('lab-draft-empty', 'draft', structured({ steps: [], scenario: '', short_objective: '' }))).status).toBe(201);
  });

  test('a learner cannot write lessons at all, even valid ones', async () => {
    const response = await learnerApi.insert('lessons', { chapter_id: fixtures.published.chapterId, title: 'x', slug: 'learner-made', status: 'published', sort_order: 9 });
    expect(response.status).toBe(403);
  });

  test('slugs are unique per course (even across chapters) and must be url-safe; other courses may reuse them', async () => {
    const { data: second } = await adminClient.from('chapters').insert({ course_id: fixtures.published.courseId, title: 'Second', sort_order: 2 }).select('id').single();
    await adminApi.insert('lessons', { chapter_id: fixtures.published.chapterId, title: 'a', slug: 'shared-slug', status: 'draft', sort_order: 6 });
    const clash = await adminApi.insert('lessons', { chapter_id: second.id, title: 'b', slug: 'shared-slug', status: 'draft', sort_order: 1 });
    expect(clash.status).toBe(409);
    expect((await adminApi.insert('lessons', { chapter_id: second.id, title: 'c', slug: 'Not A Slug', status: 'draft', sort_order: 2 })).status).toBe(400);
    const otherCourse = await adminApi.insert('lessons', { chapter_id: fixtures.draft.chapterId, title: 'd', slug: 'shared-slug', status: 'draft', sort_order: 1 });
    expect(otherCourse.status).toBe(201);
  });
});
