'use client';

import { useId, useMemo, useState } from 'react';
import styles from './Dashboard.module.css';

// Cyber Terminal palette: Neon Emerald, Electric Cyan, Amber, Rose, Purple, Blue
const PALETTE = ['#00e599', '#00d8f6', '#f59e0b', '#a855f7', '#ec4899', '#3b82f6'];
const FIXED = {
  completed: '#00e599', '2xx': '#00e599', login_ok: '#00e599', refresh_ok: '#00d8f6',
  sessions: '#00e599', 'running jobs': '#00d8f6', 'queued jobs': '#f59e0b',
  timeout: '#f59e0b', '4xx': '#f59e0b', login_failed: '#f59e0b', login_throttled: '#f43f5e', refresh_failed: '#f59e0b',
  error: '#f43f5e', '5xx': '#f43f5e', quota_exceeded: '#a855f7',
  p95: '#00d8f6', rss: '#00d8f6', cpu: '#00e599', 'rate limited': '#f43f5e',
};

const W = 640;
const H = 200;
const PAD = { left: 46, right: 14, top: 14, bottom: 26 };

export const colorFor = (name, index) => FIXED[name] || PALETTE[index % PALETTE.length];

function niceMax(value) {
  if (!(value > 0)) return 1;
  const exponent = 10 ** Math.floor(Math.log10(value));
  const fraction = value / exponent;
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * exponent;
}

const formatValue = (value, unit) => {
  if (!Number.isFinite(value)) return '—';
  const text = Math.abs(value) >= 100
    ? Math.round(value).toString()
    : Math.abs(value) >= 10
      ? value.toFixed(1)
      : value.toFixed(2).replace(/\.?0+$/, '') || '0';
  return unit ? `${text} ${unit}` : text;
};

const formatTime = (ms, spanMs) =>
  new Date(ms).toLocaleTimeString([], spanMs > 36e5 * 8
    ? { hour: '2-digit', minute: '2-digit' }
    : { hour: '2-digit', minute: '2-digit', second: spanMs < 36e5 ? '2-digit' : undefined });

