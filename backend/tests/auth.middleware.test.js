import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAuth, requireAdmin } from '../src/middleware/auth.js';

function mockSupabase({ user = null, profile = null, profileError = null } = {}) {
  return {
    auth: {
      async getUser(token) {
        if (token !== 'valid-token') return { data: null, error: { message: 'invalid' } };
        return { data: { user }, error: null };
      },
    },
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        async single() {
          if (profileError) return { data: null, error: profileError };
          return { data: profile, error: null };
        },
      };
    },
  };
}

function mockReqRes(headers = {}) {
  const req = { headers };
  const res = {};
  let nextArg;
  const next = (arg) => { nextArg = arg; };
  return { req, res, next: (arg) => next(arg), getNextArg: () => nextArg };
}

test('requireAuth rejects a missing bearer token', async () => {
  const middleware = requireAuth(mockSupabase());
  const { req, res, next, getNextArg } = mockReqRes({});
  await middleware(req, res, next);
  assert.equal(getNextArg().status, 401);
  assert.equal(getNextArg().code, 'UNAUTHENTICATED');
});

test('requireAuth rejects an invalid token', async () => {
  const middleware = requireAuth(mockSupabase());
  const { req, res, next, getNextArg } = mockReqRes({ authorization: 'Bearer bad-token' });
  await middleware(req, res, next);
  assert.equal(getNextArg().status, 401);
});

test('requireAuth attaches req.user on a valid token', async () => {
  const user = { id: 'user-1', email: 'a@b.com' };
  const middleware = requireAuth(mockSupabase({ user }));
  const { req, res, next, getNextArg } = mockReqRes({ authorization: 'Bearer valid-token' });
  await middleware(req, res, next);
  assert.equal(getNextArg(), undefined);
  assert.deepEqual(req.user, { id: 'user-1', email: 'a@b.com', emailConfirmedAt: null });
  assert.equal(req.accessToken, 'valid-token');
});

test('requireAuth caches a verified token so each command does not re-hit Supabase', async () => {
  let calls = 0;
  const supabase = mockSupabase({ user: { id: 'user-1', email: 'a@b.com' } });
  const getUser = supabase.auth.getUser;
  supabase.auth.getUser = async (token) => { calls += 1; return getUser(token); };
  let clock = 1_000;
  const middleware = requireAuth(supabase, { ttlMs: 60_000, now: () => clock });
  for (let i = 0; i < 5; i++) {
    const { req, res, next, getNextArg } = mockReqRes({ authorization: 'Bearer valid-token' });
    await middleware(req, res, next);
    assert.equal(getNextArg(), undefined);
    assert.equal(req.user.id, 'user-1');
  }
  assert.equal(calls, 1);
  clock += 60_001; // past the TTL: verified again
  const { req, res, next } = mockReqRes({ authorization: 'Bearer valid-token' });
  await middleware(req, res, next);
  assert.equal(calls, 2);
});

test('requireAuth rejects a locked (banned) account that still holds a valid JWT', async () => {
  const user = { id: 'user-1', email: 'a@b.com', banned_until: '2126-01-01T00:00:00Z' };
  const middleware = requireAuth(mockSupabase({ user }), { now: () => Date.parse('2026-09-30T00:00:00Z') });
  const { req, res, next, getNextArg } = mockReqRes({ authorization: 'Bearer valid-token' });
  await middleware(req, res, next);
  assert.equal(getNextArg().status, 403);
  assert.equal(getNextArg().code, 'ACCOUNT_LOCKED');
});

test('requireAdmin rejects a learner role', async () => {
  const supabase = mockSupabase({ profile: { role: 'learner', is_locked: false } });
  const middleware = requireAdmin(supabase);
  const { req, res, next, getNextArg } = mockReqRes();
  req.user = { id: 'user-1' };
  await middleware(req, res, next);
  assert.equal(getNextArg().status, 403);
  assert.equal(getNextArg().code, 'FORBIDDEN');
});

test('requireAdmin rejects a locked admin', async () => {
  const supabase = mockSupabase({ profile: { role: 'admin', is_locked: true } });
  const middleware = requireAdmin(supabase);
  const { req, res, next, getNextArg } = mockReqRes();
  req.user = { id: 'user-1' };
  await middleware(req, res, next);
  assert.equal(getNextArg().code, 'ACCOUNT_LOCKED');
});

test('requireAdmin allows an unlocked admin through', async () => {
  const supabase = mockSupabase({ profile: { role: 'admin', is_locked: false } });
  const middleware = requireAdmin(supabase);
  const { req, res, next, getNextArg } = mockReqRes();
  req.user = { id: 'user-1' };
  await middleware(req, res, next);
  assert.equal(getNextArg(), undefined);
});

test('requireAdmin without a prior requireAuth is unauthenticated', async () => {
  const middleware = requireAdmin(mockSupabase());
  const { req, res, next, getNextArg } = mockReqRes();
  await middleware(req, res, next);
  assert.equal(getNextArg().status, 401);
});
