// Regression test for a real bug found manually: Navbar loads its own copy
// of the profile on mount and never re-fetches on a `profiles` write, so
// editing your name on /account left the navbar showing the old name until
// a full page reload. Fixed by having Account page dispatch a
// 'bashlab:profile-updated' window event that Navbar listens for
// (see components/layout/Navbar.jsx and app/(site)/account/page.js).
const { test, expect } = require('@playwright/test');
const { createTestUser, deleteTestUserSafe } = require('../support/supabaseAdmin');

test('editing the profile name updates the navbar immediately, with no reload', async ({ page }) => {
  const user = await createTestUser({ prefix: 'profileedit' });
  const newName = `Updated Name ${Date.now()}`;
  try {
    await page.goto('/login');
    const main = page.locator('main');
    await main.getByLabel('Email address').fill(user.email);
    await main.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/my-learning');

    await page.goto('/account');
    await page.getByRole('button', { name: 'Edit profile' }).click();
    const nameInput = page.locator('#edit-name-input');
    await nameInput.fill(newName);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Profile Updated')).toBeVisible();

    // No reload here — this is exactly the "must refresh to see it" bug.
    // Both the collapsed button and the opened dropdown panel show the name.
    await page.getByRole('button', { name: 'User menu' }).click();
    await expect(page.getByRole('banner').getByText(newName).first()).toBeVisible();
  } finally {
    await deleteTestUserSafe(user);
  }
});
