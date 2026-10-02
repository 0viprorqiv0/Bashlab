// The refresh token lives ONLY in this cookie: HttpOnly (page JavaScript can
// never read it, so an XSS cannot steal a long-lived session), scoped to
// /api/auth (sent to nothing else) and SameSite=Lax (not attached to
// cross-site POSTs). Access tokens are short-lived and kept in memory by the
// frontend.
export const REFRESH_COOKIE = 'bashlab_rt';
const THIRTY_DAYS = 30 * 24 * 60 * 60;

export function readCookie(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) {
      try { return decodeURIComponent(part.slice(index + 1).trim()); } catch { return null; }
    }
  }
  return null;
}

const secure = () => process.env.COOKIE_SECURE === 'true'
  || (process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production');

export function setRefreshCookie(res, token) {
  res.append('Set-Cookie', `${REFRESH_COOKIE}=${encodeURIComponent(token)}; Path=/api/auth; Max-Age=${THIRTY_DAYS}; HttpOnly; SameSite=Lax${secure() ? '; Secure' : ''}`);
}

export function clearRefreshCookie(res) {
  res.append('Set-Cookie', `${REFRESH_COOKIE}=; Path=/api/auth; Max-Age=0; HttpOnly; SameSite=Lax${secure() ? '; Secure' : ''}`);
}
