// Base URL of the BashLab backend API (backend/src/server.js): authentication,
// account/profile and the practice sandbox all live there.
const configured = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_SANDBOX_API_URL || '';
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

// The session cookie is host-scoped and SameSite=Lax, so in development the API
// must be reached through the SAME hostname as the page (localhost:3000 ->
// localhost:3001, never localhost -> 127.0.0.1, which counts as another site and
// would not receive the cookie). A loopback API address is therefore rewritten
// to whatever loopback name the page itself was opened with.
function resolveBase() {
  let base = configured || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');
  if (typeof window !== 'undefined' && LOOPBACK.has(window.location.hostname)) {
    try {
      const url = new URL(base);
      if (LOOPBACK.has(url.hostname)) { url.hostname = window.location.hostname; base = url.origin; }
    } catch { /* relative or empty base: nothing to rewrite */ }
  }
  return base.replace(/\/$/, '');
}
export const API_BASE = resolveBase();

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR' } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch(path, { method = 'GET', body, token, headers } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include', // the HttpOnly refresh cookie (only ever sent to /api/auth)
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.');
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.error?.message || `Request failed (${response.status})`, {
      status: response.status,
      code: data?.error?.code || 'REQUEST_FAILED',
    });
  }
  return data;
}
