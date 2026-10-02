import { HttpError } from '../errors.js';

// Feeds the admin Activity dashboard. Time series come from Prometheus (the
// same data Grafana shows); a few headline numbers come straight from the
// database so the page is useful even where Prometheus is not running.
//
// The browser never sends PromQL: it picks a RANGE, and the queries below are
// the only ones the server will ever run, so this cannot be turned into a way
// to read arbitrary Prometheus data or to make the server fetch arbitrary URLs.
export const RANGES = {
  '15m': { seconds: 15 * 60, step: 15 },
  '1h': { seconds: 60 * 60, step: 30 },
  '6h': { seconds: 6 * 60 * 60, step: 120 },
  '24h': { seconds: 24 * 60 * 60, step: 600 },
};

export const QUERIES = {
  sessions: 'bashlab_active_sessions',
  jobsActive: 'bashlab_runner_active_jobs',
  jobsPending: 'bashlab_runner_pending_jobs',
  commands: 'sum by (status) (rate(bashlab_commands_total[1m])) * 60',
  commandP95: 'histogram_quantile(0.95, sum by (le) (rate(bashlab_command_duration_seconds_bucket[1m])))',
  http: 'sum by (class) (rate(bashlab_http_requests_total[1m])) * 60',
  httpP95: 'histogram_quantile(0.95, sum by (le) (rate(bashlab_http_request_duration_seconds_bucket[1m])))',
  auth: 'sum by (event) (rate(bashlab_auth_events_total[5m])) * 60',
  memoryMb: 'bashlab_api_memory_bytes{type="rss"} / 1048576',
  cpu: 'sum(rate(bashlab_api_cpu_seconds_total[1m]))',
  rateLimited: 'sum(rate(bashlab_rate_limited_total[1m])) * 60',
};

const LABEL = { commands: 'status', http: 'class', auth: 'event' };

export function createDashboardService({ admin, prometheusUrl, fetchImpl = fetch, timeoutMs = 4000, now = () => Date.now() }) {
  async function prometheus(path, params) {
    const url = new URL(path, prometheusUrl);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error(`Prometheus answered ${response.status}`);
    const body = await response.json();
    if (body.status !== 'success') throw new Error(body.error || 'Prometheus query failed');
    return body.data.result;
  }

  async function series(name, query, { start, end, step }) {
    const result = await prometheus('/api/v1/query_range', { query, start, end, step });
    return result.map((item) => ({
      name: item.metric[LABEL[name]] || name,
      points: item.values
        .map(([ts, value]) => [Number(ts) * 1000, Number(value)])
        .filter(([, value]) => Number.isFinite(value)), // histogram_quantile yields NaN when idle
    }));
  }

  // `column` only has to exist (progress has no `id`, its key is user_id + lesson_id).
  async function count(table, build = (query) => query, column = 'id') {
    const { count: total, error } = await build(admin.from(table).select(column, { count: 'exact', head: true }));
    return error ? null : total;
  }

  async function databaseStats() {
    const since = new Date(now() - 24 * 60 * 60 * 1000).toISOString();
    const [users, admins, locked, activeSessions, sessions24h, completed24h] = await Promise.all([
      count('profiles'),
      count('profiles', (q) => q.eq('role', 'admin')),
      count('profiles', (q) => q.eq('is_locked', true)),
      count('practice_sessions', (q) => q.eq('status', 'active')),
      count('practice_sessions', (q) => q.gte('started_at', since)),
      count('progress', (q) => q.eq('status', 'done').gte('updated_at', since), 'lesson_id'),
    ]);
    return { users, admins, locked, activeSessions, sessions24h, completed24h };
  }

  return {
    async get(rangeKey = '1h') {
      const range = RANGES[rangeKey];
      if (!range) throw new HttpError(400, 'INVALID_INPUT', `range must be one of: ${Object.keys(RANGES).join(', ')}`);
      const end = Math.floor(now() / 1000);
      const window = { start: end - range.seconds, end, step: range.step };

      const stats = await databaseStats();
      let metrics = null;
      let reason = null;
      try {
        const entries = await Promise.all(Object.entries(QUERIES).map(async ([name, query]) => [name, await series(name, query, window)]));
        metrics = Object.fromEntries(entries);
      } catch (error) {
        reason = error.name === 'TimeoutError' ? 'Prometheus did not answer in time.' : 'Prometheus is not reachable.';
      }
      return { range: rangeKey, generatedAt: new Date(now()).toISOString(), stats, available: Boolean(metrics), reason, metrics };
    },
  };
}
