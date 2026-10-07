'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { adminApi } from '@/lib/writeApi';
import styles from './Admin.module.css';
import ReasonDialog from './ReasonDialog';
import Dashboard from './Dashboard';
import AdminSelect from './AdminSelect';

const PAGE_SIZE = 8;
const SANDBOX_CAPACITY = 1000; // SessionManager maxSessions in backend/src/services/sessionManager.js
const IDLE_MS = 15 * 60 * 1000;
const OPERATION_VIEWS = [
  { value: 'overview', label: 'Overview' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'observability', label: 'Observability' },
  { value: 'audit', label: 'Audit' },
];
const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

async function emailsFor(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const { data } = await supabase.from('profiles').select('id, email').in('id', unique);
  return new Map((data || []).map((row) => [row.id, row.email]));
}

export default function ActivityPanel() {
  const [view, setView] = useState('overview');
  const selectedView = OPERATION_VIEWS.find((item) => item.value === view) || OPERATION_VIEWS[0];

  return (
    <div className={styles.activityRoot}>
      <header className={styles.header}>
        <div><h1>System overview<span>.</span></h1><p>Operational activity, sessions, observability and audit records.</p></div>
        <AdminSelect
          className={styles.viewSwitcher}
          label="View"
          value={view}
          options={OPERATION_VIEWS}
          onChange={setView}
          buttonText={`View: ${selectedView.label}`}
          menuLabel="Operations views"
          align="right"
        />
      </header>
      <main className={styles.viewStage} data-active-view={view} aria-label={`${view} view`}>
        {view === 'overview' ? <Overview /> : view === 'sessions' ? <SessionsTab /> : view === 'observability' ? <Dashboard /> : <AdminLogTab />}
      </main>
    </div>
  );
}

function Overview() {
  const [dashboard, setDashboard] = useState({ loading: true, data: null });

  useEffect(() => {
    let alive = true;
    adminApi.dashboard('1h').then(({ data }) => {
      if (alive) setDashboard({ loading: false, data });
    });
    return () => { alive = false; };
  }, []);

  const stats = dashboard.data?.stats;
  const active = stats?.activeSessions ?? 0;
  const available = dashboard.data?.available;
  const capacity = SANDBOX_CAPACITY - active;
  const locked = stats?.locked || 0;
  const attention = locked + (available === false ? 1 : 0);

  return (
    <div className={styles.overviewView}>
      <dl className={styles.stats} aria-label="System overview KPIs">
        <div className={styles.stat} data-kpi-card><dt>Sandbox capacity</dt><dd>{capacity} / {SANDBOX_CAPACITY}</dd></div>
        <div className={styles.stat} data-kpi-card><dt>In progress</dt><dd>{active}</dd></div>
        <div className={styles.stat} data-kpi-card><dt>Service health</dt><dd>{dashboard.loading ? 'Loading' : available ? 'Healthy' : 'Unavailable'}</dd></div>
      </dl>
      <div className={styles.overviewGrid}>
        <section className={styles.panel} data-admin-token="panel">
          <div className={styles.overviewPanelContent}>
            <h2>Today</h2>
            <p>{stats?.sessions24h ?? 0} sessions · {stats?.completed24h ?? 0} completions</p>
            <small>{active ? `${active} learner${active === 1 ? '' : 's'} currently in a sandbox.` : 'No learner is currently in a sandbox.'}</small>
          </div>
        </section>
        <section className={styles.panel} data-admin-token="panel">
          <div className={styles.overviewPanelContent}>
            <h2>Needs attention</h2>
            <p>{attention ? `${attention} item${attention === 1 ? '' : 's'} require review.` : 'All clear.'}</p>
            <small>{locked ? `${locked} locked account${locked === 1 ? '' : 's'} need review.` : available === false ? 'The dashboard service needs review.' : 'No locked accounts or service incidents.'}</small>
          </div>
        </section>
      </div>
    </div>
  );
}

