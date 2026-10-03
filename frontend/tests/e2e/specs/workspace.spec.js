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
  // 1. Navigate to Lab 1 (Terminal Fundamentals & Navigation)
  await page.goto('/courses/shell-101/labs/terminal-fundamentals-navigation');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Terminal Fundamentals & Navigation');

  // Verify the new ChatGPT-style sidebar and elements are rendered
  await expect(page.getByLabel('Course workspace')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close sidebar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'User account menu' })).toBeVisible();

  // 2. Wait for terminal to be active and prompt to appear (sandbox auto-boots on mount)
  const termInput = page.getByLabel('Terminal command');
  await expect(termInput).toBeVisible({ timeout: 20000 });
  await expect(page.locator('text=BashLab Cloud Shell (Ready)').first()).toBeVisible({ timeout: 20000 });

  // Take screenshot: Sandbox Booted with ChatGPT Sidebar
  await page.screenshot({ path: '/home/light/Documents/B3/web_app/Bashlab/screenshots/workspace-chatgpt-booted.png', fullPage: true });

  // 3. Execute command in real Docker/Bubblewrap container: pwd
  await termInput.fill('pwd');
  await termInput.press('Enter');
  await expect(page.getByText('/home/student').first()).toBeVisible({ timeout: 10000 });

  // 4. Execute: ls -la
  await termInput.fill('ls -la');
  await termInput.press('Enter');
  await expect(page.getByText('total').first()).toBeVisible({ timeout: 10000 });

  // 5. Execute: cd /var/log and check cwd updates in prompt
  await termInput.fill('cd /var/log');
  await termInput.press('Enter');
  await expect(page.getByText('student@bashlab:/var/log$').first()).toBeVisible({ timeout: 10000 });

  // 6. Execute: cd ~ to return home
  await termInput.fill('cd ~');
  await termInput.press('Enter');
  await expect(page.getByText('student@bashlab:~$').first()).toBeVisible({ timeout: 10000 });

  // Take screenshot: Commands Executed in Sandbox
  await page.screenshot({ path: '/home/light/Documents/B3/web_app/Bashlab/screenshots/workspace-chatgpt-commands.png', fullPage: true });

  // 7. Click Check Solution and wait for progress API call with status: done
  const saved = page.waitForResponse((res) => {
    if (!res.url().includes('/api/progress/') || res.request().method() !== 'PUT') return false;
    try {
      const body = JSON.parse(res.request().postData() || '{}');
      return body.status === 'done';
    } catch {
      return false;
    }
  });
  const checkBtn = page.getByRole('button', { name: 'Check Solution' });
  await checkBtn.click();
  expect((await saved).status()).toBe(204);

  // 8. Verify verification passed and UI celebrates
  await expect(page.locator('text=VERIFICATION PASSED')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Lab Objectives Completed!')).toBeVisible({ timeout: 15000 });

  // Take screenshot: Solution Passed
  await page.screenshot({ path: '/home/light/Documents/B3/web_app/Bashlab/screenshots/workspace-chatgpt-passed.png', fullPage: true });

  // 9. Test ChatGPT Popover Account Menu
  const accountBtn = page.getByRole('button', { name: 'User account menu' });
  await accountBtn.click();
  await expect(page.getByRole('menu')).toBeVisible();
  await expect(page.getByRole('menuitem', { name: /Account & Security|Settings/ })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Log out' })).toBeVisible();

  // Take screenshot: Popover Account Menu Open
  await page.screenshot({ path: '/home/light/Documents/B3/web_app/Bashlab/screenshots/workspace-chatgpt-popover.png', fullPage: true });

  // Close menu by clicking outside
  await page.mouse.click(500, 200);

  // 10. Test Sidebar Collapse Toggle
  const toggleBtn = page.getByRole('button', { name: 'Close sidebar' });
  await toggleBtn.click();
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
  await page.waitForTimeout(600);

  // Take screenshot: Collapsed Sidebar
  await page.screenshot({ path: '/home/light/Documents/B3/web_app/Bashlab/screenshots/workspace-chatgpt-collapsed.png', fullPage: true });

  // 11. Verify progress in database
  const { data: progressRows } = await adminClient
    .from('progress')
    .select('status, lessons(slug)')
    .eq('user_id', users.learner.id);

  expect(progressRows).toHaveLength(1);
  expect(progressRows[0].status).toBe('done');
  expect(progressRows[0].lessons.slug).toBe('terminal-fundamentals-navigation');
});
