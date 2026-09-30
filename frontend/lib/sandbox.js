// Admin activity can stop a previously recorded sandbox session.
const BASE = (process.env.NEXT_PUBLIC_SANDBOX_API_URL || '').replace(/\/$/, '');

export const sandboxEnabled = Boolean(BASE);

export function endSession(sessionId) {
  fetch(`${BASE}/api/sessions/${sessionId}`, { method: 'DELETE', keepalive: true }).catch(() => {});
}
