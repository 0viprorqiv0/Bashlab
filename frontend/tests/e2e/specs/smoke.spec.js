// Unauthenticated visitor: pages that must work with no session, and the
// guards that must kick anonymous visitors off pages that need one.
const { test, expect } = require('@playwright/test');

test.describe('anonymous visitor', () => {
  test('landing page renders', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /curiosity/i })).toBeVisible();
  });

  test('unknown route shows 404', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');
    expect(response.status()).toBe(404);
    await expect(page.getByText(/page could not be found/i)).toBeVisible();
  });

  test('course catalog lists the published Shell 101 course; draft courses are invisible (RLS, not a UI filter)', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.getByRole('heading', { name: 'Shell 101 — Bash Basics' })).toBeVisible();
    // shell-201 and linux-security are `status = 'draft'`: the courses RLS
    // policy (using status = 'published' or is_admin()) means an anonymous
    // request never gets those rows back at all, so "Coming next" never
    // renders for a logged-out visitor — this isn't a component-level filter.
    await expect(page.getByText('Coming next')).toHaveCount(0);
  });

  test('course overview is publicly readable but progress is gated behind login', async ({ page }) => {
    await page.goto('/courses/shell-101');
    await expect(page.getByRole('heading', { name: 'Shell 101 — Bash Basics' })).toBeVisible();
    await expect(page.getByText('Log in to track your progress through this course.')).toBeVisible();
    await expect(page.getByRole('link', { name: /log in to start/i })).toBeVisible();
  });

  test('/my-learning redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/my-learning');
    await page.waitForURL('**/login');
  });

  test('/admin redirects to /login when not authenticated (guard runs before the 403 branch)', async ({ page }) => {
    await page.goto('/admin/content');
    await page.waitForURL('**/login');
  });
});
