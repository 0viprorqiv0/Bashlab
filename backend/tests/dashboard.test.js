import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/server.js';
import { SessionManager } from '../src/services/sessionManager.js';
import { HttpError } from '../src/errors.js';
import { createDashboardService, QUERIES, RANGES } from '../src/services/dashboardService.js';
import { MetricsService, routeGroup } from '../src/services/metrics.js';

// Chainable stand-in for the service-role client: every count() resolves to 7.
const fakeAdmin = () => ({
  from: () => {
    const q = { select: () => q, eq: () => q, gte: () => q, then: (resolve) => resolve({ count: 7, error: null }) };
    return q;
  },
});

const PROM_OK = (queryLog) => async (url) => {
  queryLog.push(Object.fromEntries(new URL(url).searchParams));
  return {
    ok: true,
    json: async () => ({
      status: 'success',
      data: { result: [{ metric: { status: 'completed', class: '2xx', event: 'login_ok' }, values: [[1700000000, '1.5'], [1700000015, 'NaN'], [1700000030, '2']] }] },
    }),
  };
};

test('dashboard runs only its own whitelisted queries, over the requested window', async () => {
  const log = [];
  const service = createDashboardService({ admin: fakeAdmin(), prometheusUrl: 'http://prom.invalid:9090', fetchImpl: PROM_OK(log), now: () => 1_700_000_100_000 });
  const result = await service.get('15m');
  assert.equal(result.available, true);
  assert.deepEqual(new Set(log.map((q) => q.query)), new Set(Object.values(QUERIES)));
  for (const q of log) {
    assert.equal(Number(q.end) - Number(q.start), RANGES['15m'].seconds);
    assert.equal(Number(q.step), RANGES['15m'].step);
  }
  // series are named by their label, timestamps become ms, NaN points are dropped
  assert.equal(result.metrics.commands[0].name, 'completed');
  assert.deepEqual(result.metrics.commands[0].points, [[1700000000000, 1.5], [1700000030000, 2]]);
  assert.equal(result.stats.users, 7);
  assert.equal(result.stats.completed24h, 7);
});

test('an unknown range is a 400, and nothing from the caller reaches PromQL', async () => {
  const log = [];
  const service = createDashboardService({ admin: fakeAdmin(), prometheusUrl: 'http://prom.invalid', fetchImpl: PROM_OK(log) });
  await assert.rejects(() => service.get('1y'), (error) => error.status === 400);
  await assert.rejects(() => service.get('1h; drop'), (error) => error.status === 400);
  assert.equal(log.length, 0);
});

test('when Prometheus is down the dashboard still answers with database numbers', async () => {
  const service = createDashboardService({ admin: fakeAdmin(), prometheusUrl: 'http://prom.invalid', fetchImpl: async () => { throw new Error('ECONNREFUSED'); } });
  const result = await service.get('1h');
  assert.equal(result.available, false);
  assert.equal(result.metrics, null);
  assert.match(result.reason, /not reachable/);
  assert.equal(result.stats.users, 7);
});

async function start(t) {
  const service = createDashboardService({ admin: fakeAdmin(), prometheusUrl: 'http://prom.invalid', fetchImpl: PROM_OK([]) });
  const auth = {
    authenticate: (req, _res, next) => {
      const [, token] = (req.headers.authorization || '').split(' ');
      if (!token) return next(new HttpError(401, 'UNAUTHENTICATED', 'Missing bearer token'));
      req.user = { id: token };
      next();
    },
    isAdmin: async (id) => id === 'admin',
    maxSessionsPerUser: 3,
  };
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bashlab-dash-'));
  const server = createApp({ manager: new SessionManager({ root }), rateMax: 1000, auth, content: { service: {}, dashboard: service }, sandbox: false }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); await fs.rm(root, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  return (user, url) => fetch(base + url, { headers: user ? { Authorization: `Bearer ${user}` } : {} });
}

test('GET /api/admin/dashboard is admin-only', async (t) => {
  const get = await start(t);
  assert.equal((await get(null, '/api/admin/dashboard')).status, 401);
  assert.equal((await get('alice', '/api/admin/dashboard')).status, 403);
  const ok = await get('admin', '/api/admin/dashboard?range=1h');
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).available, true);
  assert.equal((await get('admin', '/api/admin/dashboard?range=nope')).status, 400);
});

test('every request is counted by route group, and sign-in outcomes become auth events', () => {
  const m = new MetricsService();
  m.recordHttp('POST', '/api/auth/login', 401, 0.02);
  m.recordHttp('POST', '/api/auth/login', 200, 0.2);
  m.recordHttp('POST', '/api/auth/login', 429, 0.001);
  m.recordHttp('PUT', '/api/progress/11111111-1111-4111-8111-111111111111', 204, 0.05);
  m.recordHttp('GET', '/api/admin/lessons/22222222-2222-4222-8222-222222222222?x=1', 200, 0.05);
  m.recordSessionCreated();
  const text = m.toPrometheusText({ manager: { sessions: new Map() }, runner: { limit: { activeCount: 0, pendingCount: 0 } } });
  assert.match(text, /bashlab_http_requests_total\{method="PUT",route="\/api\/progress\/:id",class="2xx"\} 1/);
  assert.match(text, /route="\/api\/admin\/lessons\/:id"/);
  for (const event of ['login_failed', 'login_ok', 'login_throttled']) assert.match(text, new RegExp(`bashlab_auth_events_total\\{event="${event}"\\} 1`));
  assert.match(text, /bashlab_sessions_created_total 1/);
  assert.match(text, /bashlab_http_request_duration_seconds_count 5/);
});

test('hostile paths cannot create unlimited metric series', () => {
  const m = new MetricsService();
  for (let i = 0; i < 1000; i++) m.recordHttp('GET', `/api/x${i}/y`, 404, 0.001);
  assert.ok(m.http.size <= 201);
  assert.equal(routeGroup('/api/a/b/c/d/e/f'), '/api/a/b/c');
});

test('/metrics with METRICS_TOKEN requires the bearer token from any network', async (t) => {
  process.env.METRICS_TOKEN = 'scrape-secret';
  t.after(() => { delete process.env.METRICS_TOKEN; });
  const get = await start(t);
  assert.equal((await get(null, '/metrics')).status, 401);
  assert.equal((await get('wrong-token', '/metrics')).status, 401);
  const ok = await get('scrape-secret', '/metrics');
  assert.equal(ok.status, 200);
  assert.match(await ok.text(), /bashlab_active_sessions/);
});
