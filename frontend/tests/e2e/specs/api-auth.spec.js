// The backend auth API (backend/src/routes/auth.js) exercised over HTTP
// against real Supabase, exactly as the browser uses it. This is where the
// "login & co. live in the API, not the frontend" requirement is enforced:
// every rule the UI relies on is asserted here, independent of any page.
const { test, expect } = require('@playwright/test');
const { adminClient, createTestUser, deleteTestUserSafe, emailLink } = require('../support/supabaseAdmin');
const { env } = require('../support/env');

const API = 'http://localhost:3001/api/auth';
const ORIGIN = 'http://localhost:3000';

async function call(method, path, { body, token, origin = ORIGIN, cookie } = {}) {
  const response = await fetch(API + path, {
    method,
    headers: { ...(origin ? { Origin: origin } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, headers: response.headers, json: await response.json().catch(() => null) };
}

const login = (user, password = user.password) => call('POST', '/login', { body: { email: user.email, password } });
// The refresh token only ever travels as the HttpOnly cookie: "name=value" for a Cookie request header.
const cookieOf = (response) => (response.headers.get('set-cookie') || '').split(';')[0];

test.describe('sessions', () => {
  let user;
  test.beforeAll(async () => { user = await createTestUser({ prefix: 'apisession' }); });
  test.afterAll(async () => { await deleteTestUserSafe(user); });

  test('login returns a working session and the role; wrong credentials are indistinguishable', async () => {
    const ok = await login(user);
    expect(ok.status).toBe(200);
    expect(ok.json.profile.role).toBe('learner');
    expect(ok.json.user.email).toBe(user.email);

    // The refresh token is delivered as an HttpOnly cookie and is NOT in the body.
    expect(JSON.stringify(ok.json)).not.toContain('refresh');
    const setCookie = ok.headers.get('set-cookie');
    expect(setCookie).toMatch(/^bashlab_rt=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(setCookie).toMatch(/Path=\/api\/auth/);

    const wrongPassword = await login(user, 'definitely-wrong-1');
    const unknownUser = await call('POST', '/login', { body: { email: 'nobody.here@bashlab-e2e.test', password: 'definitely-wrong-1' } });
    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.json).toEqual(wrongPassword.json);
  });

  test('/me works with the access token, refuses missing/garbage tokens', async () => {
    const { json } = await login(user);
    const me = await call('GET', '/me', { token: json.session.access_token });
    expect(me.status).toBe(200);
    expect(me.json.user.id).toBe(user.id);
    expect((await call('GET', '/me')).status).toBe(401);
    expect((await call('GET', '/me', { token: 'not.a.jwt' })).status).toBe(401);
  });

  test('refresh re-issues an access token from the cookie (and rotates it); logout ends the session so the cookie dies', async () => {
    const first = await login(user);
    const refreshed = await call('POST', '/refresh', { cookie: cookieOf(first) });
    expect(refreshed.status).toBe(200);
    expect(refreshed.json.session.access_token).toBeTruthy();
    expect(JSON.stringify(refreshed.json)).not.toContain('refresh');
    const rotated = cookieOf(refreshed);
    expect(rotated).toMatch(/^bashlab_rt=/);

    expect((await call('POST', '/logout', { token: refreshed.json.session.access_token })).status).toBe(200);
    const afterLogout = await call('POST', '/refresh', { cookie: rotated });
    expect(afterLogout.status).toBe(401);
    expect(afterLogout.headers.get('set-cookie')).toMatch(/Max-Age=0/); // the browser is told to drop it
  });

  test('a refresh token in the body is never accepted; without the cookie there is nothing to refresh', async () => {
    const first = await login(user);
    const raw = decodeURIComponent(cookieOf(first).split('=')[1]);
    expect((await call('POST', '/refresh', { body: { refresh_token: raw } })).status).toBe(400);
    expect((await call('POST', '/refresh')).status).toBe(400);
  });

  test('cookie endpoints (refresh, logout, session) refuse a foreign or missing Origin — CSRF', async () => {
    const first = await login(user);
    for (const path of ['/refresh', '/logout', '/session']) {
      for (const origin of ['https://evil.example', null]) {
        const res = await call('POST', path, { origin, cookie: cookieOf(first), body: { refresh_token: 'x' } });
        expect(res.status, `${path} from ${origin}`).toBe(403);
        expect(res.json.error.code).toBe('BAD_ORIGIN');
      }
    }
    // ...and the session is still alive afterwards: nothing was revoked or cleared.
    expect((await call('POST', '/refresh', { cookie: cookieOf(first) })).status).toBe(200);
  });

  test('/session exchanges the emailed-link refresh token for the cookie; a forged one is refused', async () => {
    expect([400, 401]).toContain((await call('POST', '/session', { body: { refresh_token: 'forged-token' } })).status);
    const link = await emailLink('magiclink', user.email, { redirectPath: '/verify-email' });
    const redirect = await fetch(link, { redirect: 'manual' });
    const fragment = new URLSearchParams(redirect.headers.get('location').split('#')[1]);
    const adopted = await call('POST', '/session', { body: { refresh_token: fragment.get('refresh_token') } });
    expect(adopted.status).toBe(200);
    expect(cookieOf(adopted)).toMatch(/^bashlab_rt=/);
    expect(JSON.stringify(adopted.json)).not.toContain('refresh');
  });
});

test.describe('profile', () => {
  let user;
  let token;
  test.beforeAll(async () => {
    user = await createTestUser({ prefix: 'apiprofile' });
    token = (await login(user)).json.session.access_token;
  });
  test.afterAll(async () => { await deleteTestUserSafe(user); });

  test('a learner edits their profile through the API and it is really stored', async () => {
    const patch = await call('PATCH', '/profile', { token, body: { name: 'API Learner', bio: 'hello', age: 27, location: 'Hanoi', occupation: 'student' } });
    expect(patch.status).toBe(200);
    const { data } = await adminClient.from('profiles').select('name, bio, age, location, occupation').eq('id', user.id).single();
    expect(data).toEqual({ name: 'API Learner', bio: 'hello', age: 27, location: 'Hanoi', occupation: 'student' });
    expect((await call('GET', '/profile', { token })).json.profile.name).toBe('API Learner');
  });

  test('privilege escalation through the API is impossible: role / is_locked / email / id are rejected', async () => {
    for (const body of [{ role: 'admin' }, { is_locked: false }, { email: 'x@bashlab-e2e.test' }, { id: '00000000-0000-0000-0000-000000000000' }]) {
      expect((await call('PATCH', '/profile', { token, body })).status).toBe(400);
    }
    const { data } = await adminClient.from('profiles').select('role, is_locked').eq('id', user.id).single();
    expect(data).toEqual({ role: 'learner', is_locked: false });
  });

  test('and impossible around the API too: the browser-side key can no longer update profiles at all', async () => {
    for (const patch of [{ name: 'Direct Write' }, { role: 'admin' }]) {
      const response = await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      });
      expect(response.status, JSON.stringify(patch)).toBe(403);
    }
    const { data } = await adminClient.from('profiles').select('name, role').eq('id', user.id).single();
    expect(data.role).toBe('learner');
    expect(data.name).not.toBe('Direct Write');
  });

  test('avatar must be a small image data URL', async () => {
    expect((await call('PATCH', '/profile', { token, body: { avatar_url: 'https://evil.example/a.png' } })).status).toBe(400);
    expect((await call('PATCH', '/profile', { token, body: { avatar_url: `data:image/png;base64,${'A'.repeat(400_000)}` } })).status).toBeGreaterThanOrEqual(400);
    expect((await call('PATCH', '/profile', { token, body: { avatar_url: 'data:image/png;base64,iVBORw0KGgo=' } })).status).toBe(200);
    expect((await call('PATCH', '/profile', { token, body: { avatar_url: null } })).status).toBe(200);
  });
});

test.describe('locked accounts', () => {
  test('an admin lock stops login AND cuts off a token the user already holds', async () => {
    const user = await createTestUser({ prefix: 'apilock' });
    try {
      const { json } = await login(user);
      await adminClient.from('profiles').update({ is_locked: true }).eq('id', user.id);
      await adminClient.auth.admin.updateUserById(user.id, { ban_duration: '876000h' });

      const relogin = await login(user);
      expect(relogin.status).toBe(403);
      expect(relogin.json.error.code).toBe('ACCOUNT_LOCKED');
      // This token was never verified before the lock, so nothing is cached:
      // the ban must be seen on its first use (401/403 — either way: no access).
      const me = await call('GET', '/me', { token: json.session.access_token });
      expect([401, 403]).toContain(me.status);
    } finally {
      await deleteTestUserSafe(user);
    }
  });
});

test.describe('registration, verification and recovery', () => {
  test('register never reveals whether an address is already taken, and never returns a session', async () => {
    const existing = await createTestUser({ prefix: 'apireg' });
    const fresh = `e2e.apireg.new.${Date.now()}@bashlab-e2e.test`;
    try {
      const taken = await call('POST', '/register', { body: { email: existing.email, password: 'Another-Pass-2026!' } });
      const brandNew = await call('POST', '/register', { body: { email: fresh, password: 'Another-Pass-2026!' } });
      expect(taken.status).toBe(202);
      expect(brandNew.status).toBe(202);
      expect(taken.json).toEqual(brandNew.json);
      expect(taken.json.session).toBeUndefined();
      // Unverified accounts cannot log in yet.
      const early = await call('POST', '/login', { body: { email: fresh, password: 'Another-Pass-2026!' } });
      expect(early.status).toBe(403);
      expect(early.json.error.code).toBe('EMAIL_NOT_CONFIRMED');
    } finally {
      await deleteTestUserSafe(existing);
      const { data } = await adminClient.auth.admin.listUsers({ perPage: 200 });
      await deleteTestUserSafe(data.users.find((u) => u.email === fresh));
    }
  });

  test('password rules are enforced by the API itself, not just the form', async () => {
    for (const password of ['short', 'x'.repeat(73), '']) {
      const response = await call('POST', '/register', { body: { email: `e2e.weak.${Date.now()}@bashlab-e2e.test`, password } });
      expect(response.status, password.slice(0, 8)).toBe(400);
      expect(response.json.error.code).toBe('WEAK_PASSWORD');
    }
  });

  test('forgot-password answers the same for known and unknown addresses', async () => {
    const user = await createTestUser({ prefix: 'apiforgot' });
    try {
      const known = await call('POST', '/forgot-password', { body: { email: user.email } });
      const unknown = await call('POST', '/forgot-password', { body: { email: 'no.such.person@bashlab-e2e.test' } });
      expect([known.status, unknown.status]).toEqual([200, 200]);
      expect(known.json).toEqual(unknown.json);
    } finally {
      await deleteTestUserSafe(user);
    }
  });

  test('reset-password: a normal login token cannot be used, only an emailed recovery token', async () => {
    const user = await createTestUser({ prefix: 'apireset' });
    try {
      const firstLogin = await login(user);
      const { json } = firstLogin;
      const earlierCookie = cookieOf(firstLogin);
      const stolen = await call('POST', '/reset-password', { token: json.session.access_token, body: { password: 'Attacker-Chosen-1!' } });
      expect(stolen.status).toBe(403);
      expect(stolen.json.error.code).toBe('RECOVERY_REQUIRED');
      expect((await login(user)).status).toBe(200); // original password untouched

      const link = await emailLink('recovery', user.email, { redirectPath: '/reset-password' });
      const redirect = await fetch(link, { redirect: 'manual' });
      const fragment = new URLSearchParams(redirect.headers.get('location').split('#')[1]);
      const changed = await call('POST', '/reset-password', { token: fragment.get('access_token'), body: { password: 'Recovered-Pass-2026!' } });
      expect(changed.status).toBe(200);
      expect((await login(user)).status).toBe(401);
      expect((await login(user, 'Recovered-Pass-2026!')).status).toBe(200);
      // Every earlier session was revoked by the reset.
      expect((await call('POST', '/refresh', { cookie: earlierCookie })).status).toBe(401);
    } finally {
      await deleteTestUserSafe(user);
    }
  });
});

test.describe('abuse limits', () => {
  test('repeated bad logins for one account are throttled', async () => {
    const victim = `e2e.brute.${Date.now()}@bashlab-e2e.test`;
    const statuses = [];
    for (let i = 0; i < 12; i++) {
      statuses.push((await call('POST', '/login', { body: { email: victim, password: `guess-number-${i}` } })).status);
    }
    expect(statuses.slice(0, 3).every((status) => status === 401)).toBe(true);
    expect(statuses).toContain(429);
  });

  test('CORS: the frontend origin may call the API, an unknown site may not read responses', async () => {
    const good = await fetch(`${API}/login`, { method: 'OPTIONS', headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,authorization' } });
    expect(good.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    const bad = await fetch(`${API}/login`, { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' } });
    expect(bad.headers.get('access-control-allow-origin')).not.toBe('https://evil.example');
  });
});
