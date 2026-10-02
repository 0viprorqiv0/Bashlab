'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { adminApi } from '@/lib/writeApi';
import styles from './UsersManager.module.css';
import ReasonDialog from './ReasonDialog';
import { useAdmin } from './AdminGate';

const PAGE_SIZE = 10;

const AVATAR_PALETTES = [
  { bg: '#172554', border: 'rgba(59, 130, 246, 0.4)', color: '#60a5fa' }, // Blue
  { bg: '#052e16', border: 'rgba(34, 197, 94, 0.4)', color: '#4ade80' },  // Green
  { bg: '#451a03', border: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24' }, // Amber
  { bg: '#3b0764', border: 'rgba(168, 85, 247, 0.4)', color: '#c084fc' }, // Purple
  { bg: '#4c0519', border: 'rgba(244, 63, 94, 0.4)', color: '#fb7185' },  // Rose
  { bg: '#042f2e', border: 'rgba(20, 184, 166, 0.4)', color: '#2dd4bf' }, // Teal
];

function getAvatarStyle(seed) {
  let hash = 0;
  const str = String(seed || '');
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[idx];
}

function getInitials(name, email) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) {
    const userPart = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    return userPart.slice(0, 2).toUpperCase() || 'U';
  }
  return 'U';
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Never signed in';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Active just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Active ${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `Active ${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays === 1) return 'Active 1 day ago';
  if (diffDays < 7) return `Active ${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `Active ${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }
  return `Active on ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function formatDetailedSignIn(dateStr) {
  if (!dateStr) return 'Never signed in';
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const relStr = formatRelativeTime(dateStr).replace('Active ', '');

  if (isToday) {
    return `Today at ${timeStr} (${relStr})`;
  }
  if (isYesterday) {
    return `Yesterday at ${timeStr} (${relStr})`;
  }
  const dateFormatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${dateFormatted} at ${timeStr} (${relStr})`;
}

