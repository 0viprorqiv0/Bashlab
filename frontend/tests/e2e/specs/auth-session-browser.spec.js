// Browser-level behaviour of the API-based authentication: the frontend must
// never talk to Supabase Auth itself, sessions must survive reloads, refresh
// through the API, end on logout and on an admin lock, and emailed
// verification links must sign the learner in.
const { test, expect } = require('@playwright/test');
const { adminClient, createTestUser, deleteTestUserSafe, emailLink } = require('../support/supabaseAdmin');
const { env } = require('../support/env');

const SESSION_KEY = 'bashlab.session';
const main = (page) => page.locator('main');

async function uiLogin(page, user) {
  await page.goto('/login');
  await main(page).getByLabel('Email address').fill(user.email);
  await main(page).getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

test('the browser never calls Supabase Auth: login, profile edit, password-reset request and logout all go to the API', async ({ page }) => {
  const user = await createTestUser({ prefix: 'noauthdirect' });
  const authCalls = [];
  const apiCalls = [];
  page.on('request', (request) => {
    const url = request.url();
    if (url.startsWith(`${env.SUPABASE_URL}/auth/`)) authCalls.push(`${request.method()} ${url}`);
    if (url.startsWith('http://127.0.0.1:3001/api/auth/')) apiCalls.push(`${request.method()} ${new URL(url).pathname}`);
  });
  try {
    await uiLogin(page, user);
    await page.goto('/account');
    await page.getByRole('button', { name: 'Edit profile' }).click();
    await page.locator('#edit-name-input').fill('Direct Check');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Profile Updated')).toBeVisible();
    await page.getByRole('button', { name: 'Security & access' }).click();
    await page.getByRole('button', { name: 'Reset password' }).click();
    await expect(page.getByText('Reset Link Dispatched')).toBeVisible();
    await page.getByRole('button', { name: 'Log out' }).first().click();
    await page.getByRole('button', { name: 'Confirm log out' }).click();
    await page.waitForURL('**/login');

    expect(authCalls, 'frontend must not call Supabase Auth directly').toEqual([]);
    for (const expected of ['POST /api/auth/login', 'GET /api/auth/me', 'GET /api/auth/profile', 'PATCH /api/auth/profile', 'POST /api/auth/forgot-password', 'POST /api/auth/logout']) {
      expect(apiCalls, expected).toContain(expected);
    }
  } finally {
    await deleteTestUserSafe(user);
  }
});

test('the session survives a reload, and the token is not left in the URL', async ({ page }) => {
  const user = await createTestUser({ prefix: 'reload' });
  try {
    await uiLogin(page, user);
    await page.goto('/my-learning');
    await expect(page.getByRole('heading', { name: 'My Learning' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'My Learning' })).toBeVisible();
    expect(page.url()).not.toContain('access_token');
  } finally {
    await deleteTestUserSafe(user);
  }
});

test('an expired access token is silently refreshed through the API, not by Supabase', async ({ page }) => {
  const user = await createTestUser({ prefix: 'refresh' });
  const refreshCalls = [];
  const directAuth = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/auth/refresh')) refreshCalls.push(request.url());
    if (request.url().startsWith(`${env.SUPABASE_URL}/auth/`)) directAuth.push(request.url());
  });
  try {
    await uiLogin(page, user);
    const before = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), SESSION_KEY);
    await page.evaluate((key) => {
      const session = JSON.parse(localStorage.getItem(key));
      session.expires_at = Math.floor(Date.now() / 1000) - 10; // already expired
      localStorage.setItem(key, JSON.stringify(session));
    }, SESSION_KEY);

    await page.goto('/my-learning');
    await expect(page.getByRole('heading', { name: 'My Learning' })).toBeVisible();
    const after = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), SESSION_KEY);
    expect(refreshCalls.length).toBeGreaterThan(0);
    expect(after.access_token).not.toBe(before.access_token);
    expect(after.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(directAuth).toEqual([]);
  } finally {
    await deleteTestUserSafe(user);
  }
});

test('a dead refresh token ends the session cleanly (no loop, sent to /login)', async ({ page }) => {
  const user = await createTestUser({ prefix: 'deadrefresh' });
  try {
    await uiLogin(page, user);
    await page.evaluate((key) => {
      const session = JSON.parse(localStorage.getItem(key));
      session.expires_at = Math.floor(Date.now() / 1000) - 10;
      session.refresh_token = 'revoked-or-forged';
      localStorage.setItem(key, JSON.stringify(session));
    }, SESSION_KEY);
    await page.goto('/my-learning');
    await page.waitForURL('**/login**');
    expect(await page.evaluate((key) => localStorage.getItem(key), SESSION_KEY)).toBeNull();
  } finally {
    await deleteTestUserSafe(user);
  }
});

