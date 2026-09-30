// Frontend side of authentication. The browser never talks to Supabase Auth:
// every login/register/reset/refresh/profile call goes to the backend API
// (/api/auth/*). This module only stores the returned session and keeps it
// fresh by asking the API to refresh it.
import { ApiError, apiFetch } from './api';

const STORAGE_KEY = 'bashlab.session';
const REFRESH_MARGIN_MS = 60_000;

const listeners = new Set();
let memory = null; // used when localStorage is unavailable (private mode)
let refreshing = null;

const emit = (event, payload) => listeners.forEach((listener) => listener(event, payload));

function readSession() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : memory;
  } catch {
    return memory;
  }
}

function writeSession(session) {
  memory = session;
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch { /* storage blocked: memory copy still works for this tab */ }
}

if (typeof window !== 'undefined') {
  // Another tab logged in/out or refreshed: tell this tab's UI.
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) emit('SESSION_CHANGED');
  });
}

export const authClient = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  hasSession: () => Boolean(readSession()?.access_token),

  // The user id inside the stored token, read locally (no network, NOT
  // verified). Good only for starting data requests early — RLS still decides
  // what comes back, and /api/auth/me remains the authority on who is signed
  // in. Lets pages fetch their data in parallel with that check instead of
  // waiting ~250ms for it.
  peekUserId() {
    try {
      const token = readSession()?.access_token;
      const payload = token?.split('.')[1];
      if (!payload) return null;
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json).sub || null;
    } catch {
      return null;
    }
  },

  // A token that is valid right now, refreshing through the API when it is
  // about to expire. null = signed out.
  async getAccessToken() {
    const session = readSession();
    if (!session?.access_token) return null;
    if (session.expires_at * 1000 - Date.now() > REFRESH_MARGIN_MS) return session.access_token;
    if (!refreshing) {
      refreshing = apiFetch('/api/auth/refresh', { method: 'POST', body: { refresh_token: session.refresh_token } })
        .then((data) => {
          writeSession(data.session);
          emit('TOKEN_REFRESHED');
          return data.session.access_token;
        })
        .catch((error) => {
          // Only a rejected refresh token ends the session; a network blip must not log the user out.
          if (error instanceof ApiError && [400, 401].includes(error.status)) {
            writeSession(null);
            emit('SIGNED_OUT');
            return null;
          }
          return session.access_token;
        })
        .finally(() => { refreshing = null; });
    }
    return refreshing;
  },

  async login(email, password) {
    const data = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password } });
    writeSession(data.session);
    emit('SIGNED_IN', { user: data.user, profile: data.profile });
    return data;
  },

  register: (email, password) => apiFetch('/api/auth/register', { method: 'POST', body: { email, password } }),
  forgotPassword: (email) => apiFetch('/api/auth/forgot-password', { method: 'POST', body: { email } }),
  resendVerification: (email) => apiFetch('/api/auth/resend-verification', { method: 'POST', body: { email } }),

  // `token` is the recovery token from the emailed link, not the login session.
  resetPassword: (token, password) => apiFetch('/api/auth/reset-password', { method: 'POST', token, body: { password } }),

  async logout() {
    const token = readSession()?.access_token;
    writeSession(null);
    emit('SIGNED_OUT');
    if (token) await apiFetch('/api/auth/logout', { method: 'POST', token }).catch(() => {});
  },

  // Emailed verification links land on /verify-email#access_token=…: confirm the
  // token with the API and, if valid, start the session from it.
  async adoptSession({ access_token: token, refresh_token: refreshToken, expires_at: expiresAt, expires_in: expiresIn }) {
    const data = await apiFetch('/api/auth/me', { token });
    writeSession({
      access_token: token,
      refresh_token: refreshToken,
      expires_in: Number(expiresIn) || 3600,
      expires_at: Number(expiresAt) || Math.floor(Date.now() / 1000) + (Number(expiresIn) || 3600),
    });
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
        writeSession(null);
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