function SessionsTab() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ rows: [], total: 0, active: 0, loading: true });
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true }));
    const [{ data: rows, count }, { count: active }] = await Promise.all([
      supabase.from('practice_sessions')
        .select('id, user_id, lesson_id, sandbox_session_id, status, started_at, last_active_at', { count: 'exact' })
        .order('last_active_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1),
      supabase.from('practice_sessions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ]);
    const list = rows || [];
    const [emails, lessons] = await Promise.all([
      emailsFor(list.map((row) => row.user_id)),
      supabase.from('lessons').select('id, title').in('id', [...new Set(list.map((row) => row.lesson_id).filter(Boolean))]),
    ]);
    const titles = new Map((lessons.data || []).map((row) => [row.id, row.title]));
    setData({
      rows: list.map((row) => ({ ...row, email: emails.get(row.user_id), lesson: titles.get(row.lesson_id) })),
      total: count || 0,
      active: active || 0,
      loading: false,
    });
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function stop(reason) {
    const session = dialog.session;
    // The API stops the row (audited) and ends the sandbox behind it.
    const { error } = await adminApi.stopSession(session.id, reason);
    if (error) return error.message;
    setNotice(`Session of ${session.email || 'learner'} stopped.`);
    setDialog(null);
    await load();
    return null;
  }

  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const usage = ((data.active / SANDBOX_CAPACITY) * 100).toFixed(1);

  return (
    <>
      <dl className={styles.stats}>
        <div className={styles.stat}><dt>Active sessions</dt><dd>{data.active}</dd></div>
        <div className={styles.stat}><dt>Capacity</dt><dd>{SANDBOX_CAPACITY}</dd></div>
        <div className={styles.stat}><dt>Usage</dt><dd>{usage}%</dd></div>
        <div className={styles.stat}><dt>All sessions</dt><dd>{data.total}</dd></div>
      </dl>
      <div className={styles.toolbar}>
        {notice && <span className={styles.successText} role="status">{notice}</span>}
        <button type="button" className={styles.button} style={{ marginLeft: 'auto' }} onClick={load} disabled={data.loading}>
          <span className="material-symbols-outlined" aria-hidden="true">refresh</span>{data.loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <div className={`${styles.panel} ${styles.tableWrap}`}>
        <table className={styles.table}>
          <thead><tr><th>Learner</th><th>Lesson</th><th>Status</th><th>Started</th><th>Last active</th><th aria-label="Actions" /></tr></thead>
          <tbody>
            {data.rows.map((row) => {
              const idle = row.status === 'active' && Date.now() - new Date(row.last_active_at) > IDLE_MS;
              const label = idle ? 'idle' : row.status;
              const badge = label === 'active' ? styles.badgeGreen : label === 'idle' ? styles.badgeAmber : styles.badgeGray;
              return (
                <tr key={row.id}>
                  <td>{row.email || row.user_id}</td>
                  <td>{row.lesson || '—'}</td>
                  <td><span className={`${styles.badge} ${badge}`}>{label}</span></td>
                  <td className={styles.muted}>{formatDate(row.started_at)}</td>
                  <td className={styles.muted}>{formatDate(row.last_active_at)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {row.status === 'active' && (
                      <button type="button" className={styles.ghostButton} onClick={() => setDialog({ session: row })}>Stop</button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!data.loading && data.rows.length === 0 && <tr><td colSpan={6} className={styles.muted}>No practice sessions yet.</td></tr>}
          </tbody>
        </table>
        <div className={styles.pager}>
          <span>Page {page + 1} of {pages}</span>
          <div>
            <button type="button" className={styles.button} disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</button>
            <button type="button" className={styles.button} disabled={page + 1 >= pages} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </div>
      </div>
      {dialog && (
        <ReasonDialog
          title="Stop this practice session?"
          description={`${dialog.session.email || 'The learner'} will lose unsaved files in the sandbox.`}
          confirmLabel="Stop session"
          danger
          onConfirm={stop}
          onCancel={() => setDialog(null)}
        />
      )}
    </>
  );
}

const ACTIONS = ['set_role:admin', 'set_role:learner', 'lock_user', 'unlock_user', 'stop_session'];

function AdminLogTab() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ rows: [], total: 0, loading: true });
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true }));
    let request = supabase.from('admin_logs')
      .select('id, actor_id, action, target_type, target_id, reason, result, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (action) request = request.eq('action', action);
    const { data: rows, count } = await request;
    const list = rows || [];
    const emails = await emailsFor([...list.map((row) => row.actor_id), ...list.filter((row) => row.target_type === 'user').map((row) => row.target_id)]);
    setData({
      rows: list.map((row) => ({
        ...row,
        actor: emails.get(row.actor_id) || 'deleted user',
        target: row.target_type === 'user' ? emails.get(row.target_id) || row.target_id : `${row.target_type} ${row.target_id?.slice(0, 8)}`,
      })),
      total: count || 0,
      loading: false,
    });
  }, [action, page]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.auditFilter}>
          <AdminSelect
            label="Action"
            value={action}
            options={[{ value: '', label: 'All actions' }, ...ACTIONS.map((item) => ({ value: item, label: item }))]}
            onChange={(nextAction) => { setPage(0); setAction(nextAction); }}
          />
        </div>
        <span className={styles.muted}>{data.total} entries</span>
      </div>
      <div className={`${styles.panel} ${styles.tableWrap}`}>
        <table className={styles.table}>
          <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Result</th></tr></thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id} onClick={() => setSelected(row)} style={{ cursor: 'pointer' }}>
                <td className={styles.muted}>{formatDate(row.created_at)}</td>
                <td>{row.actor}</td>
                <td><code>{row.action}</code></td>
                <td>{row.target}</td>
                <td><span className={`${styles.badge} ${row.result === 'ok' ? styles.badgeGreen : styles.badgeRed}`}>{row.result}</span></td>
              </tr>
            ))}
            {!data.loading && data.rows.length === 0 && <tr><td colSpan={5} className={styles.muted}>No log entries.</td></tr>}
          </tbody>
        </table>
        <div className={styles.pager}>
          <span>Page {page + 1} of {pages}</span>
          <div>
            <button type="button" className={styles.button} disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</button>
            <button type="button" className={styles.button} disabled={page + 1 >= pages} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </div>
      </div>

      {selected && (
        <div className={styles.backdrop} role="presentation" onClick={() => setSelected(null)}>
          <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="log-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="log-title">{selected.action}</h2>
            <dl className={styles.muted} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 14px' }}>
              <dt>Time</dt><dd>{formatDate(selected.created_at)}</dd>
              <dt>Actor</dt><dd>{selected.actor}</dd>
              <dt>Target</dt><dd>{selected.target}</dd>
              <dt>Target ID</dt><dd style={{ wordBreak: 'break-all' }}>{selected.target_id}</dd>
              <dt>Result</dt><dd>{selected.result}</dd>
              <dt>Reason</dt><dd style={{ color: '#eef1ef' }}>{selected.reason || '—'}</dd>
            </dl>
            <div className={styles.dialogActions}><button type="button" className={styles.button} onClick={() => setSelected(null)}>Close</button></div>
          </div>
        </div>
      )}
    </>
  );
}