function formatJoinedDate(dateStr) {
  if (!dateStr) return 'Sep 2026';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function UsersManager() {
  const me = useAdmin();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activitySort, setActivitySort] = useState('recent');
  const [page, setPage] = useState(0);

  const [result, setResult] = useState({ rows: [], total: 0, loading: true, error: '' });
  const [activeAdmins, setActiveAdmins] = useState(0);
  const [activeLearners, setActiveLearners] = useState(0);
  const [completedMap, setCompletedMap] = useState({});
  const [sessionsMap, setSessionsMap] = useState({});
  const [totalLabsCount, setTotalLabsCount] = useState(14);

  const [selectedUser, setSelectedUser] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState('');

  // Fetch users list and stats
  const load = useCallback(async () => {
    setResult((prev) => ({ ...prev, loading: true }));
    try {
      const [
        { data: usersData, error: usersError },
        { count: adminCount },
        { count: learnerCount },
        { data: progressData },
        { count: lessonsCount },
        { data: sessionsData },
      ] = await Promise.all([
        supabase.rpc('admin_list_users', { p_search: query, p_limit: PAGE_SIZE, p_offset: page * PAGE_SIZE }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin').eq('is_locked', false),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'learner').eq('is_locked', false),
        supabase.from('progress').select('user_id, status').eq('status', 'done'),
        supabase.from('lessons').select('id', { count: 'exact', head: true }),
        supabase.from('practice_sessions').select('user_id').eq('status', 'active'),
      ]);

      setActiveAdmins(adminCount || 0);
      setActiveLearners(learnerCount || 0);
      setTotalLabsCount(lessonsCount && lessonsCount > 0 ? lessonsCount : 14);

      // Build completed map: user_id -> completed count
      const compMap = {};
      if (progressData) {
        progressData.forEach((row) => {
          compMap[row.user_id] = (compMap[row.user_id] || 0) + 1;
        });
      }
      setCompletedMap(compMap);

      // Build active sessions map: user_id -> session count
      const sessMap = {};
      if (sessionsData) {
        sessionsData.forEach((row) => {
          sessMap[row.user_id] = (sessMap[row.user_id] || 0) + 1;
        });
      }
      setSessionsMap(sessMap);

      setResult({
        rows: usersData || [],
        total: usersData?.[0]?.total_count ?? 0,
        loading: false,
        error: usersError?.message || '',
      });
    } catch (err) {
      setResult((prev) => ({ ...prev, loading: false, error: err.message }));
    }
  }, [query, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      setQuery(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Process rows with local sort/filter
  const displayRows = useMemo(() => {
    let rows = [...result.rows];

    // Filter by role
    if (roleFilter === 'learner') {
      rows = rows.filter((u) => u.role === 'learner');
    } else if (roleFilter === 'admin') {
      rows = rows.filter((u) => u.role === 'admin');
    }

    // Sort
    rows.sort((a, b) => {
      if (activitySort === 'recent') {
        const timeA = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
        const timeB = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
        return timeB - timeA;
      }
      if (activitySort === 'least_recent') {
        const timeA = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : Infinity;
        const timeB = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : Infinity;
        return timeA - timeB;
      }
      if (activitySort === 'name_asc') {
        const nameA = (a.name || a.email).toLowerCase();
        const nameB = (b.name || b.email).toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (activitySort === 'labs_desc') {
        const labsA = completedMap[a.id] || 0;
        const labsB = completedMap[b.id] || 0;
        return labsB - labsA;
      }
      return 0;
    });

    return rows;
  }, [result.rows, roleFilter, activitySort, completedMap]);

  function openRoleDialog(user) {
    const newRole = user.role === 'admin' ? 'learner' : 'admin';
    setDialog({
      title: newRole === 'admin' ? `Make ${user.email} an admin?` : `Remove admin role from ${user.email}?`,
      description: newRole === 'admin' ? 'Admins can edit all content and manage users.' : 'They will lose access to the admin pages.',
      confirmLabel: newRole === 'admin' ? 'Make admin' : 'Make learner',
      danger: newRole === 'learner',
      run: async (reason) => {
        const res = await adminApi.setUserRole(user.id, newRole, reason);
        if (!res.error && selectedUser && selectedUser.id === user.id) {
          setSelectedUser((prev) => ({ ...prev, role: newRole }));
        }
        return res;
      },
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
      run: async (reason) => {
        const res = await adminApi.setUserLock(user.id, lock, reason);
        if (!res.error && selectedUser && selectedUser.id === user.id) {
          setSelectedUser((prev) => ({ ...prev, is_locked: lock }));
        }
        return res;
      },
      done: `${user.email} ${lock ? 'locked' : 'unlocked'}.`,
    });
  }

  function openDeleteDialog(user) {
    setDialog({
      title: `Delete user ${user.email}?`,
      description: 'The user account will be permanently locked and disabled from accessing the platform.',
      confirmLabel: 'Delete & Lock User',
      danger: true,
      run: async (reason) => {
        const res = await adminApi.setUserLock(user.id, true, `Account deleted by admin. Reason: ${reason}`);
        if (!res.error && selectedUser && selectedUser.id === user.id) {
          setSelectedUser(null);
        }
        return res;
      },
      done: `User ${user.email} has been disabled and marked for deletion.`,
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

  const pageNumbers = useMemo(() => {
    const totalPages = pages;
    const current = page + 1;
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (current >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', current - 1, current, current + 1, '...', totalPages];
  }, [pages, page]);

  // Current selected user metadata for modal
  const modalAvatarStyle = selectedUser ? getAvatarStyle(selectedUser.name || selectedUser.email) : {};
  const modalInitials = selectedUser ? getInitials(selectedUser.name, selectedUser.email) : '';
  const modalCompletedCount = selectedUser ? (completedMap[selectedUser.id] || 0) : 0;
  const modalProgressPercent = Math.min(100, Math.round((modalCompletedCount / (totalLabsCount || 1)) * 100));
  const modalActiveSessions = selectedUser ? (sessionsMap[selectedUser.id] || 0) : 0;
  const modalIsLastAdmin = selectedUser && selectedUser.role === 'admin' && !selectedUser.is_locked && activeAdmins <= 1;
  const modalIsMe = selectedUser && selectedUser.id === me?.id;

  return (
    <div className={styles.usersContainer}>
      {/* Notice Banner */}
      {notice && (
        <div className={styles.noticeBanner} role="status">
          <span>{notice}</span>
          <button type="button" className={styles.dismissNoticeBtn} onClick={() => setNotice('')}>✕</button>
        </div>
      )}

      {/* Top Filter & Control Bar (User 2.png) */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Search learners by name or email..."
            aria-label="Search learners"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.sortSelectWrap}>
          <select
            className={styles.sortSelect}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter by role"
          >
            <option value="all">Sort: Role</option>
            <option value="learner">Role: Learner</option>
            <option value="admin">Role: Admin</option>
          </select>
          <span className={styles.selectArrow}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>

        <div className={styles.sortSelectWrap}>
          <select
            className={styles.sortSelect}
            value={activitySort}
            onChange={(e) => setActivitySort(e.target.value)}
            aria-label="Sort by activity"
          >
            <option value="recent">Sort: Last Active</option>
            <option value="least_recent">Last Active: Oldest</option>
            <option value="name_asc">Name: A to Z</option>
            <option value="labs_desc">Labs Completed</option>
          </select>
          <span className={styles.selectArrow}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>

        <div className={styles.learnerCounter}>
          {activeLearners} Active Learner{activeLearners === 1 ? '' : 's'}
        </div>
      </div>

      {/* User Card Rows List (User 2.png) */}
      <div className={styles.userList}>
        {displayRows.map((user) => {
          const avatarStyle = getAvatarStyle(user.name || user.email);
          const initials = getInitials(user.name, user.email);
          const isMe = user.id === me?.id;
          const completedCount = completedMap[user.id] || 0;

          return (
            <div key={user.id} className={styles.userRow}>
              {/* Avatar circle */}
              <div
                className={styles.avatar}
                style={{
                  backgroundColor: avatarStyle.bg,
                  color: avatarStyle.color,
                  borderColor: avatarStyle.border,
                }}
              >
                {initials}
              </div>

              {/* User Identity */}
              <div className={styles.userInfo}>
                <div className={styles.userNameRow}>
                  <span className={styles.userName}>{user.name || user.email.split('@')[0]}</span>
                  {isMe && <span className={styles.youTag}>you</span>}
                  {user.is_locked && <span className={styles.lockedTag}>Locked</span>}
                </div>
                <div className={styles.userEmail}>{user.email}</div>
              </div>

              {/* Role Pill */}
              <div className={styles.roleCell}>
                <span className={user.role === 'admin' ? styles.rolePillAdmin : styles.rolePillLearner}>
                  {user.role === 'admin' ? 'Admin' : 'Learner'}
                </span>
              </div>

              {/* Labs Completed */}
              <div className={styles.metricCell}>
                {completedCount} Labs Completed
              </div>

              {/* Relative Activity */}
              <div className={styles.activityCell}>
                {formatRelativeTime(user.last_sign_in_at)}
              </div>

              {/* Manage Button */}
              <div className={styles.actionCell}>
                <button
                  type="button"
                  className={styles.manageBtn}
                  onClick={() => setSelectedUser(user)}
                >
                  Manage
                </button>
              </div>
            </div>
          );
        })}

        {!result.loading && displayRows.length === 0 && (
          <div className={styles.emptyState}>
            {result.error || 'No learners match your search criteria.'}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className={styles.pager}>
        <span className={styles.pagerInfo}>Page {page + 1} of {pages}</span>
        <div className={styles.pagerButtons}>
          <button
            type="button"
            className={styles.pageArrowBtn}
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            aria-label="Previous page"
            title="Previous page"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className={styles.pageIndicator} role="navigation" aria-label="Page navigation">
            {pageNumbers.map((p, idx) =>
              p === '...' ? (
                <span key={`ellipsis-${idx}`} className={styles.pageEllipsis}>
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  className={`${styles.pageNumberBtn} ${page + 1 === p ? styles.pageNumberActive : ''}`}
                  onClick={() => setPage(p - 1)}
                  aria-current={page + 1 === p ? 'page' : undefined}
                  aria-label={`Page ${p}`}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            className={styles.pageArrowBtn}
            disabled={page + 1 >= pages}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
            title="Next page"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Manage User Modal (User 1.png & User 3.png) */}
      {selectedUser && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className={styles.modalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <h2 id="modal-title" className={styles.modalTitle}>Manage User</h2>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setSelectedUser(null)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className={styles.modalBody}>
              {/* Profile Card Summary */}
              <div className={styles.modalProfile}>
                <div
                  className={styles.modalAvatar}
                  style={{
                    backgroundColor: modalAvatarStyle.bg,
                    color: modalAvatarStyle.color,
                    borderColor: modalAvatarStyle.border,
                  }}
                >
                  {modalInitials}
                </div>
                <div className={styles.modalProfileInfo}>
                  <h3 className={styles.modalProfileName}>
                    {selectedUser.name || selectedUser.email.split('@')[0]}
                  </h3>
                  <p className={styles.modalProfileEmail}>{selectedUser.email}</p>
                  <p className={styles.modalProfileMeta}>
                    ID: {selectedUser.id ? `${selectedUser.id.slice(0, 8)}...` : '—'} • Joined {formatJoinedDate(selectedUser.created_at)}
                  </p>
                </div>
              </div>

              {/* ACCOUNT & SECURITY */}
              <div className={styles.modalSection}>
                <div className={styles.sectionHeader}>Account & Security</div>

                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Role</span>
                  <div className={styles.fieldValue}>
                    <button
                      type="button"
                      className={`${selectedUser.role === 'admin' ? styles.rolePillAdmin : styles.rolePillLearner} ${styles.roleToggleBtn}`}
                      onClick={() => openRoleDialog(selectedUser)}
                      disabled={modalIsLastAdmin}
                      title={modalIsLastAdmin ? 'The last active admin cannot be demoted' : 'Click to toggle role'}
                    >
                      {selectedUser.role === 'admin' ? 'Admin' : 'Learner'}
                    </button>
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Status</span>
                  <div className={styles.fieldValue}>
                    {selectedUser.is_locked ? (
                      <span className={styles.statusLocked}>
                        <span className={styles.statusDotLocked} /> Locked
                      </span>
                    ) : (
                      <span className={styles.statusActive}>
                        <span className={styles.statusDotActive} /> Active
                      </span>
                    )}
                    <button
                      type="button"
                      className={styles.lockBtn}
                      onClick={() => openLockDialog(selectedUser)}
                      disabled={(modalIsLastAdmin && !selectedUser.is_locked) || (modalIsMe && !selectedUser.is_locked)}
                      title={modalIsMe ? 'You cannot lock yourself' : modalIsLastAdmin ? 'The last active admin cannot be locked' : undefined}
                    >
                      {selectedUser.is_locked ? '🔓 Unlock Account' : '🔒 Lock Account'}
                    </button>
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Email Verified</span>
                  <div className={styles.fieldValue}>
                    {selectedUser.email_confirmed_at ? (
                      <span className={styles.verifiedCheck}>
                        <svg className={styles.checkIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Verified
                      </span>
                    ) : (
                      <span style={{ color: '#8a919e' }}>Unverified</span>
                    )}
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Last Sign-in</span>
                  <div className={styles.fieldValue}>
                    {formatDetailedSignIn(selectedUser.last_sign_in_at)}
                  </div>
                </div>
              </div>

              {/* LEARNING PROGRESS */}
              <div className={styles.modalSection}>
                <div className={styles.sectionHeader}>Learning Progress</div>

                <div className={styles.progressWrap}>
                  <div className={styles.progressTextRow}>
                    <span className={styles.fieldLabel}>Completed Labs</span>
                    <span style={{ color: '#f3f4f6', fontWeight: 500 }}>
                      {modalCompletedCount} / {totalLabsCount} labs ({modalProgressPercent}%)
                    </span>
                  </div>
                  <div className={styles.progressBarTrack}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${modalProgressPercent}%` }}
                    />
                  </div>
                </div>

                <div className={styles.fieldRow} style={{ marginTop: 4 }}>
                  <span className={styles.fieldLabel}>Active Sessions</span>
                  <div className={styles.fieldValue}>
                    {modalActiveSessions > 0 ? `${modalActiveSessions} active session` : 'None'}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={() => openDeleteDialog(selectedUser)}
                disabled={modalIsMe || modalIsLastAdmin}
                title={modalIsMe ? 'You cannot delete yourself' : undefined}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
                Delete User
              </button>

              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setSelectedUser(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reason Dialog for Audit Logging Confirmation */}
      {dialog && (
        <ReasonDialog
          {...dialog}
          onConfirm={confirm}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  );
}
