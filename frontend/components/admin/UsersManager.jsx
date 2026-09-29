'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import styles from './Admin.module.css';
import ReasonDialog from './ReasonDialog';
import { useAdmin } from './AdminGate';

const PAGE_SIZE = 20;
const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

export default function UsersManager() {
  const me = useAdmin();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState({ rows: [], total: 0, loading: true, error: '' });
  const [activeAdmins, setActiveAdmins] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setResult((prev) => ({ ...prev, loading: true }));
    const [{ data, error }, { count }] = await Promise.all([
      supabase.rpc('admin_list_users', { p_search: query, p_limit: PAGE_SIZE, p_offset: page * PAGE_SIZE }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin').eq('is_locked', false),
    ]);
    setActiveAdmins(count || 0);
    setResult({ rows: data || [], total: data?.[0]?.total_count ?? 0, loading: false, error: error?.message || '' });
  }, [query, page]);

  useEffect(() => { load(); }, [load]);

  // Debounce the search box so every keystroke doesn't hit the database.
  useEffect(() => {
    const timer = setTimeout(() => { setPage(0); setQuery(search.trim()); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  function openRoleDialog(user) {
    const newRole = user.role === 'admin' ? 'learner' : 'admin';
    setDialog({
      title: newRole === 'admin' ? `Make ${user.email} an admin?` : `Remove admin role from ${user.email}?`,
      description: newRole === 'admin' ? 'Admins can edit all content and manage users.' : 'They will lose access to the admin pages.',
      confirmLabel: newRole === 'admin' ? 'Make admin' : 'Make learner',
      danger: newRole === 'learner',
      run: (reason) => supabase.rpc('admin_set_user_role', { target: user.id, new_role: newRole, reason }),
      done: `Role of ${user.email} changed to ${newRole}.`,
    });
  }

  function openLockDialog(user) {
    const lock = !user.is_locked;
    setDialog({
      title: lock ? `Lock ${user.email}?` : `Unlock ${user.email}?`,
      description: lock ? 'They will be signed out and unable to log in until unlocked.' : 'They will be able to log in again.',
      confirmLabel: lock ? 'Lock account' : 'Unlock account',
      danger: lock,
      run: (reason) => supabase.rpc('admin_set_user_lock', { target: user.id, locked: lock, reason }),
      done: `${user.email} ${lock ? 'locked' : 'unlocked'}.`,
    });
  }

  async function confirm(reason) {
    const { error } = await dialog.run(reason);
    if (error) return error.message;
    setNotice(dialog.done);
    setDialog(null);
    await load();
    return null;
  }

  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div>
      <header className={styles.header}>
        <div><h1>Users<span>.</span></h1><p>Roles and account status. Every change is recorded in the admin log.</p></div>
      </header>
      {notice && <p className={styles.successText} role="status">{notice}</p>}

      <div className={styles.toolbar}>
        <input className={styles.search} type="search" placeholder="Search by email or name" aria-label="Search users"
          value={search} onChange={(event) => setSearch(event.target.value)} />
        <span className={styles.muted}>{result.total} users · {activeAdmins} active admin{activeAdmins === 1 ? '' : 's'}</span>
      </div>

      <div className={`${styles.panel} ${styles.tableWrap}`}>
        <table className={styles.table}>
          <thead>
            <tr><th>User</th><th>Role</th><th>Status</th><th>Email</th><th>Last sign-in</th><th aria-label="Actions" /></tr>
          </thead>
          <tbody>
            {result.rows.map((user) => {
              const isLastAdmin = user.role === 'admin' && !user.is_locked && activeAdmins <= 1;
              const isMe = user.id === me.id;
              return (
                <tr key={user.id}>
                  <td>
                    <div>{user.name || '—'}{isMe && <span className={styles.muted}> (you)</span>}</div>
                    <div className={styles.muted}>{user.email}</div>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${user.role === 'admin' ? styles.badgeCyan : styles.badgeGray}`}>{user.role}</span>
                    {isLastAdmin && <div className={styles.muted} style={{ marginTop: 4 }}>Last active admin</div>}
                  </td>
                  <td><span className={`${styles.badge} ${user.is_locked ? styles.badgeRed : styles.badgeGreen}`}>{user.is_locked ? 'Locked' : 'Active'}</span></td>
                  <td><span className={`${styles.badge} ${user.email_confirmed_at ? styles.badgeGreen : styles.badgeAmber}`}>{user.email_confirmed_at ? 'Verified' : 'Unverified'}</span></td>
                  <td className={styles.muted}>{formatDate(user.last_sign_in_at)}</td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <button type="button" className={styles.ghostButton} onClick={() => openRoleDialog(user)}
                      disabled={isLastAdmin && user.role === 'admin'}
                      title={isLastAdmin ? 'The last active admin cannot be demoted' : undefined}>
                      {user.role === 'admin' ? 'Make learner' : 'Make admin'}
                    </button>
                    <button type="button" className={styles.ghostButton} onClick={() => openLockDialog(user)}
                      disabled={(isLastAdmin && !user.is_locked) || (isMe && !user.is_locked)}
                      title={isMe ? 'You cannot lock yourself' : isLastAdmin ? 'The last active admin cannot be locked' : undefined}>
                      {user.is_locked ? 'Unlock' : 'Lock'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!result.loading && result.rows.length === 0 && (
              <tr><td colSpan={6} className={styles.muted}>{result.error || 'No users match your search.'}</td></tr>
            )}
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

      {dialog && <ReasonDialog {...dialog} onConfirm={confirm} onCancel={() => setDialog(null)} />}
    </div>
  );
}
