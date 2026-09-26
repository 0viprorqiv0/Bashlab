/**
 * BashLab Prometheus & System Metrics Service
 */

const BUCKETS = [0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 3.0, 5.0];

export class MetricsService {
  constructor() {
    this.counters = {
      completed: 0,
      timeout: 0,
      error: 0,
      quota_exceeded: 0,
      rate_limited: 0,
    };
    this.durationSum = 0;
    this.durationCount = 0;
    this.bucketCounts = new Array(BUCKETS.length).fill(0);
  }

  recordCommand(status, durationMs = 0) {
    if (Object.hasOwn(this.counters, status)) {
      this.counters[status]++;
    } else {
      this.counters.completed++;
    }
    const durationSec = durationMs / 1000;
    this.durationSum += durationSec;
    this.durationCount++;
    for (let i = 0; i < BUCKETS.length; i++) {
      if (durationSec <= BUCKETS[i]) {
        this.bucketCounts[i]++;
      }
    }
  }

  recordRateLimit() {
    this.counters.rate_limited++;
  }

  toJSON({ manager, runner }) {
    return {
      cpu: process.cpuUsage(),
      rss: process.memoryUsage().rss,
      sessions: manager.sessions.size,
      active: runner.limit.activeCount,
      pending: runner.limit.pendingCount,
      counters: { ...this.counters },
    };
  }

  toPrometheusText({ manager, runner }) {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();
    const activeSessions = manager.sessions.size;
    const activeJobs = runner.limit.activeCount;
    const pendingJobs = runner.limit.pendingCount;

    let out = '';
    // App & Process Metrics
    out += '# HELP bashlab_active_sessions Number of active student sessions\n';
    out += '# TYPE bashlab_active_sessions gauge\n';
    out += `bashlab_active_sessions ${activeSessions}\n\n`;

    out += '# HELP bashlab_runner_active_jobs Number of commands currently executing\n';
    out += '# TYPE bashlab_runner_active_jobs gauge\n';
    out += `bashlab_runner_active_jobs ${activeJobs}\n\n`;

    out += '# HELP bashlab_runner_pending_jobs Number of commands waiting in admission queue\n';
    out += '# TYPE bashlab_runner_pending_jobs gauge\n';
    out += `bashlab_runner_pending_jobs ${pendingJobs}\n\n`;

    out += '# HELP bashlab_api_memory_bytes Node.js process memory breakdown\n';
    out += '# TYPE bashlab_api_memory_bytes gauge\n';
    out += `bashlab_api_memory_bytes{type="rss"} ${mem.rss}\n`;
    out += `bashlab_api_memory_bytes{type="heapTotal"} ${mem.heapTotal}\n`;
    out += `bashlab_api_memory_bytes{type="heapUsed"} ${mem.heapUsed}\n\n`;

    out += '# HELP bashlab_api_cpu_seconds_total Node.js CPU usage in seconds\n';
    out += '# TYPE bashlab_api_cpu_seconds_total counter\n';
    out += `bashlab_api_cpu_seconds_total{mode="user"} ${(cpu.user / 1e6).toFixed(4)}\n`;
    out += `bashlab_api_cpu_seconds_total{mode="system"} ${(cpu.system / 1e6).toFixed(4)}\n\n`;

    // Command Counters
    out += '# HELP bashlab_commands_total Total commands executed by outcome\n';
    out += '# TYPE bashlab_commands_total counter\n';
    out += `bashlab_commands_total{status="completed"} ${this.counters.completed}\n`;
    out += `bashlab_commands_total{status="timeout"} ${this.counters.timeout}\n`;
    out += `bashlab_commands_total{status="error"} ${this.counters.error}\n`;
    out += `bashlab_commands_total{status="quota_exceeded"} ${this.counters.quota_exceeded}\n\n`;

    out += '# HELP bashlab_rate_limited_total Total requests rejected by rate limiter\n';
    out += '# TYPE bashlab_rate_limited_total counter\n';
    out += `bashlab_rate_limited_total ${this.counters.rate_limited}\n\n`;

    // Latency Histogram
    out += '# HELP bashlab_command_duration_seconds Command execution duration in seconds\n';
    out += '# TYPE bashlab_command_duration_seconds histogram\n';
    let cumulative = 0;
    for (let i = 0; i < BUCKETS.length; i++) {
      cumulative += this.bucketCounts[i];
      out += `bashlab_command_duration_seconds_bucket{le="${BUCKETS[i]}"} ${cumulative}\n`;
    }
    out += `bashlab_command_duration_seconds_bucket{le="+Inf"} ${this.durationCount}\n`;
    out += `bashlab_command_duration_seconds_sum ${this.durationSum.toFixed(4)}\n`;
    out += `bashlab_command_duration_seconds_count ${this.durationCount}\n`;

    return out;
  }
}

export const metrics = new MetricsService();
