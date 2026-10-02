// Browser-level behaviour of the API-based authentication: the frontend must
// never talk to Supabase Auth itself, sessions must survive reloads, refresh
// through the API, end on logout and on an admin lock, and emailed
// verification links must sign the learner in.
const { test, expect } = require('@playwright/test');
const { adminClient, createTestUser, deleteTestUserSafe, emailLink } = require('../support/supabaseAdmin');
const { env } = require('../support/env');

const SESSION_KEY = 'bashlab.session'; // older builds kept the tokens here; nothing may be stored under it now
const API_ORIGIN = 'http://localhost:3001';
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
    if (url.startsWith(`${API_ORIGIN}/api/auth/`)) apiCalls.push(`${request.method()} ${new URL(url).pathname}`);
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

test('no token is ever in web storage; the refresh token is an HttpOnly cookie scripts cannot read', async ({ page, context }) => {
  const user = await createTestUser({ prefix: 'nostorage' });
  try {
    await uiLogin(page, user);
    await page.goto('/my-learning');
    await expect(page.getByRole('heading', { name: 'My Learning' })).toBeVisible();

    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    expect(stored).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}\./); // no JWT anywhere
    expect(stored).not.toContain('refresh_token');
    expect(stored).not.toContain('access_token');
    expect(await page.evaluate((key) => localStorage.getItem(key), SESSION_KEY)).toBeNull();
    expect(await page.evaluate(() => document.cookie)).not.toContain('bashlab_rt');

    const cookie = (await context.cookies()).find((c) => c.name === 'bashlab_rt');
    expect(cookie, 'refresh cookie').toBeTruthy();
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe('Lax');
    expect(cookie.path).toBe('/api/auth');
  } finally {
    await deleteTestUserSafe(user);
  }
});

test('tokens an older build left in localStorage are wiped on load', async ({ page }) => {
  await page.goto('/login');
  await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ access_token: 'old', refresh_token: 'old' })), SESSION_KEY);
  await page.reload();
  expect(await page.evaluate((key) => localStorage.getItem(key), SESSION_KEY)).toBeNull();
});

test('after a reload the access token is re-issued from the cookie through the API, not by Supabase', async ({ page }) => {
  const user = await createTestUser({ prefix: 'refresh' });
  const refreshCalls = [];
  const directAuth = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/auth/refresh')) refreshCalls.push(request.url());
    if (request.url().startsWith(`${env.SUPABASE_URL}/auth/`)) directAuth.push(request.url());
  });
  try {
    await uiLogin(page, user);
    expect(refreshCalls).toEqual([]); // login itself returned an access token
    await page.goto('/my-learning'); // full page load: the in-memory token is gone
    await expect(page.getByRole('heading', { name: 'My Learning' })).toBeVisible();
    expect(refreshCalls.length).toBeGreaterThan(0);
    expect(directAuth).toEqual([]);
  } finally {
    await deleteTestUserSafe(user);
  }
});

test('a dead refresh cookie ends the session cleanly (no loop, sent to /login, cookie cleared)', async ({ page, context }) => {
  const user = await createTestUser({ prefix: 'deadrefresh' });
  try {
    await uiLogin(page, user);
    await context.addCookies([{ name: 'bashlab_rt', value: 'revoked-or-forged', domain: 'localhost', path: '/api/auth', httpOnly: true, sameSite: 'Lax' }]);
    await page.goto('/my-learning');
    await page.waitForURL('**/login**');
    expect(await page.evaluate(() => localStorage.getItem('bashlab.uid'))).toBeNull();
    expect((await context.cookies()).find((c) => c.name === 'bashlab_rt')).toBeUndefined();
  } finally {
    await deleteTestUserSafe(user);
  }
});

test('logging out ends the session on the server too: the cookie is gone and a copy of it stops working', async ({ page, context, request }) => {
  const user = await createTestUser({ prefix: 'logoutserver' });
  try {
    await uiLogin(page, user);
    const stolen = (await context.cookies()).find((c) => c.name === 'bashlab_rt');
    expect(stolen).toBeTruthy();
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('button', { name: 'Log out' }).click();
    await page.waitForURL('**/login');
    expect(await page.evaluate(() => localStorage.getItem('bashlab.uid'))).toBeNull();
    expect((await context.cookies()).find((c) => c.name === 'bashlab_rt')).toBeUndefined();

    const replay = await request.post(`${API_ORIGIN}/api/auth/refresh`, {
      headers: { Origin: 'http://localhost:3000', Cookie: `bashlab_rt=${stolen.value}` },
    });
    expect(replay.status()).toBe(401);
  } finally {
    await deleteTestUserSafe(user);
  }
});

test('logging out in one tab signs the other tab out too', async ({ browser }) => {
  const user = await createTestUser({ prefix: 'twotabs' });
  const context = await browser.newContext();
  try {
    const first = await context.newPage();
    await uiLogin(first, user);
    const second = await context.newPage();
    await second.goto('/my-learning');
    await expect(second.getByRole('heading', { name: 'My Learning' })).toBeVisible();

    await first.getByRole('button', { name: 'User menu' }).click();
    await first.getByRole('button', { name: 'Log out' }).click();
    await first.waitForURL('**/login');

    await second.waitForURL('**/login**');
  } finally {
    await context.close();
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
    expect(await page.evaluate(() => localStorage.getItem('bashlab.uid'))).toBeNull();
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
  expect(await page.evaluate(() => localStorage.getItem('bashlab.uid'))).toBeNull();
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
