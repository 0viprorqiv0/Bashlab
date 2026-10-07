// The Shell 101 lab workspace (static UI) saves real progress: finishing a lab
// writes through PUT /api/progress/:lessonId, and the workspace, the course
// page and My Learning all read it back from the database.
const path = require('path');
const { test, expect } = require('../support/session');
const { adminClient } = require('../support/supabaseAdmin');
const { loadUsers } = require('../support/testUsers');

test.use({ asRole: 'learner' });

let users;
test.beforeAll(() => { users = loadUsers(); });
test.afterEach(async () => { await adminClient.from('progress').delete().eq('user_id', users.learner.id); });

const LAB = '/courses/shell-101/labs/terminal-fundamentals-navigation'; // by slug: the position of a lab changes when labs are added
const LAB1_FLAG = 'BASHLAB{ls_dash_a_shows_hidden_files}';

test('submitting the lab flag saves progress and survives a reload', async ({ page }) => {
  await page.goto(LAB);
  await expect(page.getByRole('button', { name: 'Submit flag' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check Solution' })).toHaveCount(0);

  await page.getByLabel('Flag').fill(LAB1_FLAG);
  const checked = page.waitForResponse((res) => res.url().includes('/api/labs/') && res.request().method() === 'POST');
  await page.getByRole('button', { name: 'Submit flag' }).click();
  expect((await checked).status()).toBe(200);
  await expect(page.getByText('Correct flag. Lab completed!')).toBeVisible();

  const { data } = await adminClient.from('progress').select('status, lessons(slug)').eq('user_id', users.learner.id);
  expect(data).toHaveLength(1);
  expect(data[0].status).toBe('done');
  expect(data[0].lessons.slug).toBe('terminal-fundamentals-navigation');

  await page.reload();
  await expect(page.getByText('Objective Tasks (4 of 4 completed)')).toBeVisible();
  await expect(page.getByLabel('Flag')).toBeDisabled();

});

test('a wrong flag is refused and saves nothing', async ({ page }) => {
  await page.goto(LAB);
  await page.getByLabel('Flag').fill('BASHLAB{not_the_flag}');
  await page.getByRole('button', { name: 'Submit flag' }).click();
  await expect(page.getByText('Wrong flag. Check it and try again.')).toBeVisible();
  const { data } = await adminClient.from('progress').select('status').eq('user_id', users.learner.id);
  expect(data ?? []).toHaveLength(0);
});

test('the API refuses "done" without the flag, rejects the flag of another lab, and never saves a wrong one', async () => {
  const { signIn, forBackend } = require('../support/apiClient');
  const learner = forBackend((await signIn(users.learner.email, users.learner.password)).access_token);
  const { data: lesson } = await adminClient.from('lessons').select('id').eq('slug', 'terminal-fundamentals-navigation').single();

  const direct = await learner('PUT', `/api/progress/${lesson.id}`, { status: 'done' });
  expect([direct.status, direct.data.error.code]).toEqual([403, 'FLAG_REQUIRED']);

  const otherLabFlag = await learner('POST', `/api/labs/${lesson.id}/flag`, { flag: 'BASHLAB{tail_reads_the_end_of_a_file}' });
  expect([otherLabFlag.status, otherLabFlag.data]).toEqual([200, { correct: false }]);

  const { data } = await adminClient.from('progress').select('status').eq('user_id', users.learner.id);
  expect(data ?? []).toHaveLength(0);

  const right = await learner('POST', `/api/labs/${lesson.id}/flag`, { flag: LAB1_FLAG });
  expect([right.status, right.data]).toEqual([200, { correct: true }]);
});

test('a lab that was never solved shows as not completed, even where the built-in data says otherwise', async ({ page }) => {
  await page.goto('/courses/shell-101/labs/2');
  await expect(page.getByRole('button', { name: 'Submit flag' })).toBeVisible();
  await expect(page.getByText(/^Objective Tasks \(0 of \d+ completed\)$/)).toBeVisible();
});

test('progress made on the course page is what the workspace shows', async ({ page }) => {
  const { data: lesson } = await adminClient.from('lessons').select('id').eq('slug', 'terminal-fundamentals-navigation').single();
  await adminClient.from('progress').insert({ user_id: users.learner.id, lesson_id: lesson.id, status: 'done' });
  await page.goto(LAB);
  await expect(page.getByText('Objective Tasks (4 of 4 completed)')).toBeVisible();
});

test('the workspace lists exactly the published labs of the course, in order', async ({ page }) => {
  const { data: course } = await adminClient.from('courses').select('id').eq('slug', 'shell-101').single();
  const { data: chapters } = await adminClient.from('chapters').select('id').eq('course_id', course.id);
  const { count } = await adminClient.from('lessons').select('id', { count: 'exact', head: true })
    .in('chapter_id', chapters.map((chapter) => chapter.id)).eq('status', 'published');
  expect(count).toBeGreaterThan(0);
  await page.goto('/courses/shell-101/labs/1');
  await expect(page.getByText(`1 / ${count}`)).toBeVisible();
  await page.getByRole('button', { name: 'Lessons' }).click();
  await expect(page.locator('ol > li')).toHaveCount(count);
  await page.goto(`/courses/shell-101/labs/${count + 1}`);
  await expect(page.getByText('404')).toBeVisible();
});

test('legacy Markdown lessons show their content and are not shown as completed', async ({ page }) => {
  const course = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    slug: 'legacy-preview',
    title: 'Legacy Preview',
    description: '',
    level: 'beginner',
    category: 'testing',
    duration_minutes: 10,
    status: 'published',
    sort_order: 0,
    chapters: [{
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      title: 'Legacy lessons',
      sort_order: 0,
      lessons: [{
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        slug: 'legacy-markdown',
        title: 'Legacy Markdown',
        status: 'published',
        sort_order: 0,
        objectives: [],
        content_md: '# Legacy Markdown\n\nThis lesson remains readable from its Markdown content.',
        test_template: null,
        lesson_content: null,
      }],
    }],
  };
  await page.route('**/rest/v1/courses*', (route) => route.fulfill({ json: [course] }));
  await page.route('**/rest/v1/progress*', (route) => route.fulfill({ json: [] }));

  await page.goto('/courses/legacy-preview/labs/1');
  await expect(page.getByLabel('Lesson content').getByRole('heading', { name: 'Legacy Markdown' })).toBeVisible();
  await expect(page.getByText('This lesson remains readable from its Markdown content.')).toBeVisible();
  await expect(page.getByText(/Objective Tasks/)).toHaveCount(0);
  await expect(page.getByText('Completed', { exact: true })).toHaveCount(0);
});
