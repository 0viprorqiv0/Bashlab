'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import styles from './ManageUserModal.module.css';

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
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateString);
  }
}

function getInitials(name, email) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return '??';
}

export default function ManageUserModal({
  user,
  currentUser,
  activeAdminsCount,
  onClose,
  onToggleRole,
  onToggleLock,
  onDeleteUser,
}) {
  const [learningStats, setLearningStats] = useState({
    completedCount: 0,
    totalCount: 0,
    activeSessions: 0,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    async function fetchUserMetrics() {
      try {
        const [{ count: doneCount }, { count: totalCount }, { count: sessionCount }] = await Promise.all([
          supabase
            .from('progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'done'),
          supabase
            .from('lessons')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'published'),
          supabase
            .from('practice_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'active'),
        ]);

        if (!cancelled) {
          setLearningStats({
            completedCount: doneCount || 0,
            totalCount: totalCount || 0,
            activeSessions: sessionCount || 0,
            loading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setLearningStats((prev) => ({ ...prev, loading: false }));
        }
      }
    }

    if (user?.id) {
      fetchUserMetrics();
    }

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!user) return null;

  const isMe = currentUser?.id === user.id;
  const isLastAdmin = user.role === 'admin' && !user.is_locked && activeAdminsCount <= 1;

  const initials = getInitials(user.name, user.email);
  const total = learningStats.totalCount > 0 ? learningStats.totalCount : 1;
  const pct = Math.min(100, Math.round((learningStats.completedCount / total) * 100));

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-user-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <h3 id="manage-user-title" className={styles.headTitle}>
            Manage User
          </h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div className={styles.body}>
          {/* Profile header card */}
          <div className={styles.profileCard}>
            <div className={styles.avatarLarge}>{initials}</div>
            <div className={styles.profileDetails}>
              <div className={styles.userName}>
                {user.name || user.email.split('@')[0]}
                {isMe && <span className={styles.youBadge}>you</span>}
              </div>
              <div className={styles.userEmail}>{user.email}</div>
              <div className={styles.metaInfo}>
                ID: {user.id ? `${user.id.slice(0, 8)}...${user.id.slice(-4)}` : '—'} · Joined {formatDate(user.created_at)}
              </div>
            </div>
          </div>

          {/* Account & Security Section */}
          <div className={styles.sectionTitle}>Account &amp; Security</div>
          <div className={styles.fieldsBox}>
            {/* Role */}
            <div className={styles.row}>
              <span className={styles.label}>Role</span>
              <div className={styles.val}>
                <span className={`${styles.roleBadge} ${user.role === 'admin' ? styles.badgeAdmin : styles.badgeLearner}`}>
                  {user.role}
                </span>
                <button
                  type="button"
                  className={styles.miniBtn}
                  disabled={isLastAdmin && user.role === 'admin'}
                  title={isLastAdmin ? 'The last active admin cannot be demoted' : undefined}
                  onClick={() => onToggleRole(user)}
                >
                  {user.role === 'admin' ? 'Demote to Learner' : 'Promote to Admin'}
                </button>
              </div>
            </div>

            {/* Status */}
            <div className={styles.row}>
              <span className={styles.label}>Account Status</span>
              <div className={styles.val}>
                <span className={user.is_locked ? styles.dotLocked : styles.dotActive} />
                <span className={user.is_locked ? styles.statusLocked : styles.statusActive}>
                  {user.is_locked ? 'Locked' : 'Active'}
                </span>
                <button
                  type="button"
                  className={user.is_locked ? styles.btnUnlock : styles.btnLock}
                  disabled={(isLastAdmin && !user.is_locked) || (isMe && !user.is_locked)}
                  title={
                    isMe
                      ? 'You cannot lock your own account'
                      : isLastAdmin
                      ? 'The last active admin cannot be locked'
                      : undefined
                  }
                  onClick={() => onToggleLock(user)}
                >
                  {user.is_locked ? '🔓 Unlock' : '🔒 Lock Account'}
                </button>
              </div>
            </div>

            {/* Email Verified */}
            <div className={styles.row}>
              <span className={styles.label}>Email Verification</span>
              <div className={styles.val}>
                {user.email_confirmed_at ? (
                  <span className={styles.verified}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                    Verified
                  </span>
                ) : (
                  <span className={styles.unverified}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>warning</span>
                    Unverified
                  </span>
                )}
              </div>
            </div>

            {/* Last Sign-in */}
            <div className={styles.row}>
              <span className={styles.label}>Last Sign-in</span>
              <div className={styles.val}>
                <span style={{ color: '#e8e9f0' }}>{formatDate(user.last_sign_in_at)}</span>
                <span style={{ color: '#637180', fontSize: 12 }}>({formatRelativeTime(user.last_sign_in_at)})</span>
              </div>
            </div>
          </div>

          {/* Learning Progress Section */}
          <div className={styles.sectionTitle}>Learning Progress</div>
          <div className={styles.fieldsBox}>
            <div className={styles.row} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <span className={styles.label}>Completed Labs</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: '#68dfa0', fontWeight: 600 }}>
                  {learningStats.loading
                    ? 'Loading…'
                    : `${learningStats.completedCount} / ${learningStats.totalCount} labs (${pct}%)`}
                </span>
              </div>
              <div className={styles.progressBarContainer}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${learningStats.loading ? 0 : pct}%` }}
                />
              </div>
            </div>

            <div className={styles.row}>
              <span className={styles.label}>Active Sessions</span>
              <div className={styles.val}>
                {learningStats.loading ? (
                  <span style={{ color: '#637180' }}>Checking…</span>
                ) : learningStats.activeSessions > 0 ? (
                  <span style={{ color: '#68dfa0', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={styles.dotActive} />
                    {learningStats.activeSessions} active sandbox session(s)
                  </span>
                ) : (
                  <span style={{ color: '#637180' }}>None (No active sandbox)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div className={styles.foot}>
          <button
            type="button"
            className={styles.btnDelete}
            onClick={() => onDeleteUser(user)}
            title="Account deletion action"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
            Delete User
          </button>
          <button type="button" className={styles.btnClose} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
