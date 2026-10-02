'use client';

import { useId, useMemo, useState } from 'react';
import styles from './Dashboard.module.css';

// Dependency-free SVG line chart. Series are [{ name, points: [[ms, value], …] }].
// Colours are keyed by meaning (good/warn/bad) first, then cycle.
const PALETTE = ['#68dfa0', '#78cbd4', '#ecc37b', '#c3a6ff', '#ff9c94', '#9fb7ff'];
const FIXED = {
  completed: '#68dfa0', '2xx': '#68dfa0', login_ok: '#68dfa0', refresh_ok: '#78cbd4',
  timeout: '#ecc37b', '4xx': '#ecc37b', login_failed: '#ecc37b', login_throttled: '#ff9c94', refresh_failed: '#ecc37b',
  error: '#ff9c94', '5xx': '#ff9c94', quota_exceeded: '#c3a6ff',
};
const W = 640;
const H = 190;
const PAD = { left: 46, right: 12, top: 10, bottom: 24 };

export const colorFor = (name, index) => FIXED[name] || PALETTE[index % PALETTE.length];

function niceMax(value) {
  if (!(value > 0)) return 1;
  const exponent = 10 ** Math.floor(Math.log10(value));
  const fraction = value / exponent;
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * exponent;
}

const formatValue = (value, unit) => {
  if (!Number.isFinite(value)) return '—';
  const text = Math.abs(value) >= 100 ? Math.round(value).toString() : Math.abs(value) >= 10 ? value.toFixed(1) : value.toFixed(2).replace(/\.?0+$/, '') || '0';
  return unit ? `${text} ${unit}` : text;
};

const formatTime = (ms, spanMs) => new Date(ms).toLocaleTimeString([], spanMs > 36e5 * 8 ? { hour: '2-digit', minute: '2-digit' } : { hour: '2-digit', minute: '2-digit', second: spanMs < 36e5 ? '2-digit' : undefined });

export default function LineChart({ title, unit = '', series = [], empty = 'No data in this window yet.' }) {
  const titleId = useId();
  const [hover, setHover] = useState(null);

  const model = useMemo(() => {
    const lines = series.filter((item) => item.points.length);
    if (!lines.length) return null;
    const times = lines.flatMap((item) => item.points.map(([t]) => t));
    const xMin = Math.min(...times);
    const xMax = Math.max(...times);
    const yMax = niceMax(Math.max(...lines.flatMap((item) => item.points.map(([, v]) => v))));
    const x = (t) => PAD.left + ((t - xMin) / Math.max(1, xMax - xMin)) * (W - PAD.left - PAD.right);
    const y = (v) => PAD.top + (1 - v / yMax) * (H - PAD.top - PAD.bottom);
    return {
      lines: lines.map((item, index) => ({
        ...item,
        color: colorFor(item.name, index),
        path: item.points.map(([t, v], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(' '),
      })),
      xMin, xMax, yMax, x, y, times: [...new Set(times)].sort((a, b) => a - b),
    };
  }, [series]);

  const latest = model?.lines.map((line) => `${line.name} ${formatValue(line.points.at(-1)[1], unit)}`).join(', ');

  function onMove(event) {
    if (!model) return;
    const box = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * W;
    const t = model.xMin + ((px - PAD.left) / (W - PAD.left - PAD.right)) * (model.xMax - model.xMin);
    const nearest = model.times.reduce((best, time) => (Math.abs(time - t) < Math.abs(best - t) ? time : best), model.times[0]);
    setHover(nearest);
  }

  const readings = hover == null || !model ? [] : model.lines.map((line) => {
    const point = line.points.reduce((best, p) => (Math.abs(p[0] - hover) < Math.abs(best[0] - hover) ? p : best), line.points[0]);
    return { name: line.name, color: line.color, value: point[1], at: point[0] };
  });

  return (
    <figure className={styles.chart} aria-labelledby={titleId}>
      <figcaption id={titleId}>{title}{unit ? <span> · {unit}</span> : null}</figcaption>
      {!model ? <p className={styles.chartEmpty}>{empty}</p> : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}. Latest: ${latest}`}
            onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}>
                <line x1={PAD.left} x2={W - PAD.right} y1={model.y(model.yMax * f)} y2={model.y(model.yMax * f)} className={styles.gridline} />
                <text x={PAD.left - 6} y={model.y(model.yMax * f) + 3} textAnchor="end" className={styles.axis}>{formatValue(model.yMax * f)}</text>
              </g>
            ))}
            <text x={PAD.left} y={H - 6} className={styles.axis}>{formatTime(model.xMin, model.xMax - model.xMin)}</text>
            <text x={W - PAD.right} y={H - 6} textAnchor="end" className={styles.axis}>{formatTime(model.xMax, model.xMax - model.xMin)}</text>
            {model.lines.map((line) => (
              <path key={line.name} d={line.path} fill="none" stroke={line.color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {hover != null && (
              <g>
                <line x1={model.x(hover)} x2={model.x(hover)} y1={PAD.top} y2={H - PAD.bottom} className={styles.cursor} />
                {readings.map((r) => <circle key={r.name} cx={model.x(r.at)} cy={model.y(r.value)} r="3.5" fill={r.color} />)}
              </g>
            )}
          </svg>
          <div className={styles.legend}>
            {model.lines.map((line) => (
              <span key={line.name}><i style={{ background: line.color }} aria-hidden="true" />{line.name}</span>
            ))}
          </div>
          {hover != null && (
            <div className={styles.tooltip} role="status">
              <strong>{new Date(hover).toLocaleTimeString()}</strong>
              {readings.map((r) => <span key={r.name}><i style={{ background: r.color }} aria-hidden="true" />{r.name}: {formatValue(r.value, unit)}</span>)}
            </div>
          )}
        </>
      )}
    </figure>
  );
}
