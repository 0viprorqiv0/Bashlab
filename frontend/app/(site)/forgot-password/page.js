'use client';

import { useEffect, useState } from 'react';
import AuthShell from '@/components/auth/AuthShell';
import AuthField from '@/components/auth/AuthField';
import styles from '@/components/auth/Auth.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle');
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!secondsLeft) return undefined;
    const timer = window.setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  function send(event) {
    event?.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      document.getElementById('email')?.focus();
      return;
    }
    setError('');
    setStatus('loading');
    window.setTimeout(() => { setStatus('sent'); setSecondsLeft(45); }, 700);
  }

  return <AuthShell title="Forgot your password?" description="Enter your email address to request a password reset link." demoNote="Preview only — no reset email is sent.">
    {status === 'sent' ? <div className={styles.result} role="status">
      <p className={styles.successBox}>If an account exists for <strong>{email}</strong>, reset instructions will be sent when email delivery is available.</p>
      <button type="button" className={styles.secondaryButton} disabled={secondsLeft > 0} onClick={() => send()}>{secondsLeft ? `Try again in ${secondsLeft}s` : 'Request another link'}</button>
    </div> : <form className={styles.form} onSubmit={send} noValidate>
      <AuthField id="email" label="Email address" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(value) => { setEmail(value); setError(''); }} error={error} />
      <button className={styles.button} type="submit" disabled={status === 'loading'}>{status === 'loading' ? 'Preparing request…' : 'Request reset link'}</button>
    </form>}
    <p className={styles.bottomLink}><a className={styles.textLink} href="/login">Back to log in</a></p>
  </AuthShell>;
}
