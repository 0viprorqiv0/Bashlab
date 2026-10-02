import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/server.js';
import { SessionManager } from '../src/services/sessionManager.js';
import { MetricsService, escapeLabel, routeGroup } from '../src/services/metrics.js';

const idle = { manager: { sessions: new Map() }, runner: { limit: { activeCount: 0, pendingCount: 0 } } };
const render = (m) => m.toPrometheusText(idle);
// One sample line of the exposition format: name{label="value",...} number
// where a label value may only contain escaped characters.
const SAMPLE = /^[a-zA-Z_:][a-zA-Z0-9_:]*(\{([a-zA-Z_][a-zA-Z0-9_]*="([^"\\\n]|\\.)*"(,|(?=\})))*\})? [-+0-9.eE]+(NaN|Inf)?$/;
const assertValidExposition = (text) => {
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    assert.match(line, SAMPLE, `invalid Prometheus line: ${line}`);
  }
};

test('escapeLabel neutralises quotes, backslashes and newlines', () => {
  assert.equal(escapeLabel('plain'), 'plain');
  assert.equal(escapeLabel('a"b'), 'a\\"b');
  assert.equal(escapeLabel('a\\b'), 'a\\\\b');
  assert.equal(escapeLabel('a\nb'), 'a\\nb');
  assert.equal(escapeLabel('"},evil="1'), '\\"},evil=\\"1');
});

test('a hostile route on a matched (non-404) response still yields valid exposition text', () => {
  const m = new MetricsService();
  m.recordHttp('GET', '/api/we"ird', 200, 0.01);
  m.recordHttp('GET', '/api/back\\slash', 200, 0.01);
  m.recordHttp('GET', '/api/x",method="DELETE', 401, 0.01);
  const text = render(m);
  assertValidExposition(text);
  assert.match(text, /route="\/api\/we\\"ird"/);
  assert.doesNotMatch(text, /method="DELETE"/); // no label injection
});

test('unknown URLs (404) collapse into one "other" series instead of minting junk series', () => {
  const m = new MetricsService();
  for (let i = 0; i < 500; i++) m.recordHttp('GET', `/junk-${i}/"x`, 404, 0.001);
  assert.equal(m.http.size, 1);
  const text = render(m);
  assertValidExposition(text);
  assert.match(text, /route="other",class="4xx"\} 500/);
});

test('junk 404 traffic cannot push real routes into "other"', () => {
  const m = new MetricsService();
  for (let i = 0; i < 1000; i++) m.recordHttp('GET', `/nope${i}`, 404, 0.001);
  m.recordHttp('POST', '/api/auth/login', 200, 0.1);
  assert.match(render(m), /route="\/api\/auth\/login",class="2xx"\} 1/);
});

test('the series cap still protects against many distinct non-404 routes', () => {
  const m = new MetricsService();
  for (let i = 0; i < 400; i++) m.recordHttp('GET', `/r${i}`, 200, 0.001);
  assert.ok(m.http.size <= 201);
  assert.match(render(m), /route="other",class="2xx"\}/);
});

test('route grouping collapses ids and keeps query strings out of labels', () => {
  assert.equal(routeGroup('/api/progress/11111111-1111-4111-8111-111111111111?x=1'), '/api/progress/:id');
  assert.equal(routeGroup('/api/courses/42'), '/api/courses/:id');
  assert.equal(routeGroup(''), '/');
});

test('histogram buckets are cumulative and consistent with the count', () => {
  const m = new MetricsService();
  [0.005, 0.02, 0.2, 3].forEach((s) => m.recordHttp('GET', '/api/x', 200, s));
  const text = render(m);
  assert.match(text, /bashlab_http_request_duration_seconds_bucket\{le="0.01"\} 1/);
  assert.match(text, /bashlab_http_request_duration_seconds_bucket\{le="0.25"\} 3/);
  assert.match(text, /bashlab_http_request_duration_seconds_bucket\{le="\+Inf"\} 4/);
  assert.match(text, /bashlab_http_request_duration_seconds_count 4/);
});

test('over HTTP: a request for /zz"inject cannot corrupt what /metrics serves next', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bashlab-metrics-'));
  const app = createApp({ manager: new SessionManager({ root }), auth: false });
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(async () => { server.close(); await fs.rm(root, { recursive: true, force: true }); });
  const { port } = server.address();
  const raw = (reqPath) => new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: reqPath }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
  assert.equal((await raw('/zz"inject')).status, 404);
  assert.equal((await raw('/a\\b"c')).status, 404);
  const metricsResponse = await raw('/metrics');
  assert.equal(metricsResponse.status, 200);
  assertValidExposition(metricsResponse.body);
  assert.doesNotMatch(metricsResponse.body, /zz"inject/);
});
