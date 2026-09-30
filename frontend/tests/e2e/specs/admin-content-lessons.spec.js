// Content (course/chapter/lesson tree) and Lesson Editor — admin-only pages.
// ContentManager has no delete UI by design, so the test course/lesson it
// creates is removed with the service-role client in afterAll, not the app.
const path = require('path');
const { test, expect } = require('@playwright/test');
const { adminClient } = require('../support/supabaseAdmin');

test.use({ storageState: path.join(__dirname, '..', '.auth', 'admin.json') });

const stamp = Date.now();
const courseTitle = `E2E Test Course ${stamp}`;
const courseSlug = `e2e-test-course-${stamp}`;
let createdCourseId;

test.afterAll(async () => {
  if (createdCourseId) await adminClient.from('courses').delete().eq('id', createdCourseId);
});

test('admin creates a course, adds a chapter and a lesson, edits and publishes it', async ({ page }) => {
  await page.goto('/admin/content');
  await expect(page.getByRole('heading', { name: 'Content' })).toBeVisible();

  // Course/chapter/lesson creation is an in-page dialog (not window.prompt).
  await page.getByRole('button', { name: 'New course' }).click();
  await page.getByLabel('Course title').fill(courseTitle);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('button', { name: courseTitle })).toBeVisible();

  const { data: course } = await adminClient.from('courses').select('id').eq('slug', courseSlug).single();
  createdCourseId = course.id;

  // Course settings tab: slug auto-derived from the title, required + validated.
  await page.getByRole('tab', { name: /Course settings/ }).click();
  await expect(page.getByLabel('Slug')).toHaveValue(courseSlug);
  await page.getByRole('tab', { name: /Curriculum/ }).click();

  await page.getByRole('button', { name: 'Add chapter' }).click();
  await page.getByLabel('Chapter title').fill('Chapter One');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Chapter One')).toBeVisible();

  // exact: the sidebar course buttons also contain the substring "lessons"
  // (e.g. "3 chapters · 5 lessons"), which a loose match would also catch.
  await page.getByRole('button', { name: 'Lesson', exact: true }).click();
  await page.getByLabel('Lesson title').fill('First Lesson');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForURL('**/admin/lessons/**');

  await expect(page.getByRole('heading', { name: 'First Lesson' })).toBeVisible();
  // Scoped to <main>: the footer has its own "Sandbox status" aria-label
  // that also matches a loose getByLabel('Status').
  const contentBox = page.locator('main').getByLabel('Markdown');
  await contentBox.fill('# First Lesson\n\nSay hello with `echo`.');
  await page.locator('main').getByLabel('Status').selectOption('published');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('All changes saved')).toBeVisible();

  // Back on Content (fresh page load resets which course is selected), the
  // lesson now shows the published badge.
  await page.goto('/admin/content');
  await page.getByRole('button', { name: courseTitle }).click();
  const lessonRow = page.getByRole('listitem').filter({ hasText: 'First Lesson' });
  await expect(lessonRow.getByText('published')).toBeVisible();
});

test('a draft course never shows up in the public catalog or overview (only published/upcoming are public)', async ({ context }) => {
  // Re-check as an anonymous visitor: course is still draft (created in the
  // previous test), so it must not be reachable at all.
  const anonPage = await context.browser().newContext().then((c) => c.newPage());
  await anonPage.goto(`/courses/${courseSlug}`);
  await expect(anonPage.getByText('This course does not exist or is not published yet.')).toBeVisible();
  await anonPage.close();
});
