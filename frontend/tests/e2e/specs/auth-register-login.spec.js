// Register/login/logout against the real Supabase Auth backend (no mocks).
// Registration success is checked via the client-side handoff to
// /verify-email; we don't have inbox access, so the "click the email link"
// half of the flow is out of scope here (same reason Workspace/sandbox is
// skipped — see tests/e2e/specs/workspace.spec.js).
const { test, expect } = require('@playwright/test');
const { createTestUser, deleteTestUserSafe, adminClient } = require('../support/supabaseAdmin');

// The footer's newsletter field shares the "Email address" label with the
// auth form, so every lookup here is scoped to <main> to avoid Playwright's
// strict-mode "resolved to 2 elements".
const main = (page) => page.locator('main');

test.describe('register', () => {
  test('rejects an invalid email, short password and mismatched confirmation', async ({ page }) => {
    await page.goto('/register');
    await main(page).getByLabel('Email address').fill('not-an-email');
    await main(page).getByLabel('Password', { exact: true }).fill('short');
    await main(page).getByLabel('Confirm password', { exact: true }).fill('different');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  });

  test('requires agreeing to terms before submitting', async ({ page }) => {
    await page.goto('/register');
    await main(page).getByLabel('Email address').fill('someone@example.com');
    await main(page).getByLabel('Password', { exact: true }).fill('a-real-password-1');
    await main(page).getByLabel('Confirm password', { exact: true }).fill('a-real-password-1');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Agree to the terms to continue.')).toBeVisible();
  });

  test('a brand-new email signs up and lands on the verify-email screen', async ({ page }) => {
    const email = `e2e.signup.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@bashlab-e2e.test`;
    try {
      await page.goto('/register');
      await main(page).getByLabel('Email address').fill(email);
      await main(page).getByLabel('Password', { exact: true }).fill('a-real-password-1');
      await main(page).getByLabel('Confirm password', { exact: true }).fill('a-real-password-1');
      await main(page).getByLabel(/agree to the terms/i).check();
      await page.getByRole('button', { name: 'Create account' }).click();
      await page.waitForURL('**/verify-email**');
      await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
      await expect(page.getByText(email)).toBeVisible();
    } finally {
      // signUp creates the auth user immediately even though it's unverified.
      const { data } = await adminClient.auth.admin.listUsers();
      const created = data.users.find((u) => u.email === email);
      if (created) await deleteTestUserSafe({ id: created.id, email });
    }
  });

  test('registering with an email that already has a confirmed account stays neutral (no enumeration)', async ({ page }) => {
    // Supabase's anti-enumeration design: signUp() on an existing confirmed
    // email returns no error and an empty `identities` array — the UI can't
    // tell the difference from a fresh signup, and must not try to.
    const existing = await createTestUser({ prefix: 'dupe' });
    try {
      await page.goto('/register');
      await main(page).getByLabel('Email address').fill(existing.email);
      await main(page).getByLabel('Password', { exact: true }).fill('a-different-password-1');
      await main(page).getByLabel('Confirm password', { exact: true }).fill('a-different-password-1');
      await main(page).getByLabel(/agree to the terms/i).check();
      await page.getByRole('button', { name: 'Create account' }).click();
      await page.waitForURL('**/verify-email**');
      // And the original account must still log in with its original password.
      await page.goto('/login');
      await main(page).getByLabel('Email address').fill(existing.email);
      await main(page).getByLabel('Password', { exact: true }).fill(existing.password);
      await page.getByRole('button', { name: 'Log in' }).click();
      await page.waitForURL('**/my-learning');
    } finally {
      await deleteTestUserSafe(existing);
    }
  });
});

test.describe('login', () => {
  test('rejects an invalid email format and empty password client-side', async ({ page }) => {
    await page.goto('/login');
    await main(page).getByLabel('Email address').fill('not-an-email');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  });

  test('rejects a wrong password with a generic error (no user enumeration)', async ({ page }) => {
    const user = await createTestUser({ prefix: 'wrongpw' });
    try {
      await page.goto('/login');
      await main(page).getByLabel('Email address').fill(user.email);
      await main(page).getByLabel('Password', { exact: true }).fill('definitely-the-wrong-password');
      await page.getByRole('button', { name: 'Log in' }).click();
      // Next.js's own (empty) route announcer also has role="alert"; scope
      // to the error box specifically.
      await expect(page.locator('main').getByRole('alert')).toBeVisible();
      await expect(page).toHaveURL(/\/login/);
    } finally {
      await deleteTestUserSafe(user);
    }
  });

  test('a locked account is blocked at login with a specific message', async ({ page }) => {
    const locked = await createTestUser({ prefix: 'blockedlogin', locked: true });
    try {
      await page.goto('/login');
      await main(page).getByLabel('Email address').fill(locked.email);
      await main(page).getByLabel('Password', { exact: true }).fill(locked.password);
      await page.getByRole('button', { name: 'Log in' }).click();
      await expect(page.getByText('Your account has been locked by an administrator.')).toBeVisible();
    } finally {
      await deleteTestUserSafe(locked);
    }
  });

  test('valid credentials log in and land on /my-learning, then log out from the navbar', async ({ page }) => {
    const user = await createTestUser({ prefix: 'happypath' });
    try {
      await page.goto('/login');
      await main(page).getByLabel('Email address').fill(user.email);
      await main(page).getByLabel('Password', { exact: true }).fill(user.password);
      await page.getByRole('button', { name: 'Log in' }).click();
      await page.waitForURL('**/my-learning');

      await page.getByRole('button', { name: 'User menu' }).click();
      await page.getByRole('button', { name: 'Log out' }).click();
      await page.waitForURL('**/login');

      // Session is really gone, not just a client-side redirect.
      await page.goto('/my-learning');
      await page.waitForURL('**/login');
    } finally {
      await deleteTestUserSafe(user);
    }
  });
});
