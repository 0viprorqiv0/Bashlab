import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';
import { createAuthService } from '../src/services/authService.js';
import { HttpError } from '../src/errors.js';

const ORIGIN = 'http://localhost:3000';
const jwt = (claims) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;
const authError = (code, status = 400, message = code) => Object.assign(new Error(message), { code, status });

// In-memory stand-ins for the two Supabase clients the service uses.
function fakeSupabase({ users = {}, profiles = {}, upstream = {} } = {}) {
  const calls = { signUp: [], reset: [], resend: [], signOut: [], updateUser: [], profileUpdates: [] };
  const anon = () => ({
    auth: {
      async signInWithPassword({ email, password }) {
        if (upstream.signIn) return { data: null, error: upstream.signIn };
        const user = users[email];
        if (!user || user.password !== password) return { data: null, error: authError('invalid_credentials', 400) };
        return { data: { user: { id: user.id, email }, session: { access_token: jwt({ sub: user.id, amr: [{ method: 'password', timestamp: 1 }] }), refresh_token: `r-${user.id}`, expires_at: 9999999999, expires_in: 3600 } }, error: null };
      },
      async signUp(args) { calls.signUp.push(args); return { data: { user: { identities: [] }, session: null }, error: upstream.signUp || null }; },
      async resetPasswordForEmail(email, opts) { calls.reset.push({ email, ...opts }); return { error: upstream.reset || null }; },
      async resend(args) { calls.resend.push(args); return { error: upstream.resend || null }; },
      async refreshSession({ refresh_token: token }) {
        if (token !== 'good-refresh') return { data: {}, error: authError('refresh_token_not_found', 400) };
        return { data: { session: { access_token: 'new', refresh_token: 'r2', expires_at: 9999999999, expires_in: 3600 } }, error: null };
      },
    },
  });
  const admin = {
    auth: {
      async getUser(token) {
        const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
        return { data: { user: { id: claims.sub } }, error: null };
      },
      admin: {
        async signOut(token, scope) { calls.signOut.push({ token, scope }); return { error: null }; },
        async updateUserById(id, attrs) {
          calls.updateUser.push({ id, attrs });
          return { error: upstream.updateUser || null };
        },
      },
    },
    from() {
      let patch = null;
      let id = null;
      const chain = {
        select() { return chain; },
        update(values) { patch = values; return chain; },
        eq(_column, value) { id = value; return chain; },
        async maybeSingle() {
          if (patch) { calls.profileUpdates.push({ id, patch }); profiles[id] = { ...profiles[id], ...patch }; }
          return { data: profiles[id] || null, error: null };
        },
      };
      return chain;
    },
  };
  return { anon, admin, calls, profiles };
}

