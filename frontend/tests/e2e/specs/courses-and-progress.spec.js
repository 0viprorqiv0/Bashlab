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

test('a fresh learner sees all 12 labs, none solved yet', async ({ page }) => {
  await page.goto('/courses/shell-101');
  await expect(page.getByText('0 / 12 (0%)')).toBeVisible();
  await expect(page.getByText('0 / 12 Solved')).toBeVisible();
  const firstRow = page.locator('tr', { hasText: 'Terminal Fundamentals & Navigation' });
  await expect(firstRow.getByTitle('Not Started')).toBeVisible();
});

test('My Learning shows the not-started state before any lab is solved', async ({ page }) => {
  await page.goto('/my-learning');
  await expect(page.getByRole('heading', { name: 'Shell 101 — Bash Basics' })).toBeVisible();
  await expect(page.getByText('0 of 12 lessons completed')).toBeVisible();
  await expect(page.getByRole('link', { name: /Start learning/ })).toBeVisible();
});

test('solving a lab from the table updates the row, the counters, and My Learning', async ({ page }) => {
  await page.goto('/courses/shell-101');
  const row = page.locator('tr', { hasText: 'Terminal Fundamentals & Navigation' });

  // toggleSolveStatus (CourseDetail.jsx) updates the row optimistically
  // *then* awaits the `progress` upsert — wait for that request to actually
  // land before navigating away, instead of racing it.
  const write = page.waitForResponse((res) => res.url().includes('/api/progress/') && res.request().method() === 'PUT');
  await row.getByTitle('Not Started').click();
  await write;

  await expect(row.getByTitle('Completed (click to toggle)')).toBeVisible();
  await expect(page.getByText('1 / 12 Solved')).toBeVisible();
  await expect(page.getByText('1 / 12 (8%)')).toBeVisible(); // round(1/12 * 100)

  await page.goto('/my-learning');
  await expect(page.getByRole('heading', { name: 'Shell 101 — Bash Basics' })).toBeVisible();
  await expect(page.getByText('1 of 12 lessons completed')).toBeVisible();
  const stat = page.locator('div').filter({ has: page.getByText('Lessons mastered', { exact: true }) }).last();
  await expect(stat.locator('dd')).toHaveText('1');
});
