'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import AuthShell from '@/components/auth/AuthShell';
import AuthField from '@/components/auth/AuthField';
import styles from '@/components/auth/Auth.module.css';
import { authClient } from '@/lib/authClient';

const INVALID_LINK = 'This reset link is invalid or has expired. Request a new one.';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  // The emailed link carries a one-time recovery token in the URL fragment.
  const recoveryToken = useRef(null);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (fragment.get('access_token') && fragment.get('type') === 'recovery') recoveryToken.current = fragment.get('access_token');
    if (fragment.get('error')) {
      setErrorMessage(INVALID_LINK);
      setStatus('error');
    }
    // Don't leave the token sitting in the address bar / history.
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  async function submit(event) {
    event.preventDefault();
    const next = {};
    if (password.length < 8) next.password = 'Use at least 8 characters.';
    if (!confirmation || confirmation !== password) next.confirmation = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }
    if (!recoveryToken.current) {
      setErrorMessage(INVALID_LINK);
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      // The API changes the password and signs every session out, so
      // "Back to log in" really lands on the login form.
      await authClient.resetPassword(recoveryToken.current, password);
      recoveryToken.current = null;
      setStatus('complete');
    } catch (error) {
      setErrorMessage(['UNAUTHENTICATED', 'RECOVERY_REQUIRED', 'RECOVERY_EXPIRED'].includes(error.code) ? INVALID_LINK : error.message);
      setStatus('error');
    }
  }

  return <AuthShell title="Create a new password" description="Choose a new password for your BashLab account.">
    {status === 'error' && <p className={styles.errorBox} role="alert">{errorMessage || INVALID_LINK}</p>}
    {status === 'complete' ? <div className={styles.result} role="status">
      <p className={styles.successBox}>Your password has been updated. You can now log in with your new credentials.</p>
      <Link className={styles.button} href="/login">Back to log in</Link>
    </div> : <form className={styles.form} onSubmit={submit} noValidate>
      <AuthField id="password" label="New password" type="password" autoComplete="new-password" value={password} onChange={(value) => { setPassword(value); setErrors({ ...errors, password: '' }); }} error={errors.password} hint="Use at least 8 characters." />
      <AuthField id="confirmation" label="Confirm new password" type="password" autoComplete="new-password" value={confirmation} onChange={(value) => { setConfirmation(value); setErrors({ ...errors, confirmation: '' }); }} error={errors.confirmation || (confirmation && confirmation !== password ? 'Passwords do not match.' : '')} />
      <button className={styles.button} type="submit" disabled={status === 'loading'}>{status === 'loading' ? 'Updating password…' : 'Update password'}</button>
    </form>}
    {status !== 'complete' && <p className={styles.bottomLink}><Link className={styles.textLink} href="/login">Back to log in</Link></p>}
  </AuthShell>;
}
