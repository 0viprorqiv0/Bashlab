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

  test('course catalog lists the published Shell 101 course and the upcoming teasers', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.getByRole('heading', { name: 'Shell 101 — Bash Basics' })).toBeVisible();
    // shell-201/linux-security are `status = 'upcoming'` (backend/db/migrations/013_public_upcoming_courses.sql):
    // the courses RLS policy explicitly allows 'upcoming' to be publicly
    // readable as a teaser, unlike 'draft'/'hidden' which stay admin-only.
    await expect(page.getByText('Coming next')).toBeVisible();
    await expect(page.getByText('Shell 201 — Pipelines & Streams')).toBeVisible();
  });

  test('an upcoming course page is publicly reachable (teaser) but has no labs yet', async ({ page }) => {
    await page.goto('/courses/shell-201');
    await expect(page.getByRole('heading', { name: 'Shell 201 — Pipelines & Streams' })).toBeVisible();
    await expect(page.getByText('0 / 0 Solved')).toBeVisible();
  });

  test('a published course page lists its labs publicly, with progress at 0%', async ({ page }) => {
    await page.goto('/courses/shell-101');
    await expect(page.getByRole('heading', { name: 'Shell 101 — Bash Basics' })).toBeVisible();
    await expect(page.getByText('0 / 12 (0%)')).toBeVisible();
    await expect(page.getByText('Terminal Fundamentals & Navigation')).toBeVisible();
  });

  test('/my-learning redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/my-learning');
    await page.waitForURL('**/login**');
  });

  test('/admin redirects to /login when not authenticated (guard runs before the 403 branch)', async ({ page }) => {
    await page.goto('/admin/content');
    await page.waitForURL('**/login**');
  });

  test('opening a lab workspace directly redirects to /login with a next back to that lab', async ({ page }) => {
    await page.goto('/courses/shell-101/labs/1');
    await page.waitForURL('**/login**');
    expect(new URL(page.url()).searchParams.get('next')).toBe('/courses/shell-101/labs/1');
  });

  test('clicking Start on the course page redirects to /login instead of opening the lab', async ({ page }) => {
    await page.goto('/courses/shell-101');
    await page.getByRole('link', { name: /^Start lab Terminal Fundamentals/ }).click();
    await page.waitForURL('**/login**');
  });
});
