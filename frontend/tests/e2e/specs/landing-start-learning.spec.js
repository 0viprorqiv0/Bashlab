// The "Start learning" button (landing hero) and "Go to Lab" button (/courses catalog):
// - Landing "Start learning": navigates to /courses (courses catalog).
// - Course catalog "Go to Lab": redirects to the learner's active in-progress lab (or lab 1 if none).
const { test, expect } = require('../support/session');
const { adminClient } = require('../support/supabaseAdmin');
const { loadUsers } = require('../support/testUsers');

const startLearning = (page) => page.getByRole('link', { name: /^Start learning/ }).first();
const goToLab = (page) => page.getByRole('link', { name: /Go to Lab/i }).first();

test.describe('guest', () => {
  test('Start learning on landing page navigates directly to /courses', async ({ page }) => {
    await page.goto('/');
    await startLearning(page).click();
    await page.waitForURL('**/courses');
    await expect(page.getByRole('heading', { name: 'Courses.' })).toBeVisible();
  });

  test('Go to Lab in the course catalog sends a signed-out visitor to /login with next=/courses/shell-101/labs/1', async ({ page }) => {
    await page.goto('/courses');
    await expect(goToLab(page)).toBeVisible();
    await goToLab(page).click();
    await page.waitForURL('**/login**');
    expect(new URL(page.url()).searchParams.get('next')).toBe('/courses/shell-101/labs/1');
  });
});

test.describe('signed-in learner', () => {
  test.use({ asRole: 'learner' });

  let users;
  test.beforeAll(() => { users = loadUsers(); });

  test.afterEach(async () => {
    // Clean up progress between tests
    if (users?.learner?.id) {
      await adminClient.from('progress').delete().eq('user_id', users.learner.id);
    }
  });

  test('Start learning on landing page navigates directly to /courses', async ({ page }) => {
    await page.goto('/');
    await startLearning(page).click();
    await page.waitForURL('**/courses');
    await expect(page.getByRole('heading', { name: 'Courses.' })).toBeVisible();
  });

  test('Go to Lab in the course catalog redirects a fresh learner directly to lab 1', async ({ page }) => {
    await page.goto('/courses');
    await expect(goToLab(page)).toBeVisible();
    await goToLab(page).click();
    await page.waitForURL('**/courses/shell-101/labs/1');
    await expect(page.getByRole('heading', { name: /Terminal Fundamentals/i }).first()).toBeVisible();
  });

  test('Go to Lab redirects to the active in-progress lab if one exists', async ({ page }) => {
    // Mark lab 1 as done so lab 2 is next
    const { data: firstLesson } = await adminClient
      .from('lessons')
      .select('id')
      .eq('slug', 'terminal-fundamentals-navigation')
      .single();

    if (firstLesson) {
      await adminClient.from('progress').upsert({
        user_id: users.learner.id,
        lesson_id: firstLesson.id,
        status: 'done',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    await page.goto('/courses');
    await expect(goToLab(page)).toBeVisible();
    await goToLab(page).click();
    await page.waitForURL('**/courses/shell-101/labs/2');
    await expect(page.getByRole('heading', { name: /Inspecting Files/i }).first()).toBeVisible();
  });

  test('Course title link on catalog card navigates to course detail page', async ({ page }) => {
    await page.goto('/courses');
    await page.getByRole('heading', { name: 'Shell 101 — Bash Basics' }).getByRole('link').click();
    await page.waitForURL('**/courses/shell-101');
    await expect(page.getByRole('heading', { name: 'Shell 101 — Bash Basics' })).toBeVisible();
  });
});
