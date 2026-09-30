'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Account.module.css';
import { authClient } from '@/lib/authClient';
import { useAuth } from '@/components/auth/AuthProvider';
import { PageLoading } from '@/components/shared/Loading';

const EMPTY_USER = {
  name: '',
  bio: '',
  initials: 'U',
  avatarUrl: null,
  email: '',
  userId: '',
  age: '',
  location: '',
  occupation: '',
  role: 'learner',
  roleDescription: 'Learner (Managed by platform)',
  roleAccess: 'Read-only',
  isVerified: false,
  joinedDate: '',
};

// Center-crops to a square and scales to `size` px, returning a JPEG data URL.
async function downscaleImage(file, size) {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas.getContext('2d').drawImage(
    bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size,
  );
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}

function getInitials(fullName) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function toUser(authUser, profile) {
  return {
    ...EMPTY_USER,
    name: profile?.name || '',
    bio: profile?.bio || '',
    avatarUrl: profile?.avatar_url || null,
    age: profile?.age ?? '',
    location: profile?.location || '',
    occupation: profile?.occupation || '',
    initials: getInitials(profile?.name || authUser.email),
    email: authUser.email,
    userId: authUser.id,
    role: profile?.role === 'admin' ? 'Admin' : 'Learner',
    roleDescription: profile?.role === 'admin' ? 'Admin (Full access)' : 'Learner (Managed by platform)',
    roleAccess: profile?.role === 'admin' ? 'Full access' : 'Read-only',
    isVerified: !!authUser.email_confirmed_at,
    joinedDate: authUser.created_at
      ? new Date(authUser.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : '',
  };
}

export default function AccountPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  // State management
  const [user, setUser] = useState(EMPTY_USER);
  const [loading, setLoading] = useState(true);
  const [resetStatus, setResetStatus] = useState('idle'); // idle | loading | success | error
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');
  const [toast, setToast] = useState(null); // { type: 'success' | 'error' | 'info', title: string, message: string }

  // Profile Edit Form State
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    email: '',
    age: '',
    location: '',
    occupation: '',
  });

  // Signed-in user comes from the shared AuthProvider (no extra auth round
  // trip); only the full profile row is fetched here.
  const { user: authUser, loading: authLoading } = useAuth();
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (authLoading) return undefined;
    if (!authUser) {
      router.replace('/login?next=%2Faccount');
      return undefined;
    }
    let cancelled = false;
    authClient.fetchProfile()
      .then((profile) => {
        if (cancelled) return;
        setUser(toUser(authUser, profile));
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setToast({ type: 'error', title: 'Could not load profile', message: error.message });
        setUser(toUser(authUser, null));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [authLoading, authUser, router]);

  // Auto hide toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Open Edit Profile Modal
  const handleOpenEditModal = () => {
    setEditForm({
      name: user.name,
      bio: user.bio || '',
      email: user.email,
      age: user.age || '',
      location: user.location || '',
      occupation: user.occupation || '',
    });
    setShowEditModal(true);
  };

  // Save Profile Changes — via the API (PATCH /api/auth/profile), which
  // validates the fields and only ever writes name/bio/age/location/occupation/avatar.
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!editForm.name.trim()) {
      setToast({ type: 'error', title: 'Validation Error', message: 'Full Name cannot be empty.' });
      return;
    }
    const age = editForm.age === '' ? null : Number(editForm.age);
    if (age !== null && (!Number.isInteger(age) || age < 1 || age > 120)) {
      setToast({ type: 'error', title: 'Validation Error', message: 'Age must be a whole number between 1 and 120.' });
      return;
    }

    setSaving(true);
    let saved;
    try {
      // authClient tells the rest of the app (navbar) about the new name.
      saved = await authClient.updateProfile({
        name: editForm.name.trim(),
        bio: editForm.bio.trim(),
        age,
        location: editForm.location.trim(),
        occupation: editForm.occupation.trim(),
      });
    } catch (error) {
      setSaving(false);
      setToast({ type: 'error', title: 'Save failed', message: error.message });
      return;
    }
    setSaving(false);

    setUser((prev) => ({
      ...prev,
      name: saved.name,
      bio: saved.bio,
      age: saved.age ?? '',
      location: saved.location,
      occupation: saved.occupation,
      initials: getInitials(saved.name),
    }));
    setShowEditModal(false);
    setToast({ type: 'success', title: 'Profile Updated', message: 'Your account information has been saved successfully.' });
  };

  // Handle Avatar Image Upload — stored as a base64 data URL directly in
  // `avatar_url` (text column; no storage bucket in this project). The image
  // is downscaled to 256px JPEG first: a raw 5MB photo as base64 made the
  // profile row ~7MB and every read of it slow.
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setToast({ type: 'error', title: 'Not an image', message: 'Please choose a PNG, JPEG, GIF or WebP image.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setToast({ type: 'error', title: 'File Too Large', message: 'Please choose an image under 5MB.' });
      return;
    }

    let dataUrl;
    try {
      dataUrl = await downscaleImage(file, 256);
    } catch {
      setToast({ type: 'error', title: 'Avatar update failed', message: 'That image could not be read.' });
      return;
    }
    try {
      await authClient.updateProfile({ avatar_url: dataUrl });
    } catch (error) {
      setToast({ type: 'error', title: 'Avatar update failed', message: error.message });
      return;
    }
    setUser((prev) => ({ ...prev, avatarUrl: dataUrl }));
    setToast({ type: 'success', title: 'Avatar Updated', message: 'Your profile picture has been updated.' });
  };

  // Remove Custom Avatar
  const handleRemoveAvatar = async () => {
    try {
      await authClient.updateProfile({ avatar_url: null });
    } catch (error) {
      setToast({ type: 'error', title: 'Avatar reset failed', message: error.message });
      return;
    }
    setUser((prev) => ({ ...prev, avatarUrl: null }));
    setToast({ type: 'info', title: 'Avatar Reset', message: 'Reverted to default initial avatar.' });
  };

  // Handle password reset email request
  const handleSendResetEmail = async () => {
    if (resetStatus === 'loading') return;
    setResetStatus('loading');
    try {
      await authClient.forgotPassword(user.email);
    } catch (error) {
      setResetStatus('idle');
      setToast({ type: 'error', title: 'Could not send the email', message: error.message });
      return;
    }
    setResetStatus('success');
    setToast({
      type: 'success',
      title: 'Reset Link Dispatched',
      message: `A secure password reset email has been sent to ${user.email}. Please check your inbox.`,
    });
    setTimeout(() => setResetStatus('idle'), 4000);
  };

  // Handle Confirm Logout
  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    setToast({ type: 'info', title: 'Session Terminated', message: 'Logging out and clearing active session tokens...' });
    await authClient.logout();
    router.push('/login');
  };

  if (loading) return <PageLoading label="Loading your account…" />;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Account & Security<span>.</span></h1>
        <p>Your personal details. Your account, under control.</p>
      </header>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <nav aria-label="Account settings">
            <button type="button" aria-pressed={activeSection === 'profile'} className={activeSection === 'profile' ? styles.current : undefined} onClick={() => setActiveSection('profile')}><span className="material-symbols-outlined" aria-hidden="true">person</span>Personal profile</button>
            <button type="button" aria-pressed={activeSection === 'security'} className={activeSection === 'security' ? styles.current : undefined} onClick={() => setActiveSection('security')}><span className="material-symbols-outlined" aria-hidden="true">lock</span>Security & access</button>
          </nav>
          <p className={styles.memberSince}>Member since<br /><span>{user.joinedDate}</span></p>
        </aside>
        <div className={styles.content}>
          {activeSection === 'profile' && <section id="profile" aria-labelledby="profile-title" className={styles.profile}>
            <div className={styles.profileTop}>
              <div className={styles.avatarGroup}>
                <button className={styles.avatar} onClick={() => fileInputRef.current?.click()} aria-label="Change profile picture">
                  {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span>{user.initials}</span>}
                  <span className={'material-symbols-outlined ' + styles.camera} aria-hidden="true">photo_camera</span>
                </button>
                {user.avatarUrl && <button onClick={handleRemoveAvatar} className={styles.removeAvatar}>Remove photo</button>}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" hidden />
              <div className={styles.identity}>
                <div className={styles.nameLine}><h2 id="profile-title">{user.name}</h2>{user.isVerified && <span className={styles.verified}><span className="material-symbols-outlined" aria-hidden="true">verified</span>Verified</span>}</div>
                {user.bio && <p>{user.bio}</p>}<span className={styles.role}>{user.role}</span>
              </div>
              <button className={styles.button} id="edit-profile-btn" onClick={handleOpenEditModal} aria-expanded={showEditModal} aria-controls="profile-editor">Edit profile<span className="material-symbols-outlined" aria-hidden="true">edit</span></button>
            </div>
            {showEditModal && <form id="profile-editor" className={styles.editor} onSubmit={handleSaveProfile}>
              <h3>Edit profile</h3>
              <div className={styles.fields}>
                <label htmlFor="edit-name-input">Full name<input autoFocus id="edit-name-input" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></label>
                <label htmlFor="edit-email-input">Email address<input id="edit-email-input" type="email" readOnly disabled value={editForm.email} title="Changing your sign-in email isn't supported here yet." /></label>
                <label htmlFor="edit-age-input">Age<input id="edit-age-input" type="number" min="1" max="120" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} /></label>
                <label htmlFor="edit-location-input">Location<input id="edit-location-input" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} placeholder="City, country" /></label>
                <label htmlFor="edit-occupation-input">Occupation<input id="edit-occupation-input" value={editForm.occupation} onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })} /></label>
                <label className={styles.bioField} htmlFor="edit-bio-input">Bio<textarea id="edit-bio-input" rows={3} value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} /></label>
              </div>
              <div className={styles.actions}><button type="button" className={styles.button} onClick={() => setShowEditModal(false)}>Cancel</button><button id="save-profile-btn" type="submit" className={styles.primaryButton} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div>
            </form>}
            <div className={styles.sectionHeading}><h3>Account details</h3><p>The information associated with your BashLab account.</p></div>
            <dl className={styles.details}>
              <div><dt>Email address</dt><dd>{user.email}<span className={styles.tag}>Primary</span></dd></div>
              <div><dt>Account role</dt><dd><span>{user.role}<small>Managed by platform</small></span><span className={styles.tag}>{user.roleAccess}</span></dd></div>
              <div><dt>User ID</dt><dd>{user.userId || 'Not assigned'}<span className={styles.tag}>Demo</span></dd></div>
            </dl>
            <div className={styles.sectionHeading}><h3>Personal information</h3><p>Optional details you can update in your profile.</p></div>
            <dl className={styles.details}>
              <div><dt>Age</dt><dd>{user.age || 'Not provided'}</dd></div>
              <div><dt>Location</dt><dd>{user.location || 'Not provided'}</dd></div>
              <div><dt>Occupation</dt><dd>{user.occupation || 'Not provided'}</dd></div>
            </dl>
          </section>}
          {activeSection === 'security' && <section id="security" aria-labelledby="security-title" className={styles.security}>
            <div className={styles.sectionHeading}><h3 id="security-title">Security & access</h3><p>Manage your password and this browser session.</p></div>
            <div className={styles.settingRow}>
              <span className={'material-symbols-outlined ' + styles.rowIcon} aria-hidden="true">key</span>
              <div><h4>Password</h4><p>Send a reset link to your email address.</p></div>
              <button id="reset-password-btn" className={styles.button} onClick={handleSendResetEmail} disabled={resetStatus !== 'idle'}>{resetStatus === 'loading' ? 'Sending…' : resetStatus === 'success' ? 'Reset link sent' : 'Reset password'}<span className="material-symbols-outlined" aria-hidden="true">{resetStatus === 'success' ? 'check' : 'arrow_forward'}</span></button>
            </div>
            <div className={styles.settingRow}>
              <span className={'material-symbols-outlined ' + styles.rowIcon} aria-hidden="true">desktop_windows</span>
              <div><h4>Current session<span className={styles.active}>This browser</span></h4><p>Sign out of your account on this device.</p></div>
              <button id="logout-btn" className={styles.logout} onClick={() => setShowLogoutModal(true)}>Log out<span className="material-symbols-outlined" aria-hidden="true">logout</span></button>
            </div>
            {showLogoutModal && <div className={styles.confirm} role="group" aria-labelledby="logout-title"><div><h4 id="logout-title">Log out of BashLab?</h4><p>You’ll need to sign in again to continue learning.</p></div><div className={styles.actions}><button autoFocus className={styles.button} onClick={() => setShowLogoutModal(false)}>Cancel</button><button id="confirm-logout-btn" className={styles.logout} onClick={handleConfirmLogout}>Confirm log out</button></div></div>}
            <div className={styles.dangerZone}>
              <h3>Danger Zone</h3>
              <p>Permanently delete your account and all associated data. This action cannot be undone.</p>
              <button type="button" disabled aria-describedby="delete-unavailable">Delete Account</button>
              <small id="delete-unavailable">Account deletion is unavailable while the authentication service is offline.</small>
            </div>
          </section>}
        </div>
      </div>
      {toast && <div className={styles.toast} role="status" aria-live="polite"><div><strong>{toast.title}</strong><p>{toast.message}</p></div><button onClick={() => setToast(null)} aria-label="Close notification"><span className="material-symbols-outlined" aria-hidden="true">close</span></button></div>}
    </div>
  );
}
