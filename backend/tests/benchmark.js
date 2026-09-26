import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { summarize, memoryMiB } from './benchmarkStats.js';

const base = process.env.BENCH_URL || 'http://127.0.0.1:3001';
const target = new URL(base);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) throw new Error('Run this benchmark against a local BashLab API');
const rounds = Number(process.env.BENCH_ROUNDS || 3);
if (!Number.isInteger(rounds) || rounds < 1 || rounds > 20) throw new Error('BENCH_ROUNDS must be 1–20');
const command = 'printf "BashLab benchmark\\n"; pwd';
const container = process.env.RUNNER_CONTAINER || 'bashlab-box';
const output = path.resolve(process.env.BENCH_OUTPUT || 'benchmarks/latest.json');

async function request(route, method = 'GET', body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const data = response.status === 204 ? null : await response.json();
  return { status: response.status, data };
}

function runnerSampler() {
  const samples = [];
  const child = spawn('docker', ['stats', container, '--format', '{{json .}}'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let pending = '';
  let warning = '';
  let closed = false;
  child.stdout.on('data', chunk => {
    pending += chunk.toString().replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');
    const lines = pending.split('\n');
    pending = lines.pop();
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        const cpu = Number.parseFloat(data.CPUPerc ?? data.CPU);
        const ram = memoryMiB(data.MemUsage ?? data.MemUsageBytes);
        if (Number.isFinite(cpu) && ram !== null) samples.push({ at: performance.now(), cpu, ram });
      } catch { /* Ignore partial/non-JSON terminal output. */ }
    }
  });
  child.stderr.on('data', chunk => { warning = (warning + chunk.toString()).slice(0, 2000); });
  child.on('error', error => { warning = error.message; closed = true; });
  child.on('close', () => { closed = true; });
  return { samples, warning: () => warning, async warmup() {
    const until = performance.now() + 5000;
    while (!samples.length && !closed && performance.now() < until) await new Promise(resolve => setTimeout(resolve, 100));
  }, stop() {
    child.kill('SIGTERM');
    // Some Docker-compatible statistics streams ignore TERM while awaiting data.
    const timer = setTimeout(() => { if (!closed) child.kill('SIGKILL'); }, 1000);
    timer.unref();
    child.once('close', () => clearTimeout(timer));
  } };
}

async function runLevel(concurrency, ids, sampler) {
  const results = [];
  const apiBefore = (await request('/metrics')).data;
  let apiPeakRam = apiBefore.rss;
  let sampling = false;
  let sampleTask = Promise.resolve();
  const timer = setInterval(() => {
    if (sampling) return;
    sampling = true;
    sampleTask = request('/metrics').then(({ data }) => { apiPeakRam = Math.max(apiPeakRam, data.rss); })
      .catch(() => {}).finally(() => { sampling = false; });
  }, 200);
  const start = performance.now();
  let end;
  try {
    for (let round = 0; round < rounds; round++) {
      await Promise.all(ids.slice(0, concurrency).map(async id => {
        const started = performance.now();
        try {
          const { status, data } = await request(`/api/sessions/${id}/execute`, 'POST', { command });
          results.push({ ms: performance.now() - started, status,
            ok: status === 200 && data.exitCode === 0 && data.termination === 'completed' && !data.quotaExceeded,
            outcome: data.error?.code || data.termination || String(status) });
        } catch (error) { results.push({ ms: performance.now() - started, status: 0, ok: false, outcome: error.name }); }
      }));
    }
  } finally { end = performance.now(); clearInterval(timer); await sampleTask; }
  const after = (await request('/metrics')).data;
  const observed = sampler.samples.filter(item => item.at >= start && item.at <= end);
  const outcomes = {};
  for (const result of results) outcomes[result.outcome] = (outcomes[result.outcome] || 0) + 1;
  return { concurrency, rounds, durationMs: end - start, ...summarize(results, end - start),
    runnerCpuPeak: observed.length ? Math.max(...observed.map(item => item.cpu)) : null,
    runnerRamPeakMiB: observed.length ? Math.max(...observed.map(item => item.ram)) : null,
    runnerSamples: observed.length,
    apiCpuAverage: ((after.cpu.user + after.cpu.system) - (apiBefore.cpu.user + apiBefore.cpu.system)) / ((end - start) * 10),
    apiRamPeakMiB: Math.max(apiPeakRam, after.rss) / 1024 ** 2, outcomes,
    runnerTelemetry: observed.map(item => ({ elapsedMs: item.at - start, cpu: item.cpu, ramMiB: item.ram })), results };
}

const ids = [];
const sampler = runnerSampler();
try {
  const health = await request('/health');
  if (health.status !== 200) throw new Error('API is not ready');
  console.log('Local burst benchmark: 10, 20, 30, 50 concurrent requests; 4 execution slots.');
  console.log('For capacity measurement start API with RATE_LIMIT_MAX=10000; default 30/min measures rate limiting.');
  for (let i = 0; i < 50; i++) {
    const { status, data } = await request('/api/sessions', 'POST', {});
    if (status !== 201) throw new Error(`Session setup HTTP ${status}: ${data.error?.message}. Use RATE_LIMIT_MAX=10000 for this run.`);
    ids.push(data.sessionId);
  }
  // Warm the executor and Docker's statistics stream before timing requests.
  await request(`/api/sessions/${ids[0]}/execute`, 'POST', { command });
  await sampler.warmup();
  const rows = [];
  for (const concurrency of [10, 20, 30, 50]) {
    const row = await runLevel(concurrency, ids, sampler);
    rows.push(row);
    console.log(`Completed concurrency ${concurrency}: ${row.successRate.toFixed(1)}% success`);
  }
  const fixed = value => value === null ? 'N/A' : value.toFixed(2);
  const headers = ['Concurrent', 'Requests', 'Avg ms', 'p50 ms', 'p95 ms', 'req/s', 'OK req/s', 'Runner CPU peak %', 'Runner RAM peak MiB', 'API CPU avg %', 'API RAM peak MiB', 'Success %'];
  console.log('\n| ' + headers.join(' | ') + ' |');
  console.log('| ' + headers.map(() => '---').join(' | ') + ' |');
  for (const row of rows) console.log('| ' + [row.concurrency, row.requests, fixed(row.averageMs), fixed(row.p50Ms), fixed(row.p95Ms), fixed(row.throughput), fixed(row.successThroughput), fixed(row.runnerCpuPeak), fixed(row.runnerRamPeakMiB), fixed(row.apiCpuAverage), fixed(row.apiRamPeakMiB), fixed(row.successRate)].join(' | ') + ' |');
  console.log('\nLatency includes queue time and failures; req/s counts every response. CPU 100% = one core. RAM/CPU peaks are sampled, not absolute maxima.');
  for (const row of rows) console.log(`C=${row.concurrency}: ${JSON.stringify(row.outcomes)}, runner samples=${row.runnerSamples}`);
  if (sampler.warning()) console.error('Runner metrics:', sampler.warning());
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify({ measuredAt: new Date().toISOString(), base, container, command,
    environment: { node: process.version, kernel: os.release(), platform: os.platform(),
      cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, hostRamMiB: os.totalmem() / 1024 ** 2 }, rows }, null, 2) + '\n');
  console.log(`Raw measurements: ${output}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  sampler.stop();
  for (const id of ids) {
    try {
      const { status } = await request(`/api/sessions/${id}`, 'DELETE');
      if (status !== 204) console.error(`Cleanup ${id}: HTTP ${status}; reaper will retry idle sessions.`);
    } catch { console.error(`Cleanup failed for ${id}`); }
  }
}
