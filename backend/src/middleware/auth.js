import { HttpError } from '../errors.js';

// Verifies the caller's Supabase access token by asking Supabase itself
// (auth.getUser), instead of checking the JWT signature locally. One fewer
// secret to manage (no SUPABASE_JWT_SECRET), same trust boundary.
export function requireAuth(supabase) {
  return async (req, _res, next) => {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      return next(new HttpError(401, 'UNAUTHENTICATED', 'Missing bearer token'));
    }
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return next(new HttpError(401, 'UNAUTHENTICATED', 'Invalid or expired token'));
    }
    req.user = { id: data.user.id, email: data.user.email };
    next();
  };
}

// Must run after requireAuth. Reads role/lock state from profiles on every
// call — no caching — so a role change or lock takes effect immediately.
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
