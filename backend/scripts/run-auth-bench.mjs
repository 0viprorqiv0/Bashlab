import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { performance } from 'node:perf_hooks';

const API_BASE = 'http://127.0.0.1:3001';

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return out;
}

const env = parseEnv(path.resolve('backend/.env'));
const adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function api(endpoint, { method = 'GET', token = null, body = undefined } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const start = performance.now();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const duration = performance.now() - start;
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, duration, data };
}

async function run() {
  console.log('--- Benchmarking Authenticated API Latencies ---');
  
  // 1. Measure Course Content Retrieval (GET /api/content/courses)
  const coursesTimes = [];
  for (let i = 0; i < 20; i++) {
    const res = await api('/api/content/courses');
    if (res.status === 200) coursesTimes.push(res.duration);
  }
  coursesTimes.sort((a, b) => a - b);
  const avgCourses = coursesTimes.reduce((a, b) => a + b, 0) / coursesTimes.length;
  const p50Courses = coursesTimes[Math.floor(coursesTimes.length * 0.5)];
  const p95Courses = coursesTimes[Math.floor(coursesTimes.length * 0.95)];

  // 2. Measure Auth Login (POST /api/auth/login)
  // Use existing admin user
  const loginTimes = [];
  let token = null;
  for (let i = 0; i < 10; i++) {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@bashlab.com', password: 'AuditPassword123!@#$' }
    });
    if (res.status === 200) {
      loginTimes.push(res.duration);
      token = res.data?.session?.access_token;
    }
  }

  // If login failed due to password, try adminClient signInWithPassword or generate token
  if (!token) {
    const anon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const { data: user } = await adminClient.auth.admin.createUser({
      email: `bench_user_${Date.now()}@bashlab.test`,
      password: 'BenchPassword123!',
      email_confirm: true
    });
    const s = await anon.auth.signInWithPassword({ email: user.user.email, password: 'BenchPassword123!' });
    token = s.data.session.access_token;
  }

  // 3. Measure Authenticated Session Executions with Cached Token (POST /api/sessions/:id/execute)
  const sRes = await api('/api/sessions', { method: 'POST', token });
  const sId = sRes.data?.sessionId;

  const execTimes = [];
  for (let i = 0; i < 20; i++) {
    const res = await api(`/api/sessions/${sId}/execute`, {
      method: 'POST',
      token,
      body: { command: 'echo "bench"' }
    });
    if (res.status === 200) execTimes.push(res.duration);
  }
  execTimes.sort((a, b) => a - b);
  const avgExec = execTimes.reduce((a, b) => a + b, 0) / execTimes.length;
  const p50Exec = execTimes[Math.floor(execTimes.length * 0.5)];
  const p95Exec = execTimes[Math.floor(execTimes.length * 0.95)];

  // 4. Measure Metrics Endpoint (GET /metrics)
  const metricTimes = [];
  for (let i = 0; i < 20; i++) {
    const res = await api('/metrics');
    if (res.status === 200) metricTimes.push(res.duration);
  }
  metricTimes.sort((a, b) => a - b);
  const avgMetric = metricTimes.reduce((a, b) => a + b, 0) / metricTimes.length;
  const p50Metric = metricTimes[Math.floor(metricTimes.length * 0.5)];
  const p95Metric = metricTimes[Math.floor(metricTimes.length * 0.95)];

  // Cleanup session
  if (sId) await api(`/api/sessions/${sId}`, { method: 'DELETE', token });

  const results = {
    contentCourses: { avg: avgCourses, p50: p50Courses, p95: p95Courses, count: coursesTimes.length },
    commandExecCachedToken: { avg: avgExec, p50: p50Exec, p95: p95Exec, count: execTimes.length },
    metricsEndpoint: { avg: avgMetric, p50: p50Metric, p95: p95Metric, count: metricTimes.length }
  };

  console.log('Results:', JSON.stringify(results, null, 2));
  fs.writeFileSync('backend/benchmarks/auth_benchmarks.json', JSON.stringify(results, null, 2));
}

run().catch(console.error);
