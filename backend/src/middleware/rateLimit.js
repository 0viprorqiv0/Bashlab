import { HttpError } from '../errors.js';
import { metrics } from '../services/metrics.js';

// Fixed-window limiter. `key(req)` picks what is counted (default: client IP).
export function rateLimiter(max, windowMs = 60000, { key = (req) => req.ip, code = 'RATE_LIMIT', message = 'Too many requests from this IP', now = () => Date.now() } = {}) {
  const buckets = new Map();
  let lastSweep = 0;
  return (req, res, next) => {
    const t = now();
    if (t - lastSweep >= windowMs) {
      for (const [k, item] of buckets) if (item.reset <= t) buckets.delete(k);
      lastSweep = t;
    }
    const id = key(req);
    let bucket = buckets.get(id);
    if (!bucket || bucket.reset <= t) {
      if (buckets.size >= 10000) return next(new HttpError(503, 'RATE_CAPACITY', 'Rate limiter capacity reached'));
      bucket = { count: 0, reset: t + windowMs };
      buckets.set(id, bucket);
    }
    if (++bucket.count > max) {
      metrics.recordRateLimit();
      res.set('Retry-After', String(Math.ceil((bucket.reset - t) / 1000)));
      return next(new HttpError(429, code, message));
    }
    next();
  };
}
