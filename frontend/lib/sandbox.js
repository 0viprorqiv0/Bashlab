// Client for the sandbox endpoints of the backend API (backend/src/server.js).
// When the server runs with SANDBOX_ENABLED=false (e.g. no Docker) they answer
// 503 SANDBOX_DISABLED and the lab falls back to manual completion.
// Every call carries the learner's access token: the API only lets a user
// touch sandbox sessions they created.
import { API_BASE as BASE } from './api';
import { authClient } from './authClient';

export const sandboxEnabled = Boolean(BASE) && process.env.NEXT_PUBLIC_SANDBOX_ENABLED !== 'false';

async function authHeader() {
  const token = await authClient.getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function call(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(await authHeader()), ...options.headers },
  });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.error?.message || `Sandbox error ${response.status}`);
    error.status = response.status;
    error.code = body?.error?.code;
    throw error;
  }
  return body;
}

// lessonId lets the API record the practice session (admin Activity page).
export const createSession = (lessonId) => call('/api/sessions', { method: 'POST', body: JSON.stringify({ lessonId }) });

export const runCommand = (sessionId, command) =>
  call(`/api/sessions/${sessionId}/execute`, { method: 'POST', body: JSON.stringify({ command }) });

export const resetSession = (sessionId) => call(`/api/sessions/${sessionId}/reset`, { method: 'POST' });

// Fire-and-forget (also used while the page unloads, hence keepalive).
export function endSession(sessionId) {
  authHeader()
    .then((headers) => fetch(`${BASE}/api/sessions/${sessionId}`, { method: 'DELETE', keepalive: true, headers }))
    .catch(() => {});
}
