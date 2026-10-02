import express from 'express';
import { HttpError } from '../errors.js';
import { rateLimiter } from '../middleware/rateLimit.js';
import { MAX_AVATAR_CHARS } from '../services/authService.js';
import { REFRESH_COOKIE, clearRefreshCookie, readCookie, setRefreshCookie } from '../lib/cookies.js';

// Emailed links (verify email, reset password) must point back at OUR
// frontend. The caller's Origin is honoured only if it is on the CORS
// allow-list, so this can't be turned into an open redirect / phishing hop.
export function frontendBase(req, origins) {
  const origin = req.headers.origin;
  return origin && origins.includes(origin) ? origin : origins[0];
}

// Endpoints that act on the refresh COOKIE are the only place CSRF could matter
// (everything else needs a bearer token a foreign site can't attach). Besides
// SameSite=Lax, they require an Origin header from the allow-list.
export const requireTrustedOrigin = (origins) => (req, _res, next) => {
  if (!origins.includes(req.headers.origin)) return next(new HttpError(403, 'BAD_ORIGIN', 'Request origin is not allowed.'));
  next();
};

const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

// `service` = createAuthService(...); `authenticate` = requireAuth(...).
export function createAuthRouter({ service, authenticate, origins, limits = {} }) {
  const router = express.Router();
  // Per-IP budgets are generous (a whole classroom can share one NAT address);
  // brute force is stopped by the per-(ip,email) login limit below.
  const { perMinute = 300, sensitivePerMinute = 60, loginPerMinute = 8 } = limits;

  router.use(rateLimiter(perMinute, 60000, { message: 'Too many requests. Please slow down.' }));
  const sensitive = rateLimiter(sensitivePerMinute, 60000, { code: 'RATE_LIMIT', message: 'Too many attempts. Please wait a minute and try again.' });
  // Brute-force guard per (ip, email) on top of Supabase's own limits.
  const perAccount = rateLimiter(loginPerMinute, 60000, {
    key: (req) => `${req.ip}|${String(req.body?.email || '').trim().toLowerCase()}`,
    message: 'Too many login attempts. Please wait a minute and try again.',
  });

  const json = express.json({ limit: '16kb', strict: true });
  const bigJson = express.json({ limit: `${Math.ceil(MAX_AVATAR_CHARS * 1.4 / 1024)}kb`, strict: true });

  router.post('/register', sensitive, json, wrap(async (req, res) => {
    res.status(202).json(await service.register({ ...req.body, redirectTo: `${frontendBase(req, origins)}/verify-email` }));
  }));

  // The session's refresh token never appears in a response body: it is set
  // as an HttpOnly cookie and `refreshToken` is stripped from the JSON.
  const sendSession = (res, { refreshToken, ...body }) => {
    setRefreshCookie(res, refreshToken);
    res.json(body);
  };
  const trusted = requireTrustedOrigin(origins);

  router.post('/login', sensitive, json, perAccount, wrap(async (req, res) => {
    sendSession(res, await service.login(req.body || {}));
  }));

  // New access token from the cookie (rotating the cookie). A refresh token
  // the server rejects also clears the cookie, so the browser stops sending it.
  router.post('/refresh', trusted, wrap(async (req, res) => {
    try {
      sendSession(res, await service.refresh({ refreshToken: readCookie(req, REFRESH_COOKIE) }));
    } catch (error) {
      if ([400, 401].includes(error.status)) clearRefreshCookie(res);
      throw error;
    }
  }));

  // Emailed verification links land in the browser with the session in the URL
  // fragment; the page hands that refresh token here once, and from then on it
  // only exists as the HttpOnly cookie.
  router.post('/session', trusted, sensitive, json, wrap(async (req, res) => {
    sendSession(res, await service.refresh({ refreshToken: req.body?.refresh_token }));
  }));

  // Works with an expired access token too: clearing the cookie is what ends
  // the browser's session; revoking server-side is best effort.
  router.post('/logout', trusted, wrap(async (req, res) => {
    clearRefreshCookie(res);
    const [scheme, accessToken] = (req.headers.authorization || '').split(' ');
    if (scheme === 'Bearer' && accessToken) await service.logout({ accessToken });
    res.json({ status: 'signed_out' });
  }));

  router.post('/forgot-password', sensitive, json, wrap(async (req, res) => {
    res.json(await service.forgotPassword({ email: req.body?.email, redirectTo: `${frontendBase(req, origins)}/reset-password` }));
  }));

  router.post('/resend-verification', sensitive, json, wrap(async (req, res) => {
    res.json(await service.resendVerification({ email: req.body?.email, redirectTo: `${frontendBase(req, origins)}/verify-email` }));
  }));

  router.post('/reset-password', sensitive, authenticate, json, wrap(async (req, res) => {
    clearRefreshCookie(res); // every session was just revoked; drop the dead cookie too
    res.json(await service.resetPassword({ accessToken: req.accessToken, password: req.body?.password }));
  }));

  router.get('/me', authenticate, wrap(async (req, res) => res.json(await service.me({ user: req.user }))));
  router.get('/profile', authenticate, wrap(async (req, res) => res.json(await service.getProfile({ user: req.user }))));
  router.patch('/profile', authenticate, bigJson, wrap(async (req, res) => {
    res.json(await service.updateProfile({ user: req.user, body: req.body }));
  }));

  router.use((_req, _res, next) => next(new HttpError(404, 'NOT_FOUND', 'Endpoint not found')));
  return router;
}
