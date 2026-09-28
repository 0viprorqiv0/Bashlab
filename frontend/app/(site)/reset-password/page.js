'use client';

import { useState } from 'react';
import AuthShell from '@/components/auth/AuthShell';
import AuthField from '@/components/auth/AuthField';
import styles from '@/components/auth/Auth.module.css';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');

  function submit(event) {
    event.preventDefault();
    const next = {};
    if (password.length < 8) next.password = 'Use at least 8 characters.';
    if (!confirmation || confirmation !== password) next.confirmation = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }
    setStatus('loading');
    window.setTimeout(() => setStatus('complete'), 700);
  }

  return <AuthShell title="Create a new password" description="Choose a new password for your BashLab account." demoNote="Preview only — this form cannot change your password yet.">
    {status === 'complete' ? <div className={styles.result} role="status">
      <p className={styles.successBox}>Form preview complete. Your password was not changed because account recovery is not connected yet.</p>
      <a className={styles.button} href="/login">Back to log in</a>
    </div> : <form className={styles.form} onSubmit={submit} noValidate>
      <AuthField id="password" label="New password" type="password" autoComplete="new-password" value={password} onChange={(value) => { setPassword(value); setErrors({ ...errors, password: '' }); }} error={errors.password} hint="Use at least 8 characters." />
      <AuthField id="confirmation" label="Confirm new password" type="password" autoComplete="new-password" value={confirmation} onChange={(value) => { setConfirmation(value); setErrors({ ...errors, confirmation: '' }); }} error={errors.confirmation || (confirmation && confirmation !== password ? 'Passwords do not match.' : '')} />
      <button className={styles.button} type="submit" disabled={status === 'loading'}>{status === 'loading' ? 'Checking password…' : 'Update password'}</button>
    </form>}
    {status !== 'complete' && <p className={styles.bottomLink}><a className={styles.textLink} href="/login">Back to log in</a></p>}
  </AuthShell>;
}