// Builds smooth Monotone Cubic Spline path
function buildSmoothPath(pts) {
  if (pts.length <= 1) return pts.map(([x, y]) => `M ${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  if (pts.length === 2) return `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)} L ${pts[1][0].toFixed(1)},${pts[1][1].toFixed(1)}`;

  let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i > 0 ? i - 1 : 0];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

// Builds area polygon closing to bottom baseline
function buildSmoothArea(pts, baselineY) {
  if (pts.length < 2) return '';
  const linePath = buildSmoothPath(pts);
  const firstX = pts[0][0].toFixed(1);
  const lastX = pts[pts.length - 1][0].toFixed(1);
  const base = baselineY.toFixed(1);
  return `${linePath} L ${lastX},${base} L ${firstX},${base} Z`;
}

export default function LineChart({
  title,
  unit = '',
  series = [],
  empty = 'No data in this window yet.',
  showArea = true,
}) {
  const rawId = useId();
  const safeId = useMemo(() => rawId.replace(/[^a-zA-Z0-9_-]/g, '_'), [rawId]);
  const titleId = `title_${safeId}`;
  const [hover, setHover] = useState(null);

  const model = useMemo(() => {
    const lines = series.filter((item) => item?.points?.length);
    if (!lines.length) return null;
    const times = lines.flatMap((item) => item.points.map(([t]) => t));
    const xMin = Math.min(...times);
    const xMax = Math.max(...times);
    const yMax = niceMax(Math.max(...lines.flatMap((item) => item.points.map(([, v]) => v))));
    const x = (t) => PAD.left + ((t - xMin) / Math.max(1, xMax - xMin)) * (W - PAD.left - PAD.right);
    const y = (v) => PAD.top + (1 - v / yMax) * (H - PAD.top - PAD.bottom);
    const baselineY = H - PAD.bottom;

    return {
      lines: lines.map((item, index) => {
        const color = colorFor(item.name, index);
        const mappedPts = item.points.map(([t, v]) => [x(t), y(v)]);
        const linePath = buildSmoothPath(mappedPts);
        const areaPath = showArea ? buildSmoothArea(mappedPts, baselineY) : '';
        const lastVal = item.points.at(-1)?.[1];
        return {
          ...item,
          color,
          path: linePath,
          areaPath,
          lastVal,
        };
      }),
      xMin,
      xMax,
      yMax,
      x,
      y,
      baselineY,
      times: [...new Set(times)].sort((a, b) => a - b),
    };
  }, [series, showArea]);

  const latest = model?.lines.map((line) => `${line.name} ${formatValue(line.lastVal, unit)}`).join(', ');

  const primaryLine = model?.lines[0];
  const primaryReading = primaryLine ? formatValue(primaryLine.lastVal, unit) : null;

  function onMove(event) {
    if (!model) return;
    const box = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * W;
    const t = model.xMin + ((px - PAD.left) / (W - PAD.left - PAD.right)) * (model.xMax - model.xMin);
    const nearest = model.times.reduce(
      (best, time) => (Math.abs(time - t) < Math.abs(best - t) ? time : best),
      model.times[0]
    );
    setHover(nearest);
  }

  const readings = hover == null || !model ? [] : model.lines.map((line) => {
    const point = line.points.reduce(
      (best, p) => (Math.abs(p[0] - hover) < Math.abs(best[0] - hover) ? p : best),
      line.points[0]
    );
    return { name: line.name, color: line.color, value: point[1], at: point[0] };
  });

  return (
    <figure className={styles.chart} aria-labelledby={titleId}>
      <figcaption id={titleId} className={styles.chartCaption}>
        <div className={styles.captionTitleRow}>
          <span className={styles.chartTitleText}>{title}</span>
          {unit ? <span className={styles.chartUnitText}> · {unit}</span> : null}
        </div>
        {primaryReading && model?.lines.length === 1 ? (
          <span className={styles.liveBadge} style={{ color: primaryLine.color, borderColor: `${primaryLine.color}40` }}>
            <span className={styles.liveDot} style={{ background: primaryLine.color }} />
            {primaryReading}
          </span>
        ) : null}
      </figcaption>

      {!model ? (
        <div className={styles.chartEmptyWrap}>
          <svg className={styles.emptyWave} viewBox="0 0 100 24" preserveAspectRatio="none">
            <path d="M0,12 Q25,6 50,12 T100,12" fill="none" stroke="#222d3d" strokeWidth="2" strokeDasharray="3 3" />
          </svg>
          <p className={styles.chartEmpty}>{empty}</p>
        </div>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`${title}. Latest: ${latest}`}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          >
            <defs>
              {model.lines.map((line, idx) => (
                <linearGradient
                  key={line.name}
                  id={`area_grad_${safeId}_${idx}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={line.color} stopOpacity="0.25" />
                  <stop offset="60%" stopColor={line.color} stopOpacity="0.08" />
                  <stop offset="100%" stopColor={line.color} stopOpacity="0.0" />
                </linearGradient>
              ))}
              <filter id={`glow_${safeId}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((f) => {
              const yPos = model.y(model.yMax * f);
              return (
                <g key={f}>
                  <line
                    x1={PAD.left}
                    x2={W - PAD.right}
                    y1={yPos}
                    y2={yPos}
                    className={styles.gridline}
                  />
                  <text
                    x={PAD.left - 8}
                    y={yPos + 3.5}
                    textAnchor="end"
                    className={styles.axis}
                  >
                    {formatValue(model.yMax * f)}
                  </text>
                </g>
              );
            })}

            {/* Time labels on X axis */}
            <text x={PAD.left} y={H - 6} className={styles.axis}>
              {formatTime(model.xMin, model.xMax - model.xMin)}
            </text>
            <text x={W - PAD.right} y={H - 6} textAnchor="end" className={styles.axis}>
              {formatTime(model.xMax, model.xMax - model.xMin)}
            </text>

            {/* Area Fills */}
            {showArea &&
              model.lines.map((line, idx) =>
                line.areaPath ? (
                  <path
                    key={`area-${line.name}`}
                    d={line.areaPath}
                    fill={`url(#area_grad_${safeId}_${idx})`}
                    className={styles.areaFill}
                  />
                ) : null
              )}

            {/* Smooth Spline Lines */}
            {model.lines.map((line) => (
              <path
                key={line.name}
                d={line.path}
                fill="none"
                stroke={line.color}
                strokeWidth="2.2"
                strokeLinejoin="round"
                strokeLinecap="round"
                className={styles.splineLine}
              />
            ))}

            {/* Hover Crosshair & Data Points */}
            {hover != null && (
              <g>
                <line
                  x1={model.x(hover)}
                  x2={model.x(hover)}
                  y1={PAD.top}
                  y2={H - PAD.bottom}
                  className={styles.cursor}
                />
                {readings.map((r) => (
                  <g key={r.name}>
                    <circle
                      cx={model.x(r.at)}
                      cy={model.y(r.value)}
                      r="6.5"
                      fill={r.color}
                      opacity="0.3"
                    />
                    <circle
                      cx={model.x(r.at)}
                      cy={model.y(r.value)}
                      r="3.5"
                      fill={r.color}
                      stroke="#0e141f"
                      strokeWidth="1.8"
                    />
                  </g>
                ))}
              </g>
            )}
          </svg>

          {/* Legend Items */}
          <div className={styles.legend}>
            {model.lines.map((line) => (
              <span key={line.name} className={styles.legendItem}>
                <i style={{ background: line.color, boxShadow: `0 0 6px ${line.color}66` }} aria-hidden="true" />
                <span className={styles.legendLabel}>{line.name}</span>
                {line.lastVal != null && (
                  <strong className={styles.legendVal}>{formatValue(line.lastVal, unit)}</strong>
                )}
              </span>
            ))}
          </div>

          {/* Interactive Floating Tooltip */}
          {hover != null && (
            <div className={styles.tooltip} role="status">
              <strong className={styles.tooltipTime}>
                <span className="material-symbols-outlined text-[13px] mr-1 align-text-bottom">schedule</span>
                {new Date(hover).toLocaleTimeString()}
              </strong>
              <div className={styles.tooltipList}>
                {readings.map((r) => (
                  <span key={r.name} className={styles.tooltipItem}>
                    <i style={{ background: r.color }} aria-hidden="true" />
                    <span className={styles.tooltipName}>{r.name}:</span>
                    <strong className={styles.tooltipVal}>{formatValue(r.value, unit)}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </figure>
  );
}
