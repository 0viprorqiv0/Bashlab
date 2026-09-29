// Client for the Express sandbox API (backend/src/server.js). Disabled when
// NEXT_PUBLIC_SANDBOX_API_URL is unset — e.g. on a machine without Docker.
const BASE = (process.env.NEXT_PUBLIC_SANDBOX_API_URL || '').replace(/\/$/, '');

export const sandboxEnabled = Boolean(BASE);

async function call(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
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

export const createSession = () => call('/api/sessions', { method: 'POST' });

export const runCommand = (sessionId, command) =>
  call(`/api/sessions/${sessionId}/execute`, { method: 'POST', body: JSON.stringify({ command }) });

export const checkSolution = (sessionId, lessonId) =>
  call(`/api/sessions/${sessionId}/check`, { method: 'POST', body: JSON.stringify({ lessonId }) });

export const resetSession = (sessionId) => call(`/api/sessions/${sessionId}/reset`, { method: 'POST' });

export function endSession(sessionId) {
  fetch(`${BASE}/api/sessions/${sessionId}`, { method: 'DELETE', keepalive: true }).catch(() => {});
}
