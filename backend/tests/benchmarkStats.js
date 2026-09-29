export function summarize(results, durationMs) {
  const sorted = results.map(item => item.ms).sort((a, b) => a - b);
  const count = sorted.length;
  const passed = results.filter(item => item.ok).length;
  const percentile = p => sorted[Math.max(0, Math.ceil(count * p) - 1)] || 0;
  return { requests: count, averageMs: sorted.reduce((a, b) => a + b, 0) / (count || 1),
    p50Ms: percentile(0.5), p95Ms: percentile(0.95), throughput: count * 1000 / durationMs,
    successThroughput: passed * 1000 / durationMs, successRate: passed * 100 / (count || 1) };
}
export function memoryMiB(value) {
  const match = String(value).match(/^\s*([\d.]+)\s*(B|KiB|MiB|GiB|TiB|kB|KB|MB|GB)\b/);
  if (!match) return null;
  const factors = { B: 1, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3, TiB: 1024 ** 4,
    kB: 1000, KB: 1000, MB: 1000 ** 2, GB: 1000 ** 3 };
  return Number(match[1]) * factors[match[2]] / 1024 ** 2;
}
