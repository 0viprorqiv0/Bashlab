import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize, memoryMiB } from './benchmarkStats.js';
test('benchmark uses nearest-rank percentiles and separates successful throughput', () => {
  const result = summarize([{ ms: 10, ok: true }, { ms: 20, ok: false }, { ms: 30, ok: true }, { ms: 100, ok: true }], 2000);
  assert.equal(result.averageMs, 40);
  assert.equal(result.p50Ms, 20);
  assert.equal(result.p95Ms, 100);
  assert.equal(result.throughput, 2);
  assert.equal(result.successThroughput, 1.5);
  assert.equal(result.successRate, 75);
  assert.equal(memoryMiB('128MiB / 512MiB'), 128);
  assert.equal(memoryMiB('1.5GiB / 2GiB'), 1536);
});
