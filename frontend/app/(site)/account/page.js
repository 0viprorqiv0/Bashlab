'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountPage({
  userProps = {
    name: 'Alex Morgan',
    bio: 'DevOps Enthusiast & Shell Scripting Learner',
    initials: 'AM',
    avatarUrl: null,
    email: 'alex.morgan@example.com',
    role: 'Learner',
    roleDescription: 'Learner (Managed by platform)',
    roleAccess: 'Read-only',
    userId: '#SYS-UID-8841',
    isVerified: true,
    joinedDate: 'September 2026',
    stats: {
      completedCourses: 2,
      totalCourses: 5,
      completedLessons: 28,
      practiceHours: 14.5,
      streakDays: 7,
    },
  },
}) {
  const router = useRouter();
  const fileInputRef = useRef(null);

  // State management
  const [user, setUser] = useState(userProps);
  const [resetStatus, setResetStatus] = useState('idle'); // idle | loading | success | error
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error' | 'info', title: string, message: string }

  // Profile Edit Form State
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    email: '',
  });

  // Load saved profile from localStorage if exists
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedProfile = localStorage.getItem('bashlab_user_profile');
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          setUser((prev) => ({ ...prev, ...parsed }));
        }
      } catch (e) {
        console.error('Failed to parse saved user profile:', e);
      }
    }
  }, []);

  // Auto hide toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Helper to generate Initials from name
  const getInitials = (fullName) => {
    if (!fullName) return 'U';
    const parts = fullName.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Open Edit Profile Modal
  const handleOpenEditModal = () => {
    setEditForm({
      name: user.name,
      bio: user.bio || '',
      email: user.email,
    });
    setShowEditModal(true);
  };

  // Save Profile Changes
  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      setToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Full Name cannot be empty.',
      });
      return;
    }

    const updatedUser = {
      ...user,
      name: editForm.name.trim(),
      bio: editForm.bio.trim(),
      email: editForm.email.trim(),
      initials: getInitials(editForm.name),
    };

    setUser(updatedUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bashlab_user_profile', JSON.stringify(updatedUser));
    }

    setShowEditModal(false);
    setToast({
      type: 'success',
      title: 'Profile Updated',
      message: 'Your account information has been saved successfully.',
    });
  };

  // Handle Avatar Image Upload
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setToast({
        type: 'error',
        title: 'File Too Large',
        message: 'Please choose an image under 5MB.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const updatedUser = {
        ...user,
        avatarUrl: reader.result,
      };
      setUser(updatedUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('bashlab_user_profile', JSON.stringify(updatedUser));
      }
      setToast({
        type: 'success',
        title: 'Avatar Updated',
        message: 'Your profile picture has been updated.',
      });
    };
    reader.readAsDataURL(file);
  };

  // Remove Custom Avatar
  const handleRemoveAvatar = () => {
    const updatedUser = {
      ...user,
      avatarUrl: null,
    };
    setUser(updatedUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bashlab_user_profile', JSON.stringify(updatedUser));
    }
    setToast({
      type: 'info',
      title: 'Avatar Reset',
      message: 'Reverted to default initial avatar.',
    });
  };

  // Handle password reset email request
  const handleSendResetEmail = () => {
    if (resetStatus === 'loading') return;
    setResetStatus('loading');

    setTimeout(() => {
      setResetStatus('success');
      setToast({
        type: 'success',
        title: 'Reset Link Dispatched',
        message: `A secure password reset email has been sent to ${user.email}. Please check your inbox.`,
      });

      // Reset button state back to idle after 4s
      setTimeout(() => {
        setResetStatus('idle');
      }, 4000);
    }, 1200);
  };

  // Handle Copy User ID
  const handleCopyUid = () => {
    navigator.clipboard?.writeText?.(user.userId);
    setCopiedUid(true);
    setToast({
      type: 'info',
      title: 'User ID Copied',
      message: `${user.userId} copied to clipboard.`,
    });
    setTimeout(() => setCopiedUid(false), 2000);
  };

  // Handle Confirm Logout
  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    setToast({
      type: 'info',
      title: 'Session Terminated',
      message: 'Logging out and clearing active session tokens...',
    });

    setTimeout(() => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('bashlab_session');
      }
      router.push('/login');
    }, 900);
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center px-4 sm:px-6 lg:px-8 py-10 md:py-14 max-w-[1100px] mx-auto animate-fade-in-up">
      {/* Toast Notification Popup */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 max-w-md w-full bg-[#141820] border border-primary/50 text-white p-4 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-start gap-3 backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-200"
        >
          <span
            className={`material-symbols-outlined text-2xl select-none mt-0.5 ${
              toast.type === 'success'
                ? 'text-primary'
                : toast.type === 'error'
                ? 'text-red-400'
                : 'text-secondary'
            }`}
          >
            {toast.type === 'success'
              ? 'check_circle'
              : toast.type === 'error'
              ? 'error'
              : 'info'}
          </span>
          <div className="flex-1 flex flex-col gap-0.5">
            <h4 className="font-headline text-sm font-semibold text-white">
              {toast.title}
            </h4>
            <p className="font-body text-xs text-on-surface-variant leading-relaxed">
              {toast.message}
            </p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-on-surface-variant hover:text-white p-1 transition-colors rounded"
            aria-label="Close notification"
          >
            <span className="material-symbols-outlined text-base select-none">close</span>
          </button>
        </div>
      )}

      {/* Header & Page Title */}
      <div className="w-full flex flex-col gap-3 mb-8 md:mb-10 text-left">
        <div className="inline-flex items-center gap-2 font-code text-xs font-semibold text-primary tracking-widest uppercase">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow"></span>
          ● ACCOUNT SETTINGS
        </div>

        <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
          Account & Security
        </h1>

        <p className="body-md text-on-surface-variant max-w-2xl">
          Manage your personal profile, credentials, role access, and learning progress.
        </p>
      </div>

      {/* Cards Container */}
      <div className="w-full flex flex-col gap-6">
        {/* CARD 1: User Overview & Avatar Update */}
        <div className="w-full bg-surface-cmd border border-divider-border/60 rounded-xl p-6 sm:p-8 card-glow-green transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-5">
            {/* Avatar Box with File Upload trigger */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-primary/20 via-secondary/15 to-[#0A0D14] border-2 border-primary/40 flex items-center justify-center shadow-lg group-hover:border-primary transition-all overflow-hidden relative">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-headline font-bold text-2xl sm:text-3xl text-primary tracking-wider select-none">
                    {user.initials}
                  </span>
                )}

                {/* Hover overlay to change avatar */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-xs font-code cursor-pointer"
                  title="Change Avatar"
                >
                  <span className="material-symbols-outlined text-xl text-primary">photo_camera</span>
                  <span className="text-[10px] uppercase font-semibold">Change</span>
                </button>
              </div>

              {/* Reset avatar button if custom avatar exists */}
              {user.avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="absolute -bottom-1 -right-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/50 rounded-full p-1 transition-colors"
                  title="Remove avatar"
                >
                  <span className="material-symbols-outlined text-xs block select-none">delete</span>
                </button>
              )}
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
              id="avatar-upload-input"
            />

            {/* Name, Bio, Status & Email */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="font-headline text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {user.name}
                </h2>
                {user.isVerified && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-code font-semibold bg-primary/10 border border-primary/40 text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    Verified
                  </span>
                )}
              </div>

              {user.bio && (
                <p className="font-body text-xs text-on-surface-variant line-clamp-2 max-w-md">
                  {user.bio}
                </p>
              )}

              <p className="font-code text-xs sm:text-sm text-on-surface-variant flex items-center gap-2 mt-0.5">
                <span className="material-symbols-outlined text-base text-on-surface-variant/70">
                  mail
                </span>
                {user.email}
              </p>
            </div>
          </div>

          {/* Right side: Actions & Role badge */}
          <div className="w-full sm:w-auto flex flex-col sm:items-end gap-3 shrink-0">
            <button
              onClick={handleOpenEditModal}
              className="btn-primary !py-2.5 !px-4 text-xs flex items-center justify-center gap-2"
              id="edit-profile-btn"
            >
              <span className="material-symbols-outlined text-base select-none">edit</span>
              Edit Profile
            </button>

            <div className="bg-[#0B0E15] border border-divider-border/80 rounded-lg px-4 py-2.5 flex flex-col sm:items-end gap-0.5">
              <div className="font-code text-xs font-bold text-primary tracking-wider uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-base">shield_person</span>
                ROLE: {user.role} ({user.roleAccess})
              </div>
              <span className="font-code text-[11px] text-on-surface-variant">
                Joined {user.joinedDate}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: Learning Statistics & Completed Courses */}
        <div className="w-full bg-surface-cmd border border-divider-border/60 rounded-xl p-6 sm:p-8 card-glow-cyan transition-all duration-300 flex flex-col gap-6">
          <div className="flex items-center justify-between pb-4 border-b border-divider-border/50 flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-secondary text-2xl select-none">
                workspace_premium
              </span>
              <div>
                <h3 className="font-headline text-xl font-bold text-white">
                  Learning Overview & Progress
                </h3>
                <p className="font-code text-xs text-on-surface-variant">
                  Track your completed courses and interactive terminal practice
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push('/courses')}
              className="font-code text-xs font-semibold text-secondary hover:text-white flex items-center gap-1 transition-colors"
            >
              Browse Catalog
              <span className="material-symbols-outlined text-base select-none">arrow_forward</span>
            </button>
          </div>

          {/* Grid Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stat 1: Completed Courses */}
            <div className="bg-[#0B0E15] border border-divider-border/60 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="font-code text-xs text-on-surface-variant uppercase font-semibold">
                  Completed Courses
                </span>
                <span className="material-symbols-outlined text-primary text-xl select-none">
                  task_alt
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-headline text-2xl font-bold text-white">
                  {user.stats?.completedCourses || 0}
                </span>
                <span className="font-code text-xs text-on-surface-variant">
                  / {user.stats?.totalCourses || 5} Courses
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-surface-course h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-primary h-full transition-all duration-500 rounded-full"
                  style={{
                    width: `${
                      ((user.stats?.completedCourses || 0) / (user.stats?.totalCourses || 5)) * 100
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Stat 2: Lessons Completed */}
            <div className="bg-[#0B0E15] border border-divider-border/60 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-code text-xs text-on-surface-variant uppercase font-semibold">
                  Lessons Mastered
                </span>
                <span className="material-symbols-outlined text-secondary text-xl select-none">
                  menu_book
                </span>
              </div>
              <span className="font-headline text-2xl font-bold text-white">
                {user.stats?.completedLessons || 0}
              </span>
              <span className="font-code text-[11px] text-secondary">
                ● Hands-on exercises
              </span>
            </div>

            {/* Stat 3: Practice Hours */}
            <div className="bg-[#0B0E15] border border-divider-border/60 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-code text-xs text-on-surface-variant uppercase font-semibold">
                  Practice Hours
                </span>
                <span className="material-symbols-outlined text-accent-amber text-xl select-none">
                  timer
                </span>
              </div>
              <span className="font-headline text-2xl font-bold text-white">
                {user.stats?.practiceHours || 0} hrs
              </span>
              <span className="font-code text-[11px] text-accent-amber">
                ● In terminal sandbox
              </span>
            </div>

            {/* Stat 4: Learning Streak */}
            <div className="bg-[#0B0E15] border border-divider-border/60 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-code text-xs text-on-surface-variant uppercase font-semibold">
                  Day Streak
                </span>
                <span className="material-symbols-outlined text-orange-400 text-xl select-none">
                  local_fire_department
                </span>
              </div>
              <span className="font-headline text-2xl font-bold text-white">
                {user.stats?.streakDays || 0} Days 🔥
              </span>
              <span className="font-code text-[11px] text-orange-400">
                ● Active learner status
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: Profile Details */}
        <div className="w-full bg-surface-cmd border border-divider-border/60 rounded-xl p-6 sm:p-8 card-glow-cyan transition-all duration-300 flex flex-col gap-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-divider-border/50">
            <span className="material-symbols-outlined text-secondary text-2xl select-none">
              badge
            </span>
            <h3 className="font-headline text-xl font-bold text-white">
              Account Credentials & Metadata
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email Address */}
            <div className="flex flex-col gap-2">
              <label className="font-code text-xs text-on-surface-variant font-medium tracking-wider uppercase">
                Email Address
              </label>
              <div className="bg-[#0B0E15] border border-divider-border/60 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                <span className="font-code text-sm text-white font-medium truncate">
                  {user.email}
                </span>
                <span className="tag-primary text-[10px] shrink-0">
                  Primary
                </span>
              </div>
            </div>

            {/* Account Role */}
            <div className="flex flex-col gap-2">
              <label className="font-code text-xs text-on-surface-variant font-medium tracking-wider uppercase">
                Account Role
              </label>
              <div className="bg-[#0B0E15] border border-divider-border/60 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                <span className="font-code text-sm text-on-surface truncate">
                  {user.roleDescription}
                </span>
                <span className="tag-outline text-[10px] shrink-0">
                  {user.roleAccess}
                </span>
              </div>
            </div>

            {/* User ID */}
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="font-code text-xs text-on-surface-variant font-medium tracking-wider uppercase">
                User Identifier (UID)
              </label>
              <div className="bg-[#0B0E15] border border-divider-border/60 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-lg select-none">
                    fingerprint
                  </span>
                  <span className="font-code text-sm font-semibold text-secondary tracking-wide">
                    {user.userId}
                  </span>
                </div>
                <button
                  onClick={handleCopyUid}
                  className="font-code text-xs text-on-surface-variant hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 focus-visible active:scale-95"
                  id="copy-uid-btn"
                >
                  <span className="material-symbols-outlined text-sm select-none">
                    {copiedUid ? 'check' : 'content_copy'}
                  </span>
                  {copiedUid ? 'Copied' : 'Copy UID'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 4: Password & Security */}
        <div className="w-full bg-surface-cmd border border-divider-border/60 rounded-xl p-6 sm:p-8 card-glow-amber transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col gap-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-accent-amber text-2xl select-none">
                lock_reset
              </span>
              <h3 className="font-headline text-xl font-bold text-white">
                Password & Security
              </h3>
            </div>
            <p className="body-sm text-on-surface-variant">
              Request a one-time secure password reset link sent directly to your verified email address to update your authentication credentials.
            </p>
          </div>

          <button
            onClick={handleSendResetEmail}
            disabled={resetStatus === 'loading'}
            className="btn-primary !bg-accent-amber !text-[#0A0D14] hover:!brightness-110 disabled:opacity-75 disabled:cursor-not-allowed w-full md:w-auto shrink-0 active:scale-[0.98]"
            id="reset-password-btn"
          >
            {resetStatus === 'loading' ? (
              <>
                <span className="material-symbols-outlined text-lg animate-spin select-none">
                  progress_activity
                </span>
                Dispatching reset email...
              </>
            ) : resetStatus === 'success' ? (
              <>
                <span className="material-symbols-outlined text-lg select-none">
                  check_circle
                </span>
                Reset link sent!
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg select-none">
                  mail_lock
                </span>
                Send password reset email
              </>
            )}
          </button>
        </div>

        {/* CARD 5: Session & Logout */}
        <div className="w-full bg-surface-cmd border border-divider-border/60 rounded-xl p-6 sm:p-8 card-glow-red transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col gap-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-400 text-2xl select-none">
                power_settings_new
              </span>
              <h3 className="font-headline text-xl font-bold text-white">
                Session Management
              </h3>
            </div>
            <p className="body-sm text-on-surface-variant">
              Terminates your active browser session and revokes temporary Linux terminal sandbox authentication tokens.
            </p>
          </div>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full md:w-auto font-code text-xs font-semibold uppercase tracking-wider text-red-400 border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 hover:border-red-500/70 hover:text-red-300 py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 shrink-0 active:scale-[0.98] focus-visible"
            id="logout-btn"
          >
            <span className="material-symbols-outlined text-lg select-none">
              logout
            </span>
            Log out
          </button>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-[#141820] border border-primary/40 rounded-xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col gap-5 animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-dialog-title"
          >
            <div className="flex items-center justify-between border-b border-divider-border/60 pb-4">
              <div className="flex items-center gap-2.5 text-primary">
                <span className="material-symbols-outlined text-2xl select-none">
                  manage_accounts
                </span>
                <h3 id="edit-profile-dialog-title" className="font-headline text-lg font-bold text-white">
                  Edit Personal Information
                </h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-on-surface-variant hover:text-white p-1 transition-colors rounded"
              >
                <span className="material-symbols-outlined text-xl select-none">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              {/* Name input */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-name-input" className="font-code text-xs text-on-surface-variant uppercase font-semibold">
                  Full Name
                </label>
                <input
                  id="edit-name-input"
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Enter full name"
                  required
                  className="bg-[#0B0E15] border border-divider-border/80 focus:border-primary text-white text-sm rounded-lg px-4 py-2.5 font-body focus:outline-none transition-colors"
                />
              </div>

              {/* Bio input */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-bio-input" className="font-code text-xs text-on-surface-variant uppercase font-semibold">
                  Bio / Headline
                </label>
                <textarea
                  id="edit-bio-input"
                  rows={3}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Tell us about yourself or your coding journey..."
                  className="bg-[#0B0E15] border border-divider-border/80 focus:border-primary text-white text-sm rounded-lg px-4 py-2.5 font-body focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Email input */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-email-input" className="font-code text-xs text-on-surface-variant uppercase font-semibold">
                  Email Address
                </label>
                <input
                  id="edit-email-input"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="name@example.com"
                  required
                  className="bg-[#0B0E15] border border-divider-border/80 focus:border-primary text-white text-sm rounded-lg px-4 py-2.5 font-code focus:outline-none transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-divider-border/60">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary !py-2 !px-4 !text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary !py-2 !px-5 !text-xs"
                  id="save-profile-btn"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-[#141820] border border-red-500/40 rounded-xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col gap-5 animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
          >
            <div className="flex items-center gap-3 text-red-400 border-b border-divider-border/60 pb-4">
              <span className="material-symbols-outlined text-3xl select-none">
                warning
              </span>
              <div>
                <h3 id="logout-dialog-title" className="font-headline text-lg font-bold text-white">
                  Confirm Session Logout
                </h3>
                <p className="font-code text-xs text-on-surface-variant">
                  Action required
                </p>
              </div>
            </div>

            <p className="font-body text-sm text-on-surface-variant leading-relaxed">
              Are you sure you want to log out? Your active BashLab sandbox tokens and current terminal session state will be invalidated.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="btn-secondary !py-2.5 !px-4 !text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="font-code text-xs font-bold uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white py-2.5 px-5 rounded-md flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-95"
                id="confirm-logout-btn"
              >
                <span className="material-symbols-outlined text-base select-none">
                  logout
                </span>
                Confirm Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

