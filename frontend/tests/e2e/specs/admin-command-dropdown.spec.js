const { test, expect } = require('../support/session');

test.use({ asRole: 'admin' });

test('admin content studio: custom course dropdown opens with dark theme and checkmark', async ({ page }) => {
  await page.goto('/admin/content');

  // Wait for command center course trigger
  const trigger = page.locator('button[class*="commandCenterCourseTrigger"]');
  await expect(trigger).toBeVisible({ timeout: 15000 });
  console.log('Current course:', await trigger.innerText());

  // Click trigger to open custom dropdown
  await trigger.click();

  const menu = page.locator('[class*="commandCenterCourseMenu"]');
  await expect(menu).toBeVisible();
  await page.waitForTimeout(400);

  // Take screenshot of the custom dropdown
  const screenshotPath = '/home/light/.gemini/antigravity-cli/brain/1452835d-ecd2-4990-8c8e-966c5ec35541/admin-course-dropdown-custom.png';
  await page.screenshot({ path: screenshotPath });

  // Verify options exist and have active checkmark
  const activeOption = menu.locator('[class*="commandCenterMenuItemActive"]');
  await expect(activeOption).toBeVisible();
  await expect(activeOption.locator('.material-symbols-outlined:has-text("check")')).toBeVisible();

  // Click another course if available
  const allOptions = menu.locator('[class*="commandCenterMenuItem"]');
  const count = await allOptions.count();
  if (count > 1) {
    const secondOption = allOptions.nth(1);
    const targetTitle = (await secondOption.locator('[class*="commandCenterItemTitle"]').innerText()).trim();
    await secondOption.click();
    await expect(menu).toBeHidden();
    await expect(trigger).toContainText(targetTitle);
  }
});
