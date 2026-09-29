// Course Overview + My Learning as a logged-in learner: lesson unlock order,
// progress percentage, and that both pages reflect a real `progress` row
// the moment it changes — not cached/mocked data.
const path = require('path');
const { test, expect } = require('@playwright/test');
const { adminClient } = require('../support/supabaseAdmin');
const { signIn, forToken } = require('../support/apiClient');
const { loadUsers } = require('../support/testUsers');

test.use({ storageState: path.join(__dirname, '..', '.auth', 'learner.json') });

let users;
let firstLessonId;

test.beforeAll(async () => {
  users = loadUsers();
  const { data } = await adminClient.from('lessons').select('id').eq('slug', 'where-am-i').single();
  firstLessonId = data.id;
});

test.afterEach(async () => {
  // Keep the learner fixture progress-free between tests in this file.
  await adminClient.from('progress').delete().eq('user_id', users.learner.id);
});

test('a fresh learner sees the first lesson unlocked and everything after it locked', async ({ page }) => {
  await page.goto('/courses/shell-101');
  await expect(page.getByText('0%')).toBeVisible();
  await expect(page.getByText('Log in to track your progress')).toHaveCount(0);

  const firstRow = page.locator('li', { hasText: 'Where am I?' });
  await expect(firstRow.getByText('Up next')).toBeVisible();
  const secondRow = page.locator('li', { hasText: 'Look around with ls' });
  await expect(secondRow.getByText('Locked')).toBeVisible();
});

test('My Learning shows the not-started state before any lesson is completed', async ({ page }) => {
  await page.goto('/my-learning');
  await expect(page.getByRole('heading', { name: 'Shell 101 — Bash Basics' })).toBeVisible();
  await expect(page.getByText('0 of 9 lessons completed')).toBeVisible();
  await expect(page.getByRole('link', { name: /Start learning/ })).toBeVisible();
});

test('completing the first lesson unlocks the second and updates progress everywhere', async ({ page }) => {
  const session = await signIn(users.learner.email, users.learner.password);
  const api = forToken(session.access_token);
  const write = await api.insert('progress', {
    user_id: users.learner.id,
    lesson_id: firstLessonId,
    status: 'done',
    completed_at: new Date().toISOString(),
  });
  expect(write.status).toBe(201);

  await page.goto('/courses/shell-101');
  await expect(page.getByText('11%')).toBeVisible(); // round(1/9 * 100)
  const firstRow = page.locator('li', { hasText: 'Where am I?' });
  await expect(firstRow.getByText('Completed')).toBeVisible();
  const secondRow = page.locator('li', { hasText: 'Look around with ls' });
  await expect(secondRow.getByText('Up next')).toBeVisible();

  await page.goto('/my-learning');
  await expect(page.getByText('1 of 9 lessons completed')).toBeVisible();
  const stat = page.locator('div').filter({ has: page.getByText('Lessons mastered', { exact: true }) }).last();
  await expect(stat.locator('dd')).toHaveText('1');
});
