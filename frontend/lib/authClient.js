// Frontend side of authentication. The browser never talks to Supabase Auth:
// every login/register/reset/refresh/profile call goes to the backend API
// (/api/auth/*).
//
// Where the session lives (nothing secret is ever written to web storage):
//   - the refresh token: an HttpOnly cookie set by the API — page JavaScript
//     (and therefore any injected script) cannot read it;
//   - the access token (~1h): in memory only, re-issued from the cookie when the
//     page loads or the token is about to expire;
//   - localStorage keeps just the signed-in user's id as a hint, so pages can
//     start fetching data before the network round-trip that confirms it.
import { ApiError, apiFetch } from './api';

const HINT_KEY = 'bashlab.uid';
const LEGACY_KEY = 'bashlab.session'; // older builds stored the tokens here
const REFRESH_MARGIN_MS = 60_000;

const listeners = new Set();
let access = null; // { token, expiresAt } — memory only
let hintMemory = null; // used when localStorage is unavailable (private mode)
let refreshing = null;

const emit = (event, payload) => listeners.forEach((listener) => listener(event, payload));

function readHint() {
  try {
    return window.localStorage.getItem(HINT_KEY) || hintMemory;
  } catch {
    return hintMemory;
  }
}

function writeHint(userId) {
  hintMemory = userId;
  try {
    if (userId) window.localStorage.setItem(HINT_KEY, userId);
    else window.localStorage.removeItem(HINT_KEY);
  } catch { /* storage blocked: memory copy still works for this tab */ }
}

function setSession(session, userId) {
  access = session ? { token: session.access_token, expiresAt: session.expires_at * 1000 } : null;
  if (userId !== undefined) writeHint(userId);
}

// A user id inside a JWT, read locally (not verified): used when the API
// response did not carry the user (silent refresh).
function subjectOf(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).sub || null;
  } catch {
    return null;
  }
}

if (typeof window !== 'undefined') {
  // Tokens that an older build left in web storage are removed, not migrated:
  // they are exactly what this design keeps out of reach of scripts.
  try { window.localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
  // Another tab logged in/out: tell this tab's UI.
  window.addEventListener('storage', (event) => {
    if (event.key === HINT_KEY) {
      access = null; // whoever is signed in now is decided by the cookie, not by this tab's old token
      emit('SESSION_CHANGED');
    }
  });
}

export const authClient = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  hasSession: () => Boolean(readHint()),

  // The signed-in user's id as remembered by this browser (no network, NOT
  // verified). Good only for starting data requests early — RLS still decides
  // what comes back, and /api/auth/me remains the authority on who is signed in.
  peekUserId: () => readHint(),

  // A token that is valid right now, re-issued from the refresh cookie when the
  // page has none yet or it is about to expire. null = signed out.
  async getAccessToken() {
    if (access && access.expiresAt - Date.now() > REFRESH_MARGIN_MS) return access.token;
    if (!readHint()) return null; // never signed in here: don't ask the API
    if (!refreshing) {
      refreshing = apiFetch('/api/auth/refresh', { method: 'POST' })
        .then((data) => {
          setSession(data.session, subjectOf(data.session.access_token));
          emit('TOKEN_REFRESHED');
          return data.session.access_token;
        })
        .catch((error) => {
          // Only a rejected refresh token ends the session; a network blip must not log the user out.
          if (error instanceof ApiError && [400, 401, 403].includes(error.status)) {
            setSession(null, null);
            emit('SIGNED_OUT');
            return null;
          }
          return access?.token || null;
        })
        .finally(() => { refreshing = null; });
    }
    return refreshing;
  },

  async login(email, password) {
    const data = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password } });
    setSession(data.session, data.user.id);
    emit('SIGNED_IN', { user: data.user, profile: data.profile });
    return data;
  },

  register: (email, password) => apiFetch('/api/auth/register', { method: 'POST', body: { email, password } }),
  forgotPassword: (email) => apiFetch('/api/auth/forgot-password', { method: 'POST', body: { email } }),
  resendVerification: (email) => apiFetch('/api/auth/resend-verification', { method: 'POST', body: { email } }),

  // `token` is the recovery token from the emailed link, not the login session.
  async resetPassword(token, password) {
    const result = await apiFetch('/api/auth/reset-password', { method: 'POST', token, body: { password } });
    setSession(null, null); // every session was revoked by the reset
    return result;
  },

  async logout() {
    const token = access?.token;
    setSession(null, null);
    emit('SIGNED_OUT');
    // Clears the cookie (and revokes the session when a token is at hand).
    await apiFetch('/api/auth/logout', { method: 'POST', token }).catch(() => {});
  },

  // Emailed verification links land on /verify-email#access_token=…&refresh_token=…:
  // the refresh token is handed to the API once, which turns it into the
  // HttpOnly cookie; the URL fragment is already wiped by the page.
  async adoptSession({ refresh_token: refreshToken }) {
    const { session } = await apiFetch('/api/auth/session', { method: 'POST', body: { refresh_token: refreshToken } });
    setSession(session, subjectOf(session.access_token));
    const data = await apiFetch('/api/auth/me', { token: session.access_token });
    setSession(session, data.user.id);
    emit('SIGNED_IN', data);
    return data;
  },

  async fetchMe() {
    const token = await this.getAccessToken();
    if (!token) return null;
    try {
      return await apiFetch('/api/auth/me', { token });
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        setSession(null, null);
        emit('SIGNED_OUT', { reason: error.code });
        return null;
      }
      throw error;
    }
  },

  async fetchProfile() {
    const token = await this.getAccessToken();
    if (!token) throw new ApiError('You are signed out.', { status: 401, code: 'UNAUTHENTICATED' });
    return (await apiFetch('/api/auth/profile', { token })).profile;
  },

  async updateProfile(patch) {
    const token = await this.getAccessToken();
    if (!token) throw new ApiError('You are signed out.', { status: 401, code: 'UNAUTHENTICATED' });
    const { profile } = await apiFetch('/api/auth/profile', { method: 'PATCH', token, body: patch });
    emit('PROFILE_UPDATED', { profile });
    return profile;
  },
};
