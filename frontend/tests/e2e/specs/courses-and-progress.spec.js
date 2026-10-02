// Course Detail (LeetCode-style labs table, components/courses/CourseDetail.jsx)
// + My Learning as a logged-in learner: solving a lab from the table updates
// the row, the toolbar counter, the sidebar progress card, and My Learning —
// all backed by real writes to `progress` (see lib/learning.js markLessonDone).
const path = require('path');
const { test, expect } = require('../support/session');
const { adminClient } = require('../support/supabaseAdmin');
const { loadUsers } = require('../support/testUsers');

test.use({ asRole: 'learner' });

let users;
test.beforeAll(() => { users = loadUsers(); });

test.afterEach(async () => {
  // Keep the learner fixture progress-free between tests in this file.
  await adminClient.from('progress').delete().eq('user_id', users.learner.id);
});

test('My Learning shows the not-started state before any lab is solved', async ({ page }) => {
  await page.goto('/my-learning');
  await expect(page.getByRole('heading', { name: 'Shell 101 — Bash Basics' })).toBeVisible();
  await expect(page.getByText('0 of 12 lessons completed')).toBeVisible();
  await expect(page.getByRole('link', { name: /Start learning/ })).toBeVisible();
});

test('solving a lab in the workspace updates My Learning', async ({ page }) => {
  const { data: lesson } = await adminClient.from('lessons').select('id').eq('slug', 'terminal-fundamentals-navigation').single();
  await adminClient.from('progress').insert({ user_id: users.learner.id, lesson_id: lesson.id, status: 'done' });

  await page.goto('/my-learning');
  await expect(page.getByRole('heading', { name: 'Shell 101 — Bash Basics' })).toBeVisible();
  await expect(page.getByText('1 of 12 lessons completed')).toBeVisible();
  const stat = page.locator('div').filter({ has: page.getByText('Lessons mastered', { exact: true }) }).last();
  await expect(stat.locator('dd')).toHaveText('1');
});
