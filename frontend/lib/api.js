// The browser talks to Next.js on the current origin. next.config.mjs proxies
// /api/* to the backend, so localhost always means the server running the app.
export const API_BASE = '';
export const API_CONFIGURED = process.env.NEXT_PUBLIC_API_CONFIGURED === 'true';

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
