import { HttpError } from '../errors.js';

const bearerToken = (req) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  return scheme === 'Bearer' && token ? token : null;
};

// Verifies the caller's Supabase access token by asking Supabase itself
// (auth.getUser), instead of checking the JWT signature locally. One fewer
// secret to manage (no SUPABASE_JWT_SECRET), same trust boundary.
//
// Verified tokens are cached briefly: the sandbox is called on every command
// the learner types, and a ~200ms auth round trip per keystroke-Enter made the
// terminal feel laggy. A lock/ban therefore takes effect within `ttlMs`.
export function requireAuth(supabase, { ttlMs = 60_000, maxEntries = 5_000, now = () => Date.now() } = {}) {
  const cache = new Map();
  return async (req, _res, next) => {
    const token = bearerToken(req);
    if (!token) return next(new HttpError(401, 'UNAUTHENTICATED', 'Missing bearer token'));

    const cached = cache.get(token);
    if (cached && cached.expires > now()) {
      req.user = cached.user;
      req.accessToken = token;
      return next();
    }
    cache.delete(token);

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return next(new HttpError(401, 'UNAUTHENTICATED', 'Invalid or expired token'));
    }
    // A banned (admin-locked) account can still hold an unexpired JWT.
    if (data.user.banned_until && new Date(data.user.banned_until).getTime() > now()) {
      return next(new HttpError(403, 'ACCOUNT_LOCKED', 'Account is locked'));
    }
    const user = { id: data.user.id, email: data.user.email, emailConfirmedAt: data.user.email_confirmed_at || null };
    if (cache.size >= maxEntries) cache.delete(cache.keys().next().value);
    cache.set(token, { user, expires: now() + ttlMs });
    req.user = user;
    req.accessToken = token;
    next();
  };
}

// Reads role/lock state from profiles on every call — no caching — so a role
// change or lock takes effect immediately.
export async function isActiveAdmin(supabase, userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, is_locked')
    .eq('id', userId)
    .single();
  return !error && Boolean(data) && data.role === 'admin' && !data.is_locked;
}

// Must run after requireAuth.
export function requireAdmin(supabase) {
  return async (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'UNAUTHENTICATED', 'Call requireAuth before requireAdmin'));
    const { data, error } = await supabase
      .from('profiles')
      .select('role, is_locked')
      .eq('id', req.user.id)
      .single();
    if (error || !data) return next(new HttpError(403, 'FORBIDDEN', 'Profile not found'));
    if (data.is_locked) return next(new HttpError(403, 'ACCOUNT_LOCKED', 'Account is locked'));
    if (data.role !== 'admin') return next(new HttpError(403, 'FORBIDDEN', 'Admin role required'));
    next();
  };
}
