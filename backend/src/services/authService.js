import { HttpError } from '../errors.js';

// All authentication and account logic lives here (not in the browser). The
// frontend only ever calls the /api/auth routes in ../routes/auth.js.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AVATAR = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
export const MAX_AVATAR_CHARS = 300_000;
// Recovery links must be used soon after they are issued.
const RECOVERY_MAX_AGE_SECONDS = 60 * 60;

const fail = (status, code, message) => new HttpError(status, code, message);

export function validateEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !EMAIL.test(email)) throw fail(400, 'INVALID_EMAIL', 'Enter a valid email address.');
  return email;
}

export function validatePassword(value) {
  if (typeof value !== 'string' || value.length < 8) throw fail(400, 'WEAK_PASSWORD', 'Use at least 8 characters.');
  // bcrypt (used by Supabase) silently ignores everything past 72 bytes.
  if (Buffer.byteLength(value) > 72) throw fail(400, 'WEAK_PASSWORD', 'Use at most 72 characters.');
  return value;
}

const text = (value, max, label) => {
  if (typeof value !== 'string') throw fail(400, 'INVALID_PROFILE', `${label} must be text.`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw fail(400, 'INVALID_PROFILE', `${label} must be at most ${max} characters.`);
  return trimmed;
};

// Only these columns can ever be written through the API — never role,
// is_locked or email.
export function validateProfilePatch(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail(400, 'INVALID_PROFILE', 'Send an object of profile fields.');
  const allowed = ['name', 'bio', 'age', 'location', 'occupation', 'avatar_url'];
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));
  if (unknown.length) throw fail(400, 'INVALID_PROFILE', `Unknown field: ${unknown[0]}`);
  const patch = {};
  if ('name' in body) {
    patch.name = text(body.name, 80, 'Full name');
    if (!patch.name) throw fail(400, 'INVALID_PROFILE', 'Full name cannot be empty.');
  }
  if ('bio' in body) patch.bio = text(body.bio, 500, 'Bio');
  if ('location' in body) patch.location = text(body.location, 100, 'Location');
  if ('occupation' in body) patch.occupation = text(body.occupation, 100, 'Occupation');
  if ('age' in body) {
    if (body.age === null || body.age === '') patch.age = null;
    else if (Number.isInteger(body.age) && body.age >= 1 && body.age <= 120) patch.age = body.age;
    else throw fail(400, 'INVALID_PROFILE', 'Age must be a whole number between 1 and 120.');
  }
  if ('avatar_url' in body) {
    if (body.avatar_url === null) patch.avatar_url = null;
    else if (typeof body.avatar_url === 'string' && body.avatar_url.length <= MAX_AVATAR_CHARS && AVATAR.test(body.avatar_url)) patch.avatar_url = body.avatar_url;
    else throw fail(400, 'INVALID_PROFILE', 'Avatar must be a PNG, JPEG or WebP image under about 200KB.');
  }
  if (!Object.keys(patch).length) throw fail(400, 'INVALID_PROFILE', 'No profile fields to update.');
  return patch;
}

// Translates Supabase Auth errors into stable API errors the UI can act on.
export function mapAuthError(error) {
  const code = error?.code || error?.error_code || '';
  const status = error?.status || 0;
  switch (code) {
    case 'invalid_credentials':
    case 'invalid_grant':
      return fail(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    case 'email_not_confirmed':
      return fail(403, 'EMAIL_NOT_CONFIRMED', 'Please verify your email address before logging in.');
    case 'user_banned':
      return fail(403, 'ACCOUNT_LOCKED', 'Your account has been locked by an administrator.');
    case 'weak_password':
      return fail(422, 'WEAK_PASSWORD', error.message || 'Choose a stronger password.');
    case 'same_password':
      return fail(422, 'SAME_PASSWORD', 'Choose a password different from your current one.');
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
    case 'over_sms_send_rate_limit':
      return fail(429, 'RATE_LIMIT', 'Too many attempts. Please wait a minute and try again.');
    case 'refresh_token_not_found':
    case 'refresh_token_already_used':
    case 'session_not_found':
    case 'session_expired':
    case 'bad_jwt':
      return fail(401, 'UNAUTHENTICATED', 'Your session has expired. Please log in again.');
    default:
      if (status === 429) return fail(429, 'RATE_LIMIT', 'Too many attempts. Please wait a minute and try again.');
      if (status >= 500 || status === 0) return fail(502, 'UPSTREAM_ERROR', 'The authentication service is unavailable. Please try again shortly.');
      return fail(400, 'AUTH_ERROR', error?.message || 'Authentication failed.');
  }
}

// The refresh token is deliberately NOT part of what the browser's JavaScript
// receives: the route layer moves it into an HttpOnly cookie.
const publicSession = (session) => ({
  access_token: session.access_token,
  expires_at: session.expires_at,
  expires_in: session.expires_in,
});

const publicProfile = (profile, { full = false } = {}) => ({
  name: profile?.name || '',
  role: profile?.role === 'admin' ? 'admin' : 'learner',
  ...(full ? {
    bio: profile?.bio || '',
    avatar_url: profile?.avatar_url || null,
    age: profile?.age ?? null,
    location: profile?.location || '',
    occupation: profile?.occupation || '',
  } : {}),
});

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  email_confirmed_at: user.email_confirmed_at || user.emailConfirmedAt || null,
  created_at: user.created_at || user.createdAt || null,
});

