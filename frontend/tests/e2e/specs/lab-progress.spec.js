// The Shell 101 lab workspace (static UI) saves real progress: finishing a lab
// writes through PUT /api/progress/:lessonId, and the workspace, the course
// page and My Learning all read it back from the database.
const path = require('path');
const { test, expect } = require('@playwright/test');
const { adminClient } = require('../support/supabaseAdmin');
const { loadUsers } = require('../support/testUsers');

test.use({ storageState: path.join(__dirname, '..', '.auth', 'learner.json') });

let users;
test.beforeAll(() => { users = loadUsers(); });
test.afterEach(async () => { await adminClient.from('progress').delete().eq('user_id', users.learner.id); });

test('Check Solution saves progress and survives a reload; other pages agree', async ({ page }) => {
  await page.goto('/courses/shell-101/labs/1');
  await expect(page.getByRole('button', { name: 'Check Solution' })).toBeVisible();

  const saved = page.waitForResponse((res) => res.url().includes('/api/progress/') && res.request().method() === 'PUT');
  await page.getByRole('button', { name: 'Check Solution' }).click();
  expect((await saved).status()).toBe(204);

  const { data } = await adminClient.from('progress').select('status, lessons(slug)').eq('user_id', users.learner.id);
  expect(data).toHaveLength(1);
  expect(data[0].status).toBe('done');
  expect(data[0].lessons.slug).toBe('terminal-fundamentals-navigation');

  await page.reload();
  await expect(page.getByText('Objective Tasks (4 of 4 completed)')).toBeVisible();

  await page.goto('/courses/shell-101');
  await expect(page.getByText('1 / 12 Solved')).toBeVisible();
});

test('a lab that was never solved shows as not completed, even where the built-in data says otherwise', async ({ page }) => {
  await page.goto('/courses/shell-101/labs/2');
  await expect(page.getByRole('button', { name: 'Check Solution' })).toBeVisible();
  await expect(page.getByText(/^Objective Tasks \(0 of \d+ completed\)$/)).toBeVisible();
});

test('progress made on the course page is what the workspace shows', async ({ page }) => {
  const { data: lesson } = await adminClient.from('lessons').select('id').eq('slug', 'terminal-fundamentals-navigation').single();
  await adminClient.from('progress').insert({ user_id: users.learner.id, lesson_id: lesson.id, status: 'done' });
  await page.goto('/courses/shell-101/labs/1');
  await expect(page.getByText('Objective Tasks (4 of 4 completed)')).toBeVisible();
});
