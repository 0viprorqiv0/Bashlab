/**
 * BashLab Prometheus & System Metrics Service
 */

const BUCKETS = [0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 3.0, 5.0];
const HTTP_BUCKETS = [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0];
const MAX_HTTP_SERIES = 200; // a hostile client must not be able to mint unlimited label values

// Collapses ids so /api/admin/lessons/<uuid> and /api/progress/<uuid> become one series each.
export const routeGroup = (path = '') => path.split('?')[0].split('/').slice(0, 5)
  .map((part) => (/^[0-9a-f]{8}-[0-9a-f]{4}-|^\d+$/i.test(part) ? ':id' : part)).join('/') || '/';
const statusClass = (status) => `${Math.floor(status / 100)}xx`;

// What an HTTP outcome means for the "who is signing in" panel.
const AUTH_EVENTS = {
  'POST /api/auth/login': (s) => (s === 200 ? 'login_ok' : s === 429 ? 'login_throttled' : 'login_failed'),
  'POST /api/auth/register': (s) => (s < 300 ? 'register' : null),
  'POST /api/auth/refresh': (s) => (s === 200 ? 'refresh_ok' : 'refresh_failed'),
  'POST /api/auth/logout': (s) => (s === 200 ? 'logout' : null),
  'POST /api/auth/forgot-password': (s) => (s === 200 ? 'password_reset_requested' : null),
};

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
    this.http = new Map(); // `${method} ${group} ${statusClass}` -> count
    this.httpDurationSum = 0;
    this.httpDurationCount = 0;
    this.httpBucketCounts = new Array(HTTP_BUCKETS.length).fill(0);
    this.authEvents = new Map();
    this.sessionsCreated = 0;
  }

  recordHttp(method, path, status, durationSec) {
    const group = routeGroup(path);
    let key = `${method} ${group} ${statusClass(status)}`;
    if (!this.http.has(key) && this.http.size >= MAX_HTTP_SERIES) key = `${method} other ${statusClass(status)}`;
    this.http.set(key, (this.http.get(key) || 0) + 1);
    this.httpDurationSum += durationSec;
    this.httpDurationCount++;
    for (let i = 0; i < HTTP_BUCKETS.length; i++) if (durationSec <= HTTP_BUCKETS[i]) this.httpBucketCounts[i]++;
    const event = AUTH_EVENTS[`${method} ${group}`]?.(status);
    if (event) this.authEvents.set(event, (this.authEvents.get(event) || 0) + 1);
  }

  recordSessionCreated() {
    this.sessionsCreated++;
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

    // HTTP API
    out += '# HELP bashlab_http_requests_total HTTP requests by method, route group and status class\n';
    out += '# TYPE bashlab_http_requests_total counter\n';
    for (const [key, count] of this.http) {
      const [method, route, klass] = key.split(' ');
      out += `bashlab_http_requests_total{method="${method}",route="${route}",class="${klass}"} ${count}\n`;
    }
    out += '\n# HELP bashlab_http_request_duration_seconds HTTP request duration in seconds\n';
    out += '# TYPE bashlab_http_request_duration_seconds histogram\n';
    for (let i = 0; i < HTTP_BUCKETS.length; i++) {
      out += `bashlab_http_request_duration_seconds_bucket{le="${HTTP_BUCKETS[i]}"} ${this.httpBucketCounts[i]}\n`;
    }
    out += `bashlab_http_request_duration_seconds_bucket{le="+Inf"} ${this.httpDurationCount}\n`;
    out += `bashlab_http_request_duration_seconds_sum ${this.httpDurationSum.toFixed(4)}\n`;
    out += `bashlab_http_request_duration_seconds_count ${this.httpDurationCount}\n\n`;

    out += '# HELP bashlab_auth_events_total Sign-in related events\n';
    out += '# TYPE bashlab_auth_events_total counter\n';
    for (const [event, count] of this.authEvents) out += `bashlab_auth_events_total{event="${event}"} ${count}\n`;
    out += '\n# HELP bashlab_sessions_created_total Practice sandbox sessions opened\n';
    out += '# TYPE bashlab_sessions_created_total counter\n';
    out += `bashlab_sessions_created_total ${this.sessionsCreated}\n\n`;

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
