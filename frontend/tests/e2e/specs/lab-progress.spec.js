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

test('Check Solution saves progress and survives a reload; other pages agree', async ({ page }) => {
  await page.goto('/courses/shell-101/labs/1');
  await expect(page.getByRole('button', { name: 'Check Solution' })).toBeVisible();

  const saved = page.waitForResponse((res) => {
    if (!res.url().includes('/api/progress/') || res.request().method() !== 'PUT') return false;
    try {
      const body = JSON.parse(res.request().postData() || '{}');
      return body.status === 'done';
    } catch {
      return false;
    }
  });
  await page.getByRole('button', { name: 'Check Solution' }).click();
  expect((await saved).status()).toBe(204);

  const { data } = await adminClient.from('progress').select('status, lessons(slug)').eq('user_id', users.learner.id);
  expect(data).toHaveLength(1);
  expect(data[0].status).toBe('done');
  expect(data[0].lessons.slug).toBe('terminal-fundamentals-navigation');

  await page.reload();
  await expect(page.getByText('Objective Tasks (4 of 4 completed)')).toBeVisible();

  await page.goto('/my-learning');
  await expect(page.getByText('1 of 12 lessons completed')).toBeVisible();
});

test('a lab that was never solved shows as not completed, even where the built-in data says otherwise', async ({ page }) => {
  await page.goto('/courses/shell-101/labs/2');
  await expect(page.getByRole('button', { name: 'Check Solution' })).toBeVisible();
  await expect(page.getByText(/^Objective Tasks \(0 of \d+ completed\)$/)).toBeVisible();
});

test('progress made in database is what the workspace shows', async ({ page }) => {
  const { data: lesson } = await adminClient.from('lessons').select('id').eq('slug', 'terminal-fundamentals-navigation').single();
  await adminClient.from('progress').insert({ user_id: users.learner.id, lesson_id: lesson.id, status: 'done' });
  await page.goto('/courses/shell-101/labs/1');
  await expect(page.getByText('Objective Tasks (4 of 4 completed)')).toBeVisible();
});

test('the workspace lists all published labs in chapter/lesson order in its drawer', async ({ page }) => {
  await page.goto('/courses/shell-101/labs/1');
  await expect(page.getByText('1 / 12')).toBeVisible();
  await page.getByRole('button', { name: 'Lessons' }).click();
  await expect(page.getByRole('link', { name: /Terminal Fundamentals/ }).first()).toBeVisible();
  await expect(page.locator('ol > li')).toHaveCount(12);
  await page.goto('/courses/shell-101/labs/13');
  await expect(page.getByText('404')).toBeVisible();
});
