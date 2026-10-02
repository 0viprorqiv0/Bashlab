'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import styles from './Admin.module.css';
import userStyles from './UsersManager.module.css';
import ReasonDialog from './ReasonDialog';
import ManageUserModal from './ManageUserModal';
import { useAdmin } from './AdminGate';

const PAGE_SIZE = 20;

function formatRelativeTime(dateString) {
  if (!dateString) return 'Never';
  const now = new Date();
  const date = new Date(dateString);
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}


export default function UsersManager() {
  const me = useAdmin();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState({ rows: [], total: 0, loading: true, error: '' });
  const [activeAdmins, setActiveAdmins] = useState(0);
  const [sortOption, setSortOption] = useState('default');
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userProgressMap, setUserProgressMap] = useState({});

  const load = useCallback(async () => {
    setResult((prev) => ({ ...prev, loading: true }));
    const [{ data, error }, { count }] = await Promise.all([
      supabase.rpc('admin_list_users', { p_search: query, p_limit: PAGE_SIZE, p_offset: page * PAGE_SIZE }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin').eq('is_locked', false),
    ]);
    setActiveAdmins(count || 0);

    const rows = data || [];
    setResult({ rows, total: rows?.[0]?.total_count ?? 0, loading: false, error: error?.message || '' });

    // Fetch progress counts for current rows
    if (rows.length > 0) {
      const userIds = rows.map((u) => u.id);
      try {
        const { data: progressData } = await supabase
          .from('progress')
          .select('user_id, status')
          .in('user_id', userIds)
          .eq('status', 'done');

        if (progressData) {
          const map = {};
          progressData.forEach((item) => {
            map[item.user_id] = (map[item.user_id] || 0) + 1;
          });
          setUserProgressMap((prev) => ({ ...prev, ...map }));
        }
      } catch {
        // Fallback silently if progress cannot be fetched
      }
    }
  }, [query, page]);

  useEffect(() => { load(); }, [load]);

  // Debounce the search input
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
      onSuccess: () => {
        if (selectedUser?.id === user.id) {
          setSelectedUser((prev) => ({ ...prev, role: newRole }));
        }
      },
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
      onSuccess: () => {
        if (selectedUser?.id === user.id) {
          setSelectedUser((prev) => ({ ...prev, is_locked: lock }));
        }
      },
    });
  }

  function handleDeleteUserNotice(user) {
    window.alert(
      `User ${user.email} cannot be permanently erased via standard client RLS to protect platform audit trails.\n\nTo disable access immediately, please use [Lock Account].`
    );
  }

  async function confirmDialog(reason) {
    const { error } = await dialog.run(reason);
    if (error) return error.message;
    setNotice(dialog.done);
    if (dialog.onSuccess) dialog.onSuccess();
    setDialog(null);
    await load();
    return null;
  }

  // Sorted rows
  const sortedRows = useMemo(() => {
    const list = [...result.rows];
    if (sortOption === 'role') {
      return list.sort((a, b) => (b.role === 'admin' ? 1 : 0) - (a.role === 'admin' ? 1 : 0));
    }
    if (sortOption === 'active') {
      return list.sort((a, b) => new Date(b.last_sign_in_at || 0) - new Date(a.last_sign_in_at || 0));
    }
    if (sortOption === 'name') {
      return list.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
    }
    return list;
  }, [result.rows, sortOption]);

  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const activeLearnersCount = Math.max(0, result.total - activeAdmins);

  return (
    <div className={userStyles.wrapper}>
      <header className={userStyles.header}>
        <div>
          <h1>Learners &amp; Access<span>.</span></h1>
          <p>Roles, active progress metrics and account status. Every change is audited.</p>
        </div>
      </header>

      {notice && (
        <div className={userStyles.noticeBar} role="status">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
          {notice}
        </div>
      )}

      {/* Top control bar: search, sort, active counter */}
      <div className={userStyles.controlBar}>
        <div className={userStyles.searchBox}>
          <span className={`material-symbols-outlined ${userStyles.searchIcon}`}>search</span>
          <input
            type="search"
            placeholder="Search learners by name or email..."
            aria-label="Search learners"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={userStyles.filtersGroup}>
          <select
            className={userStyles.selectDropdown}
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            aria-label="Sort users"
          >
            <option value="default">Sort: Default</option>
            <option value="role">Sort: Role (Admins first)</option>
            <option value="active">Sort: Last Active</option>
            <option value="name">Sort: Name (A-Z)</option>
          </select>

          <div className={userStyles.activeCounter}>
            <strong>{activeLearnersCount}</strong> Active Learners · <strong>{activeAdmins}</strong> Admin{activeAdmins === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {/* User Directory Table / Card Rows */}
      <div className={userStyles.userTable}>
        <div className={userStyles.tableHeader}>
          <div>Learner Profile</div>
          <div>Role</div>
          <div>Progress</div>
          <div>Last Active</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        <div>
          {sortedRows.map((user) => {
            const isMe = user.id === me?.id;
            const completedLabs = userProgressMap[user.id] || 0;

            return (
              <div key={user.id} className={userStyles.userRow}>
                {/* Profile column without avatar */}
                <div className={userStyles.userDetails}>
                  <div className={userStyles.userName}>
                    {user.name || user.email.split('@')[0]}
                    {isMe && <span className={styles.muted} style={{ fontSize: 11 }}>(you)</span>}
                  </div>
                  <div className={userStyles.userEmail}>{user.email}</div>
                </div>

                {/* Role Column */}
                <div>
                  <span
                    className={`${userStyles.badgePill} ${
                      user.role === 'admin' ? userStyles.badgeAdmin : userStyles.badgeLearner
                    }`}
                  >
                    {user.role}
                  </span>
                  {user.is_locked && <span className={`${userStyles.badgePill} ${userStyles.badgeLocked}`}>Locked</span>}
                </div>

                {/* Progress Metric */}
                <div className={userStyles.metricText}>
                  {completedLabs} Labs Completed
                </div>

                {/* Last Active Status */}
                <div className={userStyles.statusText}>
                  {user.last_sign_in_at ? `Active ${formatRelativeTime(user.last_sign_in_at)}` : 'Never logged in'}
                </div>

                {/* Manage Action */}
                <div style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    className={userStyles.btnManage}
                    onClick={() => setSelectedUser(user)}
                    aria-label={`Manage ${user.name || user.email}`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>tune</span>
                    Manage
                  </button>
                </div>
              </div>
            );
          })}

          {!result.loading && sortedRows.length === 0 && (
            <div className={userStyles.emptyState}>
              {result.error || 'No learners match your search criteria.'}
            </div>
          )}
        </div>

        {/* Pagination bar */}
        <div className={userStyles.pager}>
          <span>
            Page {page + 1} of {pages} ({result.total} users)
          </span>
          <div className={userStyles.pagerBtns}>
            <button
              type="button"
              className={userStyles.pagerBtn}
              disabled={page === 0}
              onClick={() => setPage((v) => v - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className={userStyles.pagerBtn}
              disabled={page + 1 >= pages}
              onClick={() => setPage((v) => v + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Floating Popup Modal when clicking [ Manage ] */}
      {selectedUser && (
        <ManageUserModal
          user={selectedUser}
          currentUser={me}
          activeAdminsCount={activeAdmins}
          onClose={() => setSelectedUser(null)}
          onToggleRole={openRoleDialog}
          onToggleLock={openLockDialog}
          onDeleteUser={handleDeleteUserNotice}
        />
      )}

      {/* Audit Reason Dialog */}
      {dialog && <ReasonDialog {...dialog} onConfirm={confirmDialog} onCancel={() => setDialog(null)} />}
    </div>
  );
}