// admin: service-role client. anon: () => fresh anon-key client (see lib/supabaseAdmin.js).
export function createAuthService({ admin, anon, log = console }) {
  const readProfile = async (userId, columns) => {
    const { data, error } = await admin.from('profiles').select(columns).eq('id', userId).maybeSingle();
    if (error) throw fail(502, 'UPSTREAM_ERROR', 'Could not load your profile. Please try again.');
    return data;
  };

  return {
    async register({ email, password, redirectTo }) {
      const { error } = await anon().auth.signUp({ email: validateEmail(email), password: validatePassword(password), options: { emailRedirectTo: redirectTo } });
      if (error) throw mapAuthError(error);
      // Same answer for a new address and an already-registered one: the API
      // must not reveal which emails have accounts. It also never returns a
      // session here — a fresh account has to verify its email first.
      return { status: 'verification_sent' };
    },

    async login({ email, password }) {
      const { data, error } = await anon().auth.signInWithPassword({ email: validateEmail(email), password: typeof password === 'string' ? password : '' });
      if (error) throw mapAuthError(error);
      const profile = await readProfile(data.user.id, 'name, role, is_locked');
      if (profile?.is_locked) {
        await admin.auth.admin.signOut(data.session.access_token, 'local').catch(() => {});
        throw fail(403, 'ACCOUNT_LOCKED', 'Your account has been locked by an administrator.');
      }
      return { session: publicSession(data.session), refreshToken: data.session.refresh_token, user: publicUser(data.user), profile: publicProfile(profile) };
    },

    async refresh({ refreshToken }) {
      if (typeof refreshToken !== 'string' || !refreshToken) throw fail(400, 'INVALID_TOKEN', 'refresh_token is required.');
      const { data, error } = await anon().auth.refreshSession({ refresh_token: refreshToken });
      if (error || !data.session) throw error ? mapAuthError(error) : fail(401, 'UNAUTHENTICATED', 'Your session has expired. Please log in again.');
      return { session: publicSession(data.session), refreshToken: data.session.refresh_token };
    },

    async logout({ accessToken }) {
      // Revokes this device's session; failures don't matter to the caller —
      // the client discards its tokens either way.
      await admin.auth.admin.signOut(accessToken, 'local').catch((error) => log.warn?.('logout revoke failed:', error?.message));
      return { status: 'signed_out' };
    },

    async forgotPassword({ email, redirectTo }) {
      const { error } = await anon().auth.resetPasswordForEmail(validateEmail(email), { redirectTo });
      if (error) {
        const mapped = mapAuthError(error);
        if (mapped.status === 429) throw mapped;
        // Anything else stays neutral so an attacker can't probe for accounts.
        log.warn?.('forgot-password upstream error:', error.code || error.message);
      }
      return { status: 'sent' };
    },

    async resendVerification({ email, redirectTo }) {
      const { error } = await anon().auth.resend({ type: 'signup', email: validateEmail(email), options: { emailRedirectTo: redirectTo } });
      if (error) {
        const mapped = mapAuthError(error);
        if (mapped.status === 429) throw mapped;
        log.warn?.('resend upstream error:', error.code || error.message);
      }
      return { status: 'sent' };
    },

    // The token must come from an emailed recovery link (JWT amr method "otp"),
    // not from a normal password login: otherwise a stolen session token could
    // change the password without knowing the old one.
    async resetPassword({ accessToken, password, now = () => Date.now() }) {
      const next = validatePassword(password);
      const claims = decodeClaims(accessToken);
      const recovery = (claims?.amr || []).find((entry) => entry.method === 'otp');
      if (!recovery) throw fail(403, 'RECOVERY_REQUIRED', 'Use the password reset link from your email.');
      if (now() / 1000 - Number(recovery.timestamp || 0) > RECOVERY_MAX_AGE_SECONDS) {
        throw fail(401, 'RECOVERY_EXPIRED', 'This reset link has expired. Request a new one.');
      }
      const { data: current } = await admin.auth.getUser(accessToken);
      const userId = current?.user?.id;
      if (!userId) throw fail(401, 'UNAUTHENTICATED', 'This reset link is invalid or has expired.');
      const { error } = await admin.auth.admin.updateUserById(userId, { password: next });
      if (error) throw mapAuthError(error);
      // Every existing session (including the recovery one) is now invalid.
      await admin.auth.admin.signOut(accessToken, 'global').catch(() => {});
      return { status: 'password_updated' };
    },

    async me({ user }) {
      const profile = await readProfile(user.id, 'name, role, is_locked');
      if (profile?.is_locked) throw fail(403, 'ACCOUNT_LOCKED', 'Your account has been locked by an administrator.');
      return { user: publicUser(user), profile: publicProfile(profile) };
    },

    async getProfile({ user }) {
      const profile = await readProfile(user.id, 'name, role, bio, avatar_url, age, location, occupation, is_locked');
      if (profile?.is_locked) throw fail(403, 'ACCOUNT_LOCKED', 'Your account has been locked by an administrator.');
      return { profile: publicProfile(profile, { full: true }) };
    },

    async updateProfile({ user, body }) {
      const patch = validateProfilePatch(body);
      const { data, error } = await admin.from('profiles').update(patch).eq('id', user.id)
        .select('name, role, bio, avatar_url, age, location, occupation').maybeSingle();
      if (error) throw fail(502, 'UPSTREAM_ERROR', 'Could not save your profile. Please try again.');
      if (!data) throw fail(404, 'PROFILE_NOT_FOUND', 'Profile not found.');
      return { profile: publicProfile(data, { full: true }) };
    },
  };
}

function decodeClaims(token) {
  try {
    return JSON.parse(Buffer.from(String(token).split('.')[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}
