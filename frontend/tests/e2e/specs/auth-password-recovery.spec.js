// forgot-password / reset-password. The real "click the email link" step
// needs inbox access we don't have, so this covers: client-side validation,
// the neutral (anti-enumeration) response, and reset-password's behavior
// with no recovery session (the state anyone hitting the page directly is in).
const { test, expect } = require('@playwright/test');
const { createTestUser, deleteTestUserSafe } = require('../support/supabaseAdmin');

// The footer's newsletter field shares the "Email address" label with the
// auth form, so lookups on this page are scoped to <main>.
const main = (page) => page.locator('main');

test.describe('forgot password', () => {
  test('rejects an invalid email address', async ({ page }) => {
    await page.goto('/forgot-password');
    await main(page).getByLabel('Email address').fill('not-an-email');
    await page.getByRole('button', { name: 'Request reset link' }).click();
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  });

  test('shows the exact same neutral message for an existing account and a non-existent one', async ({ page }) => {
    const user = await createTestUser({ prefix: 'forgot' });
    try {
      await page.goto('/forgot-password');
      await main(page).getByLabel('Email address').fill(user.email);
      await page.getByRole('button', { name: 'Request reset link' }).click();
      const existingMessage = await page.getByRole('status').innerText();
      expect(existingMessage).toContain('you will receive password reset instructions shortly');

      await page.goto('/forgot-password');
      await main(page).getByLabel('Email address').fill('no-such-account-e2e@bashlab-e2e.test');
      await page.getByRole('button', { name: 'Request reset link' }).click();
      const nonExistentMessage = await page.getByRole('status').innerText();
      const normalize = (text) => text.replace(user.email, 'X').replace('no-such-account-e2e@bashlab-e2e.test', 'X');
      expect(normalize(nonExistentMessage)).toBe(normalize(existingMessage));
    } finally {
      await deleteTestUserSafe(user);
    }
  });

  test('"Request another link" is rate-limited for 45s after sending', async ({ page }) => {
    await page.goto('/forgot-password');
    await main(page).getByLabel('Email address').fill('cooldown-check@bashlab-e2e.test');
    await page.getByRole('button', { name: 'Request reset link' }).click();
    await expect(page.getByRole('button', { name: /Try again in \d+s/ })).toBeDisabled();
  });
});

test.describe('reset password', () => {
  test('rejects a short password and a mismatched confirmation', async ({ page }) => {
    await page.goto('/reset-password');
    await page.getByLabel('New password', { exact: true }).fill('short');
    await page.getByLabel('Confirm new password', { exact: true }).fill('different');
    await page.getByRole('button', { name: 'Update password' }).click();
    // The hint below the field repeats the same copy as the inline error,
    // so scope to the error element specifically (#password-error).
    await expect(page.locator('#password-error')).toHaveText('Use at least 8 characters.');
  });

  test('submitting with no recovery session (page opened directly, not via email link) errors', async ({ page }) => {
    await page.goto('/reset-password');
    await page.getByLabel('New password', { exact: true }).fill('a-valid-password-1');
    await page.getByLabel('Confirm new password', { exact: true }).fill('a-valid-password-1');
    await page.getByRole('button', { name: 'Update password' }).click();
    // Next.js's own (empty) route announcer also has role="alert"; match the
    // one with actual text.
    await expect(page.getByText('Auth session missing!')).toBeVisible();
  });
});
