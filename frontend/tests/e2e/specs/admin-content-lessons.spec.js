// Admin Content Studio + Lesson Editor, and — the point of the lesson_content
// contract — that whatever the admin authors is exactly what learners see in
// the lab workspace (same table, same order, same text).
// The fixture course is created with the service-role client (the Studio edits
// existing courses) and removed again in afterAll.
const { test, expect, roleContext } = require('../support/session');
const { adminClient } = require('../support/supabaseAdmin');

test.use({ asRole: 'admin' });
test.describe.configure({ mode: 'serial' });

const stamp = Date.now();
const courseTitle = `E2E Test Course ${stamp}`;
const courseSlug = `e2e-test-course-${stamp}`;
let courseId;
let lessonId;
const editor = () => `/admin/lessons/${lessonId}`;

test.beforeAll(async () => {
  const { data: course } = await adminClient.from('courses')
    .insert({ slug: courseSlug, title: courseTitle, status: 'draft', sort_order: 999 }).select('id').single();
  courseId = course.id;
  const { data: chapter } = await adminClient.from('chapters')
    .insert({ course_id: courseId, title: 'Chapter One', sort_order: 1 }).select('id').single();
  const { data: lesson } = await adminClient.from('lessons')
    .insert({
      chapter_id: chapter.id, title: 'First Lesson', slug: 'first-lesson', status: 'draft', sort_order: 1,
      // An empty structured lab, like the one a new lesson starts as in the editor.
      lesson_content: { version: 1, short_objective: '', track: '', difficulty: 'easy', tag: '', commands: [], scenario: '', steps: [], command_syntax: [], examples: [], hint: '', solution_explanation: '' },
    }).select('id').single();
  lessonId = lesson.id;
});

test.afterAll(async () => {
  if (courseId) await adminClient.from('courses').delete().eq('id', courseId);
});

test('the Content Studio lists the chapters and lessons with their status', async ({ page }) => {
  await page.goto('/admin/content');
  await page.getByRole('button', { name: /^Select course:/ }).click();
  await page.getByRole('option', { name: courseTitle }).click();
  const explorer = page.getByRole('complementary', { name: 'Course content navigation' });
  await expect(explorer.getByText('Chapter One')).toBeVisible();
  await expect(explorer.getByText('First Lesson')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lesson Difficulty: Beginner' })).toBeVisible();
});

test('the database refuses to publish an unfinished lab, and says why', async ({ page }) => {
  await page.goto(editor());
  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.locator('main').getByRole('button', { name: 'Status: Draft' }).click();
  await page.getByRole('menuitemradio', { name: 'Published' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  // Client-side check first (same rules as the database trigger)...
  await expect(page.getByRole('status')).toContainText('Cannot publish: add a short objective.');
  // ...and the trigger really is the backstop when the client is bypassed.
  const { error } = await adminClient.from('lessons').update({ status: 'published' }).eq('id', lessonId);
  expect(error?.message).toContain('cannot publish');
});

test('admin fills the structured form, previews it, saves and publishes; the lesson row shows published', async ({ page }) => {
  await page.goto(editor());

  const form = page.getByLabel('Lesson content');
  await form.getByLabel('Short objective').fill('Print the working directory');
  await form.getByLabel('Track', { exact: true }).fill('Core Commands');
  await form.getByLabel('Tag', { exact: true }).fill('Navigation');
  await form.getByRole('button', { name: 'Difficulty: Easy' }).click();
  await form.getByRole('menuitemradio', { name: 'Easy' }).click();
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
  await page.locator('main').getByRole('button', { name: 'Status: Draft' }).click();
  await page.getByRole('menuitemradio', { name: 'Published' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('All changes saved')).toBeVisible();

  const { data } = await adminClient.from('lessons').select('status, lesson_content').eq('slug', 'first-lesson').single();
  expect(data.status).toBe('published');
  expect(data.lesson_content.steps).toHaveLength(1);
  expect(data.lesson_content.steps[0].text).toBe('Run `pwd` to print where you are.');
  expect(data.lesson_content.commands).toEqual(['pwd', 'ls']);

  await page.goto('/admin/content');
  await page.getByRole('button', { name: /^Select course:/ }).click();
  await page.getByRole('option', { name: courseTitle }).click();
  const explorer = page.getByRole('complementary', { name: 'Course content navigation' });
  await expect(explorer.getByText('First Lesson')).toBeVisible();
  await expect(explorer.getByText('PUB').first()).toBeVisible();
});

test('reordering steps and reloading keeps the order; leaving with unsaved edits asks first', async ({ page }) => {
  await page.goto(editor());
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
  const { context: learner, done } = await roleContext(browser, 'learner');
  const page = await learner.newPage();
  await page.goto(`/courses/${courseSlug}`);
  await expect(page.getByText(/does not exist|no published lessons/i)).toBeVisible();
  await done();
});

test('once the course is published, learners see the admin-authored lab: same title, commands and text', async ({ browser }) => {
  await adminClient.from('courses').update({ status: 'published' }).eq('id', courseId);

  // A signed-out visitor is sent to log in, with a way back to the course.
  const anon = await browser.newContext();
  const publicPage = await anon.newPage();
  await publicPage.goto(`/courses/${courseSlug}`);
  await publicPage.waitForURL('**/login**');
  expect(new URL(publicPage.url()).searchParams.get('next')).toBe(`/courses/${courseSlug}`);
  await anon.close();

  // A signed-in learner lands in the first unsolved lab, which renders the authored content.
  const { context: learner, done: closeLearner } = await roleContext(browser, 'learner');
  const lab = await learner.newPage();
  await lab.goto(`/courses/${courseSlug}`);
  await lab.waitForURL(`**/courses/${courseSlug}/labs/1`);
  await expect(lab.getByText('Mission Scenario')).toBeVisible();
  await expect(lab.getByText('You just logged in to a')).toBeVisible();
  await expect(lab.getByText('Objective Tasks (0 of 2 completed)')).toBeVisible();
  await expect(lab.getByText('Print working directory')).toBeVisible();
  await expect(lab.getByText('Where am I?', { exact: true })).toBeVisible();
  await expect(lab.getByRole('button', { name: 'Submit flag' })).toBeVisible();
  await lab.goto(`/courses/${courseSlug}/labs/first-lesson`); // a slug also works and normalises to the number
  await lab.waitForURL(`**/courses/${courseSlug}/labs/1`);
  await lab.goto(`/courses/${courseSlug}/labs/2`);
  await expect(lab.getByText('404')).toBeVisible();
  await closeLearner();
});

test('unpublishing the lesson in the editor stops the workspace from serving it', async ({ page, browser }) => {
  await page.goto(editor());
  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.locator('main').getByRole('button', { name: 'Status: Published' }).click();
  await page.getByRole('menuitemradio', { name: 'Draft' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('All changes saved')).toBeVisible();

  const { context: learner, done: closeLearner } = await roleContext(browser, 'learner');
  const labPage = await learner.newPage();
  await labPage.goto(`/courses/${courseSlug}/labs/1`);
  await expect(labPage.getByText('404')).toBeVisible();
  await closeLearner();
});