async function startApi(t, setup = {}, limits = {}) {
  const fake = fakeSupabase(setup);
  const service = createAuthService({ admin: fake.admin, anon: fake.anon, log: { warn() {} } });
  const authenticate = async (req, _res, next) => {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) return next(new HttpError(401, 'UNAUTHENTICATED', 'Missing bearer token'));
    try {
      req.user = { id: JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub };
      req.accessToken = token;
      return next();
    } catch { return next(new HttpError(401, 'UNAUTHENTICATED', 'Invalid or expired token')); }
  };
  const server = createApp({ auth: false, authApi: { service, authenticate, limits: { perMinute: 1000, sensitivePerMinute: 1000, loginPerMinute: 1000, ...limits } }, sandbox: false })
    .listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/auth`;
  const call = async (method, path, { body, token, origin = ORIGIN, raw, cookie } = {}) => {
    const response = await fetch(base + path, {
      method,
      headers: { ...(body !== undefined || raw ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) },
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
    return { status: response.status, headers: response.headers, json: await response.json().catch(() => null) };
  };
  return { call, ...fake };
}

const learner = { 'ada@example.com': { id: 'u1', password: 'correct-horse-1' } };
const learnerProfile = { u1: { name: 'Ada', role: 'learner', is_locked: false, bio: 'hi', avatar_url: null, age: 30, location: 'HN', occupation: 'dev' } };

test('login validates input and never distinguishes "no such user" from "wrong password"', async (t) => {
  const { call } = await startApi(t, { users: learner, profiles: { ...learnerProfile } });
  assert.equal((await call('POST', '/login', { body: { email: 'not-an-email', password: 'x' } })).json.error.code, 'INVALID_EMAIL');
  const wrong = await call('POST', '/login', { body: { email: 'ada@example.com', password: 'nope' } });
  const missing = await call('POST', '/login', { body: { email: 'ghost@example.com', password: 'nope' } });
  assert.equal(wrong.status, 401);
  assert.deepEqual(wrong.json, missing.json);
  assert.equal(wrong.json.error.code, 'INVALID_CREDENTIALS');
});

test('login returns a session + role, normalises the email, exposes no secrets', async (t) => {
  const { call } = await startApi(t, { users: learner, profiles: { ...learnerProfile } });
  const { status, json, headers } = await call('POST', '/login', { body: { email: '  ADA@Example.com ', password: 'correct-horse-1' } });
  assert.equal(status, 200);
  assert.deepEqual(Object.keys(json).sort(), ['profile', 'session', 'user']);
  assert.deepEqual(Object.keys(json.session).sort(), ['access_token', 'expires_at', 'expires_in']); // no refresh_token in the body
  assert.equal(JSON.stringify(json).includes('refresh'), false);
  const cookie = headers.get('set-cookie');
  assert.match(cookie, /^bashlab_rt=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Path=\/api\/auth/);
  assert.equal(json.profile.role, 'learner');
  assert.equal('is_locked' in json.profile, false);
  assert.equal('avatar_url' in json.profile, false);
});

test('a locked account cannot log in, and the session it just obtained is revoked', async (t) => {
  const { call, calls } = await startApi(t, { users: learner, profiles: { u1: { ...learnerProfile.u1, is_locked: true } } });
  const { status, json } = await call('POST', '/login', { body: { email: 'ada@example.com', password: 'correct-horse-1' } });
  assert.equal(status, 403);
  assert.equal(json.error.code, 'ACCOUNT_LOCKED');
  assert.equal(calls.signOut.length, 1);
});

test('upstream Supabase failures map to stable codes', async (t) => {
  const cases = [
    [authError('user_banned', 400), 403, 'ACCOUNT_LOCKED'],
    [authError('email_not_confirmed', 400), 403, 'EMAIL_NOT_CONFIRMED'],
    [authError('over_request_rate_limit', 429), 429, 'RATE_LIMIT'],
    [authError('unexpected_failure', 500), 502, 'UPSTREAM_ERROR'],
  ];
  for (const [error, status, code] of cases) {
    const { call } = await startApi(t, { upstream: { signIn: error } });
    const response = await call('POST', '/login', { body: { email: 'ada@example.com', password: 'whatever-1' } });
    assert.equal(response.status, status, code);
    assert.equal(response.json.error.code, code);
  }
});

test('register: enforces password rules, returns no session, links back only to allowed origins', async (t) => {
  const { call, calls } = await startApi(t);
  assert.equal((await call('POST', '/register', { body: { email: 'new@example.com', password: 'short' } })).json.error.code, 'WEAK_PASSWORD');
  assert.equal((await call('POST', '/register', { body: { email: 'new@example.com', password: 'x'.repeat(73) } })).status, 400);

  const ok = await call('POST', '/register', { body: { email: 'New@Example.com', password: 'long-enough-1' } });
  assert.equal(ok.status, 202);
  assert.deepEqual(ok.json, { status: 'verification_sent' });
  assert.equal(calls.signUp[0].email, 'new@example.com');
  assert.equal(calls.signUp[0].options.emailRedirectTo, `${ORIGIN}/verify-email`);

  await call('POST', '/register', { body: { email: 'evil@example.com', password: 'long-enough-1' }, origin: 'https://evil.example' });
  assert.equal(calls.signUp[1].options.emailRedirectTo, `${ORIGIN}/verify-email`, 'unlisted Origin must not be echoed into the email link');
});

test('forgot-password is neutral: same answer for any address, upstream errors hidden, rate limit surfaced', async (t) => {
  const { call, calls } = await startApi(t, { upstream: { reset: authError('user_not_found', 400) } });
  const response = await call('POST', '/forgot-password', { body: { email: 'anyone@example.com' } });
  assert.deepEqual([response.status, response.json], [200, { status: 'sent' }]);
  assert.equal(calls.reset[0].redirectTo, `${ORIGIN}/reset-password`);
  assert.equal((await call('POST', '/forgot-password', { body: { email: 'nope' } })).status, 400);

  const limited = await startApi(t, { upstream: { reset: authError('over_email_send_rate_limit', 429) } });
  assert.equal((await limited.call('POST', '/forgot-password', { body: { email: 'a@example.com' } })).status, 429);
});

test('reset-password only accepts a recovery-link token, and revokes every session afterwards', async (t) => {
  const { call, calls } = await startApi(t, { users: learner });
  const now = Math.floor(Date.now() / 1000);
  const recovery = jwt({ sub: 'u1', amr: [{ method: 'otp', timestamp: now }] });
  const loginToken = jwt({ sub: 'u1', amr: [{ method: 'password', timestamp: now }] });
  const stale = jwt({ sub: 'u1', amr: [{ method: 'otp', timestamp: now - 3 * 3600 }] });

  assert.equal((await call('POST', '/reset-password', { body: { password: 'brand-new-pass-1' } })).status, 401);
  const stolen = await call('POST', '/reset-password', { token: loginToken, body: { password: 'brand-new-pass-1' } });
  assert.equal(stolen.status, 403, 'a normal login token must not be able to reset the password');
  assert.equal(stolen.json.error.code, 'RECOVERY_REQUIRED');
  assert.equal((await call('POST', '/reset-password', { token: stale, body: { password: 'brand-new-pass-1' } })).json.error.code, 'RECOVERY_EXPIRED');
  assert.equal((await call('POST', '/reset-password', { token: recovery, body: { password: 'short' } })).json.error.code, 'WEAK_PASSWORD');
  assert.equal(calls.updateUser.length, 0);

  const ok = await call('POST', '/reset-password', { token: recovery, body: { password: 'brand-new-pass-1' } });
  assert.equal(ok.status, 200);
  assert.deepEqual(calls.updateUser, [{ id: 'u1', attrs: { password: 'brand-new-pass-1' } }]);
  assert.deepEqual(calls.signOut.at(-1), { token: recovery, scope: 'global' });
});

test('profile endpoints require a token and can only write the whitelisted display fields', async (t) => {
  const { call, calls, profiles } = await startApi(t, { profiles: { u1: { ...learnerProfile.u1 } } });
  const token = jwt({ sub: 'u1' });
  assert.equal((await call('GET', '/profile')).status, 401);
  assert.equal((await call('PATCH', '/profile', { body: { name: 'X' } })).status, 401);

  for (const body of [{ role: 'admin' }, { is_locked: false }, { email: 'a@b.co' }, { id: 'u2' }, {}, { name: '   ' }, { age: 0 }, { age: 121 }, { age: 3.5 }, { age: 'abc' },
    { bio: 'x'.repeat(501) }, { avatar_url: 'https://evil.example/x.png' }, { avatar_url: 'javascript:alert(1)' }, { name: 5 }]) {
    const response = await call('PATCH', '/profile', { token, body });
    assert.equal(response.status, 400, JSON.stringify(body));
  }
  assert.equal(calls.profileUpdates.length, 0, 'rejected requests must not touch the database');

  const ok = await call('PATCH', '/profile', { token, body: { name: '  Ada L.  ', age: 31, bio: '', avatar_url: 'data:image/jpeg;base64,/9j/4AAQ' } });
  assert.equal(ok.status, 200);
  assert.deepEqual(calls.profileUpdates, [{ id: 'u1', patch: { name: 'Ada L.', age: 31, bio: '', avatar_url: 'data:image/jpeg;base64,/9j/4AAQ' } }]);
  assert.equal(profiles.u1.role, 'learner');
  assert.equal(ok.json.profile.name, 'Ada L.');
  assert.equal((await call('GET', '/profile', { token })).json.profile.name, 'Ada L.');
});

test('me / profile refuse a locked account', async (t) => {
  const { call } = await startApi(t, { profiles: { u1: { ...learnerProfile.u1, is_locked: true } } });
  const token = jwt({ sub: 'u1' });
  assert.equal((await call('GET', '/me', { token })).json.error.code, 'ACCOUNT_LOCKED');
  assert.equal((await call('GET', '/profile', { token })).status, 403);
});

test('refresh and logout', async (t) => {
  const { call, calls } = await startApi(t);
  // No cookie, or a body token (never accepted here): nothing to refresh with.
  assert.equal((await call('POST', '/refresh')).json.error.code, 'INVALID_TOKEN');
  assert.equal((await call('POST', '/refresh', { body: { refresh_token: 'good-refresh' } })).status, 400);
  const rejected = await call('POST', '/refresh', { cookie: 'bashlab_rt=stolen-or-old' });
  assert.equal(rejected.status, 401);
  assert.match(rejected.headers.get('set-cookie'), /bashlab_rt=;.*Max-Age=0/); // dead cookie is cleared
  const ok = await call('POST', '/refresh', { cookie: 'other=1; bashlab_rt=good-refresh' });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.session.access_token, 'new');
  assert.equal(JSON.stringify(ok.json).includes('r2'), false);
  assert.match(ok.headers.get('set-cookie'), /^bashlab_rt=r2;/); // rotated cookie

  // Logout clears the cookie even without (or with an expired) access token...
  const bare = await call('POST', '/logout');
  assert.equal(bare.status, 200);
  assert.match(bare.headers.get('set-cookie'), /bashlab_rt=;.*Max-Age=0/);
  assert.equal(calls.signOut.length, 0);
  // ...and also revokes the session when a token is presented.
  const token = jwt({ sub: 'u1' });
  assert.equal((await call('POST', '/logout', { token })).status, 200);
  assert.deepEqual(calls.signOut.at(-1), { token, scope: 'local' });
});

test('cookie endpoints refuse requests from foreign or missing origins (CSRF)', async (t) => {
  const { call } = await startApi(t);
  for (const path of ['/refresh', '/logout', '/session']) {
    for (const origin of ['https://evil.example', null]) {
      const res = await call('POST', path, { origin, cookie: 'bashlab_rt=good-refresh', body: { refresh_token: 'good-refresh' } });
      assert.equal(res.status, 403, `${path} from ${origin}`);
      assert.equal(res.json.error.code, 'BAD_ORIGIN');
      assert.equal(res.headers.get('set-cookie'), null);
    }
  }
});

test('/session turns the emailed-link refresh token into the cookie (and nothing else can read it)', async (t) => {
  const { call } = await startApi(t);
  assert.equal((await call('POST', '/session', { body: { refresh_token: 'forged' } })).status, 401);
  const ok = await call('POST', '/session', { body: { refresh_token: 'good-refresh' } });
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get('set-cookie'), /^bashlab_rt=r2;.*HttpOnly/);
  assert.equal('refresh_token' in ok.json.session, false);
});

test('login is rate limited per account, and the limit leaves other accounts alone', async (t) => {
  const { call } = await startApi(t, { users: learner, profiles: { ...learnerProfile } }, { loginPerMinute: 3 });
  const attempt = (email) => call('POST', '/login', { body: { email, password: 'wrong-password' } });
  for (let i = 0; i < 3; i++) assert.equal((await attempt('ada@example.com')).status, 401);
  const blocked = await attempt('ada@example.com');
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  assert.equal((await attempt('someone-else@example.com')).status, 401);
});

test('malformed and oversized bodies are rejected cleanly', async (t) => {
  const { call } = await startApi(t);
  assert.equal((await call('POST', '/login', { raw: '{not json' })).status, 400);
  const huge = await call('POST', '/login', { body: { email: 'a@example.com', password: 'p'.repeat(20_000) } });
  assert.equal(huge.status, 413);
  assert.equal((await call('GET', '/nope')).status, 404);
});

test('CORS lets the frontend origin send PATCH with a bearer token, and nobody else', async (t) => {
  const server = createApp({ auth: false, sandbox: false }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/health`;
  const preflight = (origin) => fetch(url, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'PATCH', 'Access-Control-Request-Headers': 'authorization,content-type' } });
  const allowed = await preflight(ORIGIN);
  assert.match(allowed.headers.get('access-control-allow-methods'), /PATCH/);
  assert.equal(allowed.headers.get('access-control-allow-origin'), ORIGIN);
  assert.notEqual((await preflight('https://evil.example')).headers.get('access-control-allow-origin'), 'https://evil.example');
});
