const path = require('path');
const { test, expect } = require('../support/session');
const { adminClient } = require('../support/supabaseAdmin');
const { loadUsers } = require('../support/testUsers');

test.use({ asRole: 'learner' });

let users;
test.beforeAll(() => {
  users = loadUsers();
});

test.afterEach(async () => {
  if (users?.learner?.id) {
    await adminClient.from('progress').delete().eq('user_id', users.learner.id);
  }
});

test('Workspace: Real interactive sandbox boot, command execution, and task completion', async ({ page }) => {
  // 1. Navigate to Lab 1
  await page.goto('/courses/shell-101/labs/1');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Terminal Fundamentals & Navigation');

  // 2. Initial state: instance is stopped
  const startBtn = page.getByRole('button', { name: 'play_arrow Start Instance' });
  await expect(startBtn).toBeVisible();

  // Take screenshot: Initial Stopped State
  await page.screenshot({ path: '/home/light/Documents/B3/web_app/Bashlab/screenshots/1-workspace-stopped.png', fullPage: true });

  // 3. Start sandbox container
  await startBtn.click();

  // 4. Wait for terminal to be active and prompt to appear
  const termInput = page.getByLabel('Terminal command');
  await expect(termInput).toBeVisible({ timeout: 15000 });
  await expect(page.locator('text=BashLab Cloud Shell (Ready)')).toBeVisible({ timeout: 15000 });

  // Take screenshot: Sandbox Booted
  await page.screenshot({ path: '/home/light/Documents/B3/web_app/Bashlab/screenshots/2-workspace-booted.png', fullPage: true });

  // 5. Execute command in real Docker/Bubblewrap container: pwd
  await termInput.fill('pwd');
  await termInput.press('Enter');
  await expect(page.getByText('/home/student').first()).toBeVisible({ timeout: 10000 });

  // 6. Execute: ls -la
  await termInput.fill('ls -la');
  await termInput.press('Enter');
  await expect(page.getByText('total').first()).toBeVisible({ timeout: 10000 });

  // 7. Execute: cd /var/log and check cwd updates in prompt
  await termInput.fill('cd /var/log');
  await termInput.press('Enter');
  await expect(page.getByText('student@bashlab:/var/log$').first()).toBeVisible({ timeout: 10000 });

  // 8. Execute: cd ~ to return home
  await termInput.fill('cd ~');
  await termInput.press('Enter');
  await expect(page.getByText('student@bashlab:~$').first()).toBeVisible({ timeout: 10000 });

  // Take screenshot: Commands Executed in Sandbox
  await page.screenshot({ path: '/home/light/Documents/B3/web_app/Bashlab/screenshots/3-commands-executed.png', fullPage: true });

  // 9. Click Check Solution and wait for progress API call
  const saved = page.waitForResponse((res) => res.url().includes('/api/progress/') && res.request().method() === 'PUT');
  const checkBtn = page.getByRole('button', { name: 'Check Solution' });
  await checkBtn.click();
  expect((await saved).status()).toBe(204);

  // 10. Verify verification passed and UI celebrates
  await expect(page.locator('text=VERIFICATION PASSED')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Lab Objectives Completed!')).toBeVisible({ timeout: 15000 });

  // Take screenshot: Solution Passed
  await page.screenshot({ path: '/home/light/Documents/B3/web_app/Bashlab/screenshots/4-solution-passed.png', fullPage: true });

  // 11. Verify progress in database
  const { data: progressRows } = await adminClient
    .from('progress')
    .select('status, lessons(slug)')
    .eq('user_id', users.learner.id);

  expect(progressRows).toHaveLength(1);
  expect(progressRows[0].status).toBe('done');
  expect(progressRows[0].lessons.slug).toBe('terminal-fundamentals-navigation');
});

