const { test, expect } = require('../support/session');

test.use({ asRole: 'admin' });

test('workspace account popover: profile link navigates to /account, logout works cleanly', async ({ page }) => {
  await page.goto('/courses/shell-101/labs/terminal-fundamentals-navigation');
  
  // Wait for workspace and account button
  const accountBtn = page.locator('[class*="chatgptAccountBtn"]');
  await expect(accountBtn).toBeVisible({ timeout: 15000 });

  // Open popover
  await accountBtn.click();
  const popover = page.locator('[class*="chatgptPopover"]');
  await expect(popover).toBeVisible();

  // Verify removed items are NOT present
  await expect(popover.getByRole('menuitem', { name: 'Browse Courses' })).toHaveCount(0);
  await expect(popover.getByRole('menuitem', { name: 'Help' })).toHaveCount(0);

  // Take screenshot of popover
  const screenshotPath = '/home/light/.gemini/antigravity-cli/brain/1452835d-ecd2-4990-8c8e-966c5ec35541/account-popover-updated.png';
  await popover.screenshot({ path: screenshotPath });

  // Verify Admin Demo (popoverUserRow) is a link to /account
  const profileRow = page.locator('[class*="popoverUserRow"]');
  await expect(profileRow).toHaveAttribute('href', '/account');

  // Test Logout button
  const logoutBtn = popover.getByRole('menuitem', { name: 'Log out' });
  await expect(logoutBtn).toBeVisible();
  await logoutBtn.click();

  // Should navigate to /login
  await page.waitForURL('**/login', { timeout: 10000 });
  expect(page.url()).toContain('/login');
});
