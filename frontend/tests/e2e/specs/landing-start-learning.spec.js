// The "Start learning" buttons (landing hero and the /courses catalog): guests
// are sent to log in (and come back to the course afterwards), signed-in
// learners go straight to the course.
const { test, expect } = require('../support/session');

const startLearning = (page) => page.getByRole('link', { name: /^Start learning/ }).first();

test.describe('guest', () => {
  test('Start learning sends a signed-out visitor to /login with a way back to the course', async ({ page }) => {
    await page.goto('/');
    await startLearning(page).click();
    await page.waitForURL('**/login**');
    expect(new URL(page.url()).searchParams.get('next')).toBe('/courses/shell-101');
  });

  test('Start learning in the course catalog also sends a signed-out visitor to /login', async ({ page }) => {
    await page.goto('/courses');
    await startLearning(page).click();
    await page.waitForURL('**/login**');
    expect(new URL(page.url()).searchParams.get('next')).toBe('/courses/shell-101');
  });
});

test.describe('signed-in learner', () => {
  test.use({ asRole: 'learner' });

  test('Start learning goes straight to the course, no login screen', async ({ page }) => {
    await page.goto('/');
    await startLearning(page).click();
    await page.waitForURL('**/courses/shell-101');
    await expect(page.getByRole('heading', { name: 'Shell 101 — Bash Basics' })).toBeVisible();
  });

  test('Start learning in the course catalog goes straight to the course', async ({ page }) => {
    await page.goto('/courses');
    await startLearning(page).click();
    await page.waitForURL('**/courses/shell-101');
    await expect(page.getByRole('heading', { name: 'Shell 101 — Bash Basics' })).toBeVisible();
  });
});
