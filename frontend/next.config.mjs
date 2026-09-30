const isDev = process.env.NODE_ENV !== 'production';

// Origins the browser may talk to besides itself: the BashLab API and (read-only
// data) Supabase. Anything else - including an injected third-party script's
// beacon - is blocked by the CSP below.
const origin = (value) => { try { return value ? new URL(value).origin : null; } catch { return null; } };
const apiOrigin = origin(process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_SANDBOX_API_URL)
  || (isDev ? 'http://127.0.0.1:3001' : null);
const connect = ["'self'", apiOrigin, origin(process.env.NEXT_PUBLIC_SUPABASE_URL), isDev ? 'ws:' : null].filter(Boolean);

const csp = [
  "default-src 'self'",
  // Next.js emits inline bootstrap scripts; a nonce-based policy needs
  // dynamic rendering for every page, so inline is allowed, eval is not (prod).
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  `connect-src ${connect.join(' ')}`,
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]),
];

export default {
  // Keep WSL and Windows build output separate on the shared /mnt/c checkout.
  distDir: process.platform === 'win32' ? '.next-win' : '.next-wsl',
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
