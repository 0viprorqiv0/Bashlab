// Base URL of the BashLab backend API (backend/src/server.js): authentication,
// account/profile and the practice sandbox all live there.
const configured = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_SANDBOX_API_URL || '';
export const API_BASE = (configured || (process.env.NODE_ENV === 'production' ? '' : 'http://127.0.0.1:3001')).replace(/\/$/, '');

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
