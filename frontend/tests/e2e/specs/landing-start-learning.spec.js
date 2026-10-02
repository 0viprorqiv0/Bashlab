// The "Start learning" buttons (landing hero and the /courses catalog): guests
// are sent to log in (and come back to the course afterwards), signed-in
// learners go straight into their first unfinished lab (the course page redirects).
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

  test('Start learning goes straight into the course labs, no login screen', async ({ page }) => {
    await page.goto('/');
    await startLearning(page).click();
    await page.waitForURL('**/courses/shell-101/labs/*');
    await expect(page.getByRole('button', { name: 'Submit flag' })).toBeVisible();
  });

  test('Start learning in the course catalog goes straight into the course labs', async ({ page }) => {
    await page.goto('/courses');
    await startLearning(page).click();
    await page.waitForURL('**/courses/shell-101/labs/*');
    await expect(page.getByRole('button', { name: 'Submit flag' })).toBeVisible();
  });
});
