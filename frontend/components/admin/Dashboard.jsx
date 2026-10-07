'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApi } from '@/lib/writeApi';
import styles from './Admin.module.css';
import dash from './Dashboard.module.css';
import LineChart from './LineChart';

const RANGES = ['15m', '1h', '6h', '24h'];
const REFRESH_MS = 10_000;
const GRAFANA_URL = process.env.NEXT_PUBLIC_GRAFANA_URL || '';

const METRIC_CATEGORIES = [
  { id: 'sandbox', label: 'Terminal & Sandbox', icon: 'terminal' },
  { id: 'api', label: 'API & Reliability', icon: 'sync_alt' },
  { id: 'system', label: 'System & Security', icon: 'shield' },
];

const last = (series) => series?.flatMap((item) => item.points.slice(-1).map(([, v]) => v)).reduce((a, b) => a + b, 0);
const number = (value, digits = 0) => (value == null || !Number.isFinite(value) ? '—' : value.toFixed(digits));

function Stat({ label, value, hint }) {
  return (
    <div className={styles.stat}>
      <dt>{label}</dt>
      <dd>{value}</dd>
      {hint ? <small className={dash.hint}>{hint}</small> : null}
    </div>
  );
}

// "Live" numbers: the latest sample of each Prometheus series.
function liveStats(metrics) {
  if (!metrics) return null;
  const errors = metrics.http?.filter((s) => s.name === '5xx').flatMap((s) => s.points.slice(-1).map(([, v]) => v)).reduce((a, b) => a + b, 0) || 0;
  const total = last(metrics.http) || 0;
  return {
    commands: last(metrics.commands),
    requests: total,
    errorRate: total > 0 ? (errors / total) * 100 : 0,
    commandP95: last(metrics.commandP95),
    httpP95: last(metrics.httpP95),
  };
}

export default function Dashboard() {
  const [range, setRange] = useState('1h');
  const [activeCategory, setActiveCategory] = useState('sandbox');
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [updated, setUpdated] = useState(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    const { data, error } = await adminApi.dashboard(range);
    if (id !== requestId.current) return; // a newer request (range change) already took over
    setState((prev) => (error ? { loading: false, data: prev.data, error: error.message } : { loading: false, data, error: '' }));
    if (!error) setUpdated(new Date());
  }, [range]);

  useEffect(() => {
    setState((prev) => ({ ...prev, loading: true }));
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const { data } = state;
  const stats = data?.stats;
  const m = data?.metrics;
  const live = liveStats(m);

  return (
    <div>
      <div className={dash.bar}>
        <div className={dash.ranges} role="group" aria-label="Time range">
          {RANGES.map((value) => (
            <button key={value} type="button" aria-pressed={range === value} onClick={() => setRange(value)}>{value}</button>
          ))}
        </div>
        <div className={dash.barRight}>
          <span className={styles.muted} aria-live="polite">{updated ? `Updated ${updated.toLocaleTimeString()}` : 'Loading…'}</span>
          <button type="button" className={styles.button} onClick={load}>Refresh</button>
          {GRAFANA_URL ? <a className={styles.button} href={GRAFANA_URL} target="_blank" rel="noreferrer">Open Grafana</a> : null}
        </div>
      </div>

      {state.error ? <p className={styles.errorText} role="alert">Could not load the dashboard: {state.error}</p> : null}
      {data && !data.available ? (
        <p className={dash.banner} role="status">
          <strong>Prometheus is not connected.</strong>
        </p>
      ) : null}

      <dl className={styles.stats} aria-label="Headline numbers">
        <Stat label="Users" value={number(stats?.users)} hint={stats ? `${number(stats.admins)} admin · ${number(stats.locked)} locked` : null} />
        <Stat label="Active sessions" value={number(stats?.activeSessions)} hint={stats ? `${number(stats.sessions24h)} opened in 24h` : null} />
        <Stat label="Labs completed (24h)" value={number(stats?.completed24h)} />
        <Stat label="Commands / min" value={live ? number(live.commands, 1) : '—'} hint={live ? `p95 ${number(live.commandP95, 2)} s` : null} />
        <Stat label="API requests / min" value={live ? number(live.requests, 0) : '—'} hint={live ? `p95 ${number(live.httpP95 * 1000)} ms` : null} />
        <Stat label="API error rate" value={live ? `${number(live.errorRate, 1)}%` : '—'} hint="5xx share of requests" />
      </dl>

      <div className={dash.categoryBar} role="tablist" aria-label="Metric Categories">
        {METRIC_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={activeCategory === cat.id}
            className={`${dash.categoryBtn} ${activeCategory === cat.id ? dash.categoryActive : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            <span className={`material-symbols-outlined ${dash.categoryIcon}`} aria-hidden="true">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {activeCategory === 'sandbox' && (
        <div className={dash.gridThree}>
          <LineChart title="Sandbox load" unit="" series={m ? [
            ...m.sessions.map((s) => ({ ...s, name: 'sessions' })),
            ...m.jobsActive.map((s) => ({ ...s, name: 'running jobs' })),
            ...m.jobsPending.map((s) => ({ ...s, name: 'queued jobs' })),
          ] : []} />
          <LineChart title="Commands per minute" unit="/min" series={m?.commands} />
          <LineChart title="Command time, 95th percentile" unit="s" series={m?.commandP95?.map((s) => ({ ...s, name: 'p95' }))} />
        </div>
      )}

      {activeCategory === 'api' && (
        <div className={dash.gridThree}>
          <LineChart title="API requests per minute" unit="/min" series={m?.http} />
          <LineChart title="API response time, 95th percentile" unit="s" series={m?.httpP95?.map((s) => ({ ...s, name: 'p95' }))} />
          <LineChart title="Requests rejected by rate limits" unit="/min" series={m?.rateLimited?.map((s) => ({ ...s, name: 'rate limited' }))} />
        </div>
      )}

      {activeCategory === 'system' && (
        <div className={dash.gridThree}>
          <LineChart title="Sign-in activity per minute" unit="/min" series={m?.auth} />
          <LineChart title="API memory (RSS)" unit="MB" series={m?.memoryMb?.map((s) => ({ ...s, name: 'rss' }))} />
          <LineChart title="API CPU" unit="cores" series={m?.cpu?.map((s) => ({ ...s, name: 'cpu' }))} />
        </div>
      )}
    </div>
  );
}
