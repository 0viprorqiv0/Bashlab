// Admin Content + Lesson Editor, and — the point of the lesson_content
// contract — that whatever the admin authors is exactly what learners see in
// the course page and lab workspace (same table, same order, same text).
// ContentManager has no delete UI by design, so the test course it creates is
// removed with the service-role client in afterAll.
const path = require('path');
const { test, expect, roleContext } = require('../support/session');
const { adminClient } = require('../support/supabaseAdmin');

test.use({ asRole: 'admin' });
test.describe.configure({ mode: 'serial' });

const stamp = Date.now();
const courseTitle = `E2E Test Course ${stamp}`;
const courseSlug = `e2e-test-course-${stamp}`;
let createdCourseId;

test.afterAll(async () => {
  if (createdCourseId) await adminClient.from('courses').delete().eq('id', createdCourseId);
});

async function openCourse(page) {
  await page.goto('/admin/content');
  await page.getByRole('button', { name: courseTitle }).click();
}

test('admin creates a course, a chapter and a lesson through the dialogs', async ({ page }) => {
  await page.goto('/admin/content');
  await expect(page.getByRole('heading', { name: 'Content' })).toBeVisible();

  await page.getByRole('button', { name: 'New course' }).click();
  await page.getByLabel('Course title').fill(courseTitle);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('button', { name: courseTitle })).toBeVisible();

  const { data: course } = await adminClient.from('courses').select('id').eq('slug', courseSlug).single();
  createdCourseId = course.id;

  await page.getByRole('tab', { name: /Course settings/ }).click();
  await expect(page.getByLabel('Slug')).toHaveValue(courseSlug);
  await page.getByRole('tab', { name: /Curriculum/ }).click();

  await page.getByRole('button', { name: 'Add chapter' }).click();
  await page.getByLabel('Chapter title').fill('Chapter One');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Chapter One')).toBeVisible();

  // exact: the sidebar course buttons also contain "lessons" ("N chapters · M lessons").
  await page.getByRole('button', { name: 'Lesson', exact: true }).click();
  await page.getByLabel('Lesson title').fill('First Lesson');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForURL('**/admin/lessons/**');
  await expect(page.getByRole('heading', { name: 'First Lesson.', exact: true })).toBeVisible();
});

test('the database refuses to publish an unfinished lab, and says why', async ({ page }) => {
  await openCourse(page);
  await page.getByRole('link', { name: 'Edit' }).first().click();
  await page.waitForURL('**/admin/lessons/**');

  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.locator('main').getByLabel('Status').selectOption('published');
  await page.getByRole('button', { name: 'Save' }).click();
  // Client-side check first (same rules as the database trigger)...
  await expect(page.getByRole('status')).toContainText('Cannot publish: add a short objective.');
  // ...and the trigger really is the backstop when the client is bypassed.
  const { data: lesson } = await adminClient.from('lessons').select('id').eq('slug', 'first-lesson').single();
  const { error } = await adminClient.from('lessons').update({ status: 'published' }).eq('id', lesson.id);
  expect(error?.message).toContain('cannot publish');
});

test('admin fills the structured form, previews it, saves and publishes; the lesson row shows published', async ({ page }) => {
  await openCourse(page);
  await page.getByRole('link', { name: 'Edit' }).first().click();
  await page.waitForURL('**/admin/lessons/**');

  const form = page.getByLabel('Lesson content');
  await form.getByLabel('Short objective').fill('Print the working directory');
  await form.getByLabel('Track', { exact: true }).fill('Core Commands');
  await form.getByLabel('Tag', { exact: true }).fill('Navigation');
  await form.getByLabel('Difficulty').selectOption('easy');
  await form.getByLabel('Focus commands').fill('pwd, ls');
  await form.getByRole('textbox', { name: 'Scenario', exact: true }).fill('You just logged in to a **new** server and need to know where you are.');
  await form.getByRole('button', { name: 'Add step' }).click();
  await form.getByRole('textbox', { name: 'Step 1', exact: true }).fill('Run `pwd` to print where you are.');
  await form.getByRole('button', { name: 'Add row' }).click();
  await form.getByLabel('Command', { exact: true }).fill('pwd');
  await form.getByLabel('Description').fill('Print working directory');
  await form.getByRole('button', { name: 'Add example' }).click();
  await form.getByLabel('Example title').fill('Where am I?');
  await form.getByLabel('Code', { exact: true }).fill('pwd');
  await form.getByLabel('Explanation').fill('Shows the absolute path.');
  await form.getByRole('textbox', { name: 'Hint', exact: true }).fill('It is a very short command.');

  // The preview pane mirrors what the learner will get, live and unsaved.
  const preview = page.getByLabel('Preview', { exact: true });
  await expect(preview).toContainText('Mission Scenario');
  await expect(preview).toContainText('Objective Tasks (0 of 1 completed)');
  await expect(preview).toContainText('Print working directory');
  await expect(preview).toContainText('Where am I?');

  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.locator('main').getByLabel('Status').selectOption('published');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('All changes saved')).toBeVisible();

  const { data } = await adminClient.from('lessons').select('status, lesson_content').eq('slug', 'first-lesson').single();
  expect(data.status).toBe('published');
  expect(data.lesson_content.steps).toHaveLength(1);
  expect(data.lesson_content.steps[0].text).toBe('Run `pwd` to print where you are.');
  expect(data.lesson_content.commands).toEqual(['pwd', 'ls']);

  await openCourse(page);
  const row = page.getByRole('listitem').filter({ hasText: 'First Lesson' });
  await expect(row.getByText('published')).toBeVisible();
  await expect(row).toContainText('pwd · ls');
});

