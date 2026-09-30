// forgot-password / reset-password. The real "click the email link" step
// needs inbox access we don't have, so this covers: client-side validation,
// the neutral (anti-enumeration) response, and reset-password's behavior
// with no recovery session (the state anyone hitting the page directly is in).
const { test, expect } = require('@playwright/test');
const { createTestUser, deleteTestUserSafe, emailLink } = require('../support/supabaseAdmin');
const { signIn } = require('../support/apiClient');

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
    await expect(page.getByText('This reset link is invalid or has expired. Request a new one.')).toBeVisible();
  });

  test('the emailed link resets the password end to end, then old password stops working', async ({ page }) => {
    const user = await createTestUser({ prefix: 'resetflow' });
    const newPassword = 'Brand-New-Pass-2026!';
    try {
      // Same link the email contains; Supabase verifies it and redirects here
      // with a one-time recovery token in the URL fragment.
      await page.goto(await emailLink('recovery', user.email, { redirectPath: '/reset-password' }));
      await page.waitForURL('**/reset-password');
      // The token is scrubbed from the address bar straight away.
      await expect.poll(() => new URL(page.url()).hash).toBe('');

      await page.getByLabel('New password', { exact: true }).fill(newPassword);
      await page.getByLabel('Confirm new password', { exact: true }).fill(newPassword);
      await page.getByRole('button', { name: 'Update password' }).click();
      await expect(page.getByText('Your password has been updated.')).toBeVisible();

      await expect(signIn(user.email, user.password)).rejects.toThrow();
      await expect(signIn(user.email, newPassword)).resolves.toBeTruthy();
    } finally {
      await deleteTestUserSafe(user);
    }
  });

  test('a recovery link cannot be replayed after it has been used', async ({ page, context }) => {
    const user = await createTestUser({ prefix: 'resetreplay' });
    try {
      const link = await emailLink('recovery', user.email, { redirectPath: '/reset-password' });
      await page.goto(link);
      await page.waitForURL('**/reset-password');
      await page.getByLabel('New password', { exact: true }).fill('First-New-Pass-2026!');
      await page.getByLabel('Confirm new password', { exact: true }).fill('First-New-Pass-2026!');
      await page.getByRole('button', { name: 'Update password' }).click();
      await expect(page.getByText('Your password has been updated.')).toBeVisible();

      // Opening the same one-time link again must not lead to another reset.
      const second = await context.newPage();
      await second.goto(link);
      await second.waitForLoadState('networkidle');
      await second.getByLabel('New password', { exact: true }).fill('Second-New-Pass-2026!');
      await second.getByLabel('Confirm new password', { exact: true }).fill('Second-New-Pass-2026!');
      await second.getByRole('button', { name: 'Update password' }).click();
      await expect(second.getByText('This reset link is invalid or has expired. Request a new one.')).toBeVisible();
      await expect(signIn(user.email, 'Second-New-Pass-2026!')).rejects.toThrow();
    } finally {
      await deleteTestUserSafe(user);
    }
  });
});
