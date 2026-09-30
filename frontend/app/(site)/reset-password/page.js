'use client';

import { useState } from 'react';
import AuthShell from '@/components/auth/AuthShell';
import AuthField from '@/components/auth/AuthField';
import styles from '@/components/auth/Auth.module.css';
import { supabase } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

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
    setStatus('loading');
    // The recovery session comes from the link Supabase emailed (parsed
    // automatically from the URL by the client on page load).
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorMessage(error.message);
      setStatus('error');
      return;
    }
    // The recovery session only exists to allow this change — sign out so
    // "Back to log in" actually lands on the login form, not the dashboard.
    await supabase.auth.signOut();
    setStatus('complete');
  }

  return <AuthShell title="Create a new password" description="Choose a new password for your BashLab account.">
    {status === 'error' && <p className={styles.errorBox} role="alert">{errorMessage || 'This reset link is invalid or has expired.'}</p>}
    {status === 'complete' ? <div className={styles.result} role="status">
      <p className={styles.successBox}>Your password has been updated. You can now log in with your new credentials.</p>
      <a className={styles.button} href="/login">Back to log in</a>
    </div> : <form className={styles.form} onSubmit={submit} noValidate>
      <AuthField id="password" label="New password" type="password" autoComplete="new-password" value={password} onChange={(value) => { setPassword(value); setErrors({ ...errors, password: '' }); }} error={errors.password} hint="Use at least 8 characters." />
      <AuthField id="confirmation" label="Confirm new password" type="password" autoComplete="new-password" value={confirmation} onChange={(value) => { setConfirmation(value); setErrors({ ...errors, confirmation: '' }); }} error={errors.confirmation || (confirmation && confirmation !== password ? 'Passwords do not match.' : '')} />
      <button className={styles.button} type="submit" disabled={status === 'loading'}>{status === 'loading' ? 'Checking password…' : 'Update password'}</button>
    </form>}
    {status !== 'complete' && <p className={styles.bottomLink}><a className={styles.textLink} href="/login">Back to log in</a></p>}
  </AuthShell>;
}
