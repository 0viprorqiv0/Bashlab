// The Shell 101 lab workspace (static UI) saves real progress: finishing a lab
// writes through PUT /api/progress/:lessonId, and the workspace, the course
// page and My Learning all read it back from the database.
const path = require('path');
const { test, expect } = require('@playwright/test');
const { adminClient } = require('../support/supabaseAdmin');
const { loadUsers } = require('../support/testUsers');

test.use({ storageState: path.join(__dirname, '..', '.auth', 'learner.json') });

let users;
test.beforeAll(() => { users = loadUsers(); });
test.afterEach(async () => { await adminClient.from('progress').delete().eq('user_id', users.learner.id); });

test('Check Solution saves progress and survives a reload; other pages agree', async ({ page }) => {
  await page.goto('/courses/shell-101/labs/1');
  await expect(page.getByRole('button', { name: 'Check Solution' })).toBeVisible();

  const saved = page.waitForResponse((res) => res.url().includes('/api/progress/') && res.request().method() === 'PUT');
  await page.getByRole('button', { name: 'Check Solution' }).click();
  expect((await saved).status()).toBe(204);

  const { data } = await adminClient.from('progress').select('status, lessons(slug)').eq('user_id', users.learner.id);
  expect(data).toHaveLength(1);
  expect(data[0].status).toBe('done');
  expect(data[0].lessons.slug).toBe('terminal-fundamentals-navigation');

  await page.reload();
  await expect(page.getByText('Objective Tasks (4 of 4 completed)')).toBeVisible();

  await page.goto('/courses/shell-101');
  await expect(page.getByText('1 / 12 Solved')).toBeVisible();
});

test('a lab that was never solved shows as not completed, even where the built-in data says otherwise', async ({ page }) => {
  await page.goto('/courses/shell-101/labs/2');
  await expect(page.getByRole('button', { name: 'Check Solution' })).toBeVisible();
  await expect(page.getByText(/^Objective Tasks \(0 of \d+ completed\)$/)).toBeVisible();
});

test('progress made on the course page is what the workspace shows', async ({ page }) => {
  const { data: lesson } = await adminClient.from('lessons').select('id').eq('slug', 'terminal-fundamentals-navigation').single();
  await adminClient.from('progress').insert({ user_id: users.learner.id, lesson_id: lesson.id, status: 'done' });
  await page.goto('/courses/shell-101/labs/1');
  await expect(page.getByText('Objective Tasks (4 of 4 completed)')).toBeVisible();
});

test('the workspace lists the same labs as the course page, in the same order', async ({ page }) => {
  await page.goto('/courses/shell-101');
  await expect(page.locator('tbody tr').first()).toBeVisible();
  const rows = await page.locator('tbody tr').count();
  expect(rows).toBeGreaterThan(0);
  await page.goto('/courses/shell-101/labs/1');
  await expect(page.getByText(`1 / ${rows}`)).toBeVisible();
  await page.getByRole('button', { name: 'Lessons' }).click();
  await expect(page.getByRole('link', { name: /Terminal Fundamentals/ }).first()).toBeVisible();
  await expect(page.locator('ol > li')).toHaveCount(rows);
  await page.goto(`/courses/shell-101/labs/${rows + 1}`);
  await expect(page.getByText('404')).toBeVisible();
});

test('legacy Markdown lessons show their content and cannot be marked complete without checks', async ({ page }) => {
  const course = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    slug: 'legacy-preview',
    title: 'Legacy Preview',
    description: '',
    level: 'beginner',
    category: 'testing',
    duration_minutes: 10,
    status: 'published',
    sort_order: 0,
    chapters: [{
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      title: 'Legacy lessons',
      sort_order: 0,
      lessons: [{
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        slug: 'legacy-markdown',
        title: 'Legacy Markdown',
        status: 'published',
        sort_order: 0,
        objectives: [],
        content_md: '# Legacy Markdown\n\nThis lesson remains readable from its Markdown content.',
        test_template: null,
        lesson_content: null,
      }],
    }],
  };
  await page.route('**/rest/v1/courses*', (route) => route.fulfill({ json: [course] }));
  await page.route('**/rest/v1/progress*', (route) => route.fulfill({ json: [] }));

  await page.goto('/courses/legacy-preview/labs/1');
  await expect(page.getByLabel('Lesson content').getByRole('heading', { name: 'Legacy Markdown' })).toBeVisible();
  await expect(page.getByText('This lesson remains readable from its Markdown content.')).toBeVisible();
  await expect(page.getByText(/Objective Tasks/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Check solution' })).toBeDisabled();
  await expect(page.getByText('Completed', { exact: true })).toHaveCount(0);
});