test('reordering steps and reloading keeps the order; leaving with unsaved edits asks first', async ({ page }) => {
  await openCourse(page);
  await page.getByRole('link', { name: 'Edit' }).first().click();
  await page.waitForURL('**/admin/lessons/**');
  const form = page.getByLabel('Lesson content');

  await form.getByRole('button', { name: 'Add step' }).click();
  await form.getByRole('textbox', { name: 'Step 2', exact: true }).fill('Run `ls` to see what is here.');
  await form.getByRole('button', { name: 'Move step 2 up' }).click();
  await expect(form.getByRole('textbox', { name: 'Step 1', exact: true })).toHaveValue('Run `ls` to see what is here.');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('All changes saved')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Lesson content').getByRole('textbox', { name: 'Step 1', exact: true })).toHaveValue('Run `ls` to see what is here.');
  await expect(page.getByLabel('Lesson content').getByRole('textbox', { name: 'Step 2', exact: true })).toHaveValue('Run `pwd` to print where you are.');

  // Unsaved edit -> the back link asks for confirmation; dismissing keeps us here.
  await page.getByLabel('Lesson content').getByLabel('Short objective').fill('Changed but not saved');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('link', { name: /Content/ }).first().click();
  await expect(page).toHaveURL(/\/admin\/lessons\//);
  await expect(page.getByLabel('Lesson content').getByLabel('Short objective')).toHaveValue('Changed but not saved');
});

test('a draft course is invisible to learners even though its lesson is published', async ({ browser }) => {
  const anon = await browser.newContext();
  const page = await anon.newPage();
  await page.goto(`/courses/${courseSlug}`);
  await expect(page.getByText('This course does not exist or is not published yet.')).toBeVisible();
  await anon.close();
});

test('once the course is published, learners see the admin-authored lab — same title, track, difficulty, commands and text', async ({ page, browser }) => {
  await openCourse(page);
  await page.getByRole('tab', { name: /Course settings/ }).click();
  await page.getByLabel('Status').first().selectOption('published');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved.')).toBeVisible();

  // Public course page: the lab appears in the table the admin sees in Content.
  const anon = await browser.newContext();
  const publicPage = await anon.newPage();
  await publicPage.goto(`/courses/${courseSlug}`);
  const row = publicPage.locator('tr', { hasText: 'First Lesson' });
  await expect(row).toBeVisible();
  await expect(row).toContainText('pwd');
  await expect(row).toContainText('Easy');
  await expect(publicPage.getByText('0 / 1 (0%)')).toBeVisible();
  await anon.close();

  // Lab workspace: the authored content is rendered, for a course the
  // frontend has never heard of. The course-page link (slug) lands on /labs/1.
  const { context: learner, done: closeLearner } = await roleContext(browser, 'learner');
  const lab = await learner.newPage();
  await lab.goto(`/courses/${courseSlug}`);
  await lab.getByText('First Lesson').first().click();
  await lab.waitForURL(`**/courses/${courseSlug}/labs/1`);
  await expect(lab.getByText('Mission Scenario')).toBeVisible();
  await expect(lab.getByText('You just logged in to a')).toBeVisible();
  await expect(lab.getByText('Objective Tasks (0 of 2 completed)')).toBeVisible();
  await expect(lab.getByText('Print working directory')).toBeVisible();
  await expect(lab.getByText('Where am I?', { exact: true })).toBeVisible();
  await expect(lab.getByRole('button', { name: 'Check Solution' })).toBeVisible();
  await lab.goto(`/courses/${courseSlug}/labs/first-lesson`); // a slug also works and normalises to the number
  await lab.waitForURL(`**/courses/${courseSlug}/labs/1`);
  await lab.goto(`/courses/${courseSlug}/labs/2`);
  await expect(lab.getByText('404')).toBeVisible();
  await closeLearner();
});

test('unpublishing the lesson in the editor removes it from the learner course page immediately', async ({ page, browser }) => {
  await openCourse(page);
  await page.getByRole('link', { name: 'Edit' }).first().click();
  await page.waitForURL('**/admin/lessons/**');
  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.locator('main').getByLabel('Status').selectOption('draft');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('All changes saved')).toBeVisible();

  const anon = await browser.newContext();
  const publicPage = await anon.newPage();
  await publicPage.goto(`/courses/${courseSlug}`);
  await expect(publicPage.getByText('0 / 0 (0%)')).toBeVisible();
  await expect(publicPage.locator('tr', { hasText: 'First Lesson' })).toHaveCount(0);
  await anon.close();
  // ...and the workspace stops serving it (404 for a signed-in learner), not just the list.
  const { context: learner, done: closeLearner } = await roleContext(browser, 'learner');
  const labPage = await learner.newPage();
  await labPage.goto(`/courses/${courseSlug}/labs/1`);
  await expect(labPage.getByText('404')).toBeVisible();
  await closeLearner();
});
