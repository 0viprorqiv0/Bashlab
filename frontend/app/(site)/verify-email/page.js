'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthShell from '@/components/auth/AuthShell';
import styles from '@/components/auth/Auth.module.css';
import { authClient } from '@/lib/authClient';

const previews = ['inbox', 'cooldown', 'verified', 'expired'];

function VerifyEmail() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const requested = params.get('state');
  const [view, setView] = useState(requested === 'verified' || requested === 'expired' ? requested : 'inbox');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sending, setSending] = useState(false);
  const [resendError, setResendError] = useState('');

  // Supabase verifies the emailed link itself, then redirects here with the
  // resulting session in the URL fragment (or an error). The token is checked
  // with the API before it is trusted; on success the learner is signed in.
  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    if (fragment.get('error') || params.get('error')) {
      setView('expired');
      return;
    }
    if (!fragment.get('access_token')) return;
    authClient.adoptSession(Object.fromEntries(fragment))
      .then(({ user }) => {
        setEmail(user.email);
        setView('verified');
      })
      .catch(() => setView('expired'));
  }, [params]);

  useEffect(() => {
    if (!secondsLeft) return undefined;
    const timer = window.setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  async function resend() {
    if (sending || secondsLeft) return;
    setSending(true);
    setResendError('');
    try {
      await authClient.resendVerification(email);
      setView('cooldown');
      setSecondsLeft(45);
    } catch (error) {
      setResendError(error.message);
    }
    setSending(false);
  }

  const content = {
    inbox: ['Check your email', 'Account email:', 'We sent an activation link to verify your account. Click it to continue.'],
    cooldown: ['Request received', 'Verification email address:', 'We sent another verification link. It may take a minute to arrive — check spam too.'],
    verified: ['Email verified', 'Account email:', 'Your account is active and you are signed in.'],
    expired: ['Link expired', 'Account email:', 'This verification link is invalid or has expired. Request a new one below.'],
  }[view];

  return <AuthShell title={content[0]} description={content[2]}>
    <p className={styles.emailLabel}>{content[1]}</p>
    <p className={styles.emailValue}>{email || 'your email address'}</p>
    {resendError && <p className={styles.errorBox} role="alert">{resendError}</p>}
    {view === 'verified' ? <Link className={styles.button} href="/courses/shell-101">Start learning</Link> : <div className={styles.result}>
      {email
        ? <button type="button" className={styles.button} onClick={resend} disabled={sending || secondsLeft > 0}>{sending ? 'Preparing request…' : secondsLeft ? `Try again in ${secondsLeft}s` : view === 'expired' ? 'Request new link' : 'Resend verification email'}</button>
        : <Link className={styles.button} href="/register">Create your account again</Link>}
      <Link className={styles.textLink} href="/login">Back to log in</Link>
    </div>}
    {process.env.NODE_ENV === 'development' && <div className={styles.preview} role="group" aria-label="Preview verification states">
      <span>Preview states</span>
      {previews.map((state) => <button key={state} type="button" aria-pressed={state === view} onClick={() => { setView(state); setSecondsLeft(state === 'cooldown' ? 45 : 0); }}>{state}</button>)}
    </div>}
  </AuthShell>;
}

export default function VerifyEmailPage() {
  return <Suspense fallback={null}><VerifyEmail /></Suspense>;
}
