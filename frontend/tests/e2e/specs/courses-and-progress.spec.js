// Course progress as a logged-in learner. A lab is completed by submitting its
// flag (the server writes the progress), and My Learning and the lab workspace
// read that progress back from the database.
const { test, expect } = require('../support/session');
const { adminClient } = require('../support/supabaseAdmin');
const { signIn, forBackend } = require('../support/apiClient');
const { loadUsers } = require('../support/testUsers');

test.use({ asRole: 'learner' });

let users;
test.beforeAll(() => { users = loadUsers(); });

test.afterEach(async () => {
  // Keep the learner fixture progress-free between tests in this file.
  await adminClient.from('progress').delete().eq('user_id', users.learner.id);
});

// How many labs Shell 101 has right now (so the tests do not hard-code it).
async function publishedLabCount() {
  const { data: course } = await adminClient.from('courses').select('id').eq('slug', 'shell-101').single();
  const { data: chapters } = await adminClient.from('chapters').select('id').eq('course_id', course.id);
  const { count } = await adminClient.from('lessons').select('id', { count: 'exact', head: true })
    .in('chapter_id', chapters.map((chapter) => chapter.id)).eq('status', 'published');
  return count;
}

test('a fresh learner opening the course lands in the first lab, with nothing solved', async ({ page }) => {
  const total = await publishedLabCount();
  await page.goto('/courses/shell-101');
  await page.waitForURL('**/courses/shell-101/labs/1');
  await expect(page.getByText(`1 / ${total}`)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit flag' })).toBeVisible();
});

test('My Learning shows the not-started state before any lab is solved', async ({ page }) => {
  const total = await publishedLabCount();
  await page.goto('/my-learning');
  await expect(page.getByRole('heading', { name: 'Shell 101 — Bash Basics' })).toBeVisible();
  await expect(page.getByText(`0 of ${total} lessons completed`)).toBeVisible();
  await expect(page.getByRole('link', { name: /Start learning/ })).toBeVisible();
});

test('solving a lab with its flag updates My Learning, and the course then opens on the next lab', async ({ page }) => {
  const total = await publishedLabCount();
  const { data: lesson } = await adminClient.from('lessons').select('id').eq('slug', 'terminal-fundamentals-navigation').single();
  const learner = forBackend((await signIn(users.learner.email, users.learner.password)).access_token);
  const solved = await learner('POST', `/api/labs/${lesson.id}/flag`, { flag: 'BASHLAB{ls_dash_a_shows_hidden_files}' });
  expect([solved.status, solved.data]).toEqual([200, { correct: true }]);

  await page.goto('/my-learning');
  await expect(page.getByRole('heading', { name: 'Shell 101 — Bash Basics' })).toBeVisible();
  await expect(page.getByText(`1 of ${total} lessons completed`)).toBeVisible();
  const stat = page.locator('div').filter({ has: page.getByText('Lessons mastered', { exact: true }) }).last();
  await expect(stat.locator('dd')).toHaveText('1');

  // The solved lab is skipped: the course sends the learner to the first lab that is not solved.
  await page.goto('/courses/shell-101');
  await page.waitForURL('**/courses/shell-101/labs/*');
  await expect(page.getByRole('button', { name: 'Submit flag' })).toBeVisible();
});