test('logging out ends the session on the server too: its refresh token stops working', async ({ page, request }) => {
  const user = await createTestUser({ prefix: 'logoutserver' });
  try {
    await uiLogin(page, user);
    const stolen = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), SESSION_KEY);
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('button', { name: 'Log out' }).click();
    await page.waitForURL('**/login');
    expect(await page.evaluate((key) => localStorage.getItem(key), SESSION_KEY)).toBeNull();

    const replay = await request.post('http://127.0.0.1:3001/api/auth/refresh', { data: { refresh_token: stolen.refresh_token } });
    expect(replay.status()).toBe(401);
  } finally {
    await deleteTestUserSafe(user);
  }
});

test('an admin locking an account signs the user out on their next request', async ({ page }) => {
  const user = await createTestUser({ prefix: 'lockedlive' });
  try {
    await uiLogin(page, user);
    await page.goto('/my-learning');
    await expect(page.getByRole('heading', { name: 'My Learning' })).toBeVisible();

    await adminClient.from('profiles').update({ is_locked: true }).eq('id', user.id);
    await adminClient.auth.admin.updateUserById(user.id, { ban_duration: '876000h' });

    await page.reload();
    await page.waitForURL('**/login**');
    expect(await page.evaluate((key) => localStorage.getItem(key), SESSION_KEY)).toBeNull();
  } finally {
    await deleteTestUserSafe(user);
  }
});

test('the verification link from the email verifies the account and signs the learner in', async ({ page }) => {
  const email = `e2e.verify.${Date.now()}@bashlab-e2e.test`;
  let created;
  try {
    const link = await emailLink('signup', email, { redirectPath: '/verify-email', password: 'Verify-Pass-2026!' });
    await page.goto(link);
    await page.waitForURL('**/verify-email**');
    await expect(page.getByRole('heading', { name: 'Email verified' })).toBeVisible();
    await expect(main(page).getByText(email)).toBeVisible();
    // Signed in straight away: the navbar already shows the account.
    await expect(page.getByRole('button', { name: 'User menu' })).toContainText(email);
    expect(new URL(page.url()).hash).toBe('');

    // Signed in: the protected page opens instead of bouncing to /login.
    await page.goto('/my-learning');
    await expect(page.getByRole('heading', { name: 'My Learning' })).toBeVisible();
    const { data } = await adminClient.auth.admin.listUsers({ perPage: 200 });
    created = data.users.find((u) => u.email === email);
    expect(created.email_confirmed_at).toBeTruthy();
  } finally {
    if (!created) {
      const { data } = await adminClient.auth.admin.listUsers({ perPage: 200 });
      created = data.users.find((u) => u.email === email);
    }
    await deleteTestUserSafe(created);
  }
});

test('a garbage or tampered verification token is rejected instead of trusted', async ({ page }) => {
  await page.goto('/verify-email?email=someone@bashlab-e2e.test#access_token=not.a.real.jwt&refresh_token=x&type=signup&expires_in=3600');
  await expect(page.getByRole('heading', { name: 'Link expired' })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), SESSION_KEY)).toBeNull();
  await page.goto('/my-learning');
  await page.waitForURL('**/login**');
});

test('an expired-link error from Supabase shows the recovery UI, and resend goes through the API', async ({ page }) => {
  const resend = [];
  page.on('request', (request) => { if (request.url().endsWith('/api/auth/resend-verification')) resend.push(request.postData()); });
  await page.goto('/verify-email?email=someone@bashlab-e2e.test#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  await expect(page.getByRole('heading', { name: 'Link expired' })).toBeVisible();
  await page.getByRole('button', { name: 'Request new link' }).click();
  await expect(page.getByRole('heading', { name: 'Request received' })).toBeVisible();
  expect(resend).toHaveLength(1);
  expect(JSON.parse(resend[0]).email).toBe('someone@bashlab-e2e.test');
});

test('API down: login shows a clear message instead of hanging', async ({ page }) => {
  await page.route('**/api/auth/login', (route) => route.abort('connectionrefused'));
  await page.goto('/login');
  await main(page).getByLabel('Email address').fill('someone@bashlab-e2e.test');
  await main(page).getByLabel('Password', { exact: true }).fill('whatever-1');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(main(page).getByRole('alert')).toContainText('Could not reach the server');
  await expect(page.getByRole('button', { name: 'Log in' })).toBeEnabled();
});
