'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthShell from '@/components/auth/AuthShell';
import styles from '@/components/auth/Auth.module.css';

const previews = ['inbox', 'cooldown', 'verified', 'expired'];

function VerifyEmail() {
  const params = useSearchParams();
  const email = params.get('email') || 'your email address';
  const requested = params.get('state');
  const [view, setView] = useState(requested === 'verified' || requested === 'expired' ? requested : 'inbox');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!secondsLeft) return undefined;
    const timer = window.setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  function resend() {
    if (sending || secondsLeft) return;
    setSending(true);
    window.setTimeout(() => { setSending(false); setView('cooldown'); setSecondsLeft(45); }, 700);
  }

  const content = {
    inbox: ['Check your email', 'Account email:', 'Your account needs email verification. The link will be available when email delivery is connected.'],
    cooldown: ['Request received', 'Verification email address:', 'This is a preview. Email delivery is not connected, so no message has been sent.'],
    verified: ['Email verified', 'Account email:', 'Verification is shown here as a preview. Account activation is not connected yet.'],
    expired: ['Link expired', 'Account email:', 'The verification link is unavailable. Request a new link to try again.'],
  }[view];

  return <AuthShell title={content[0]} description={content[2]} demoNote="Preview only — email delivery and verification are not connected yet.">
    <p className={styles.emailLabel}>{content[1]}</p>
    <p className={styles.emailValue}>{email}</p>
    {view === 'verified' ? <a className={styles.button} href="/login">Back to log in</a> : <div className={styles.result}>
      <button type="button" className={styles.button} onClick={resend} disabled={sending || secondsLeft > 0}>{sending ? 'Preparing request…' : secondsLeft ? `Try again in ${secondsLeft}s` : view === 'expired' ? 'Request new link' : 'Resend verification email'}</button>
      <a className={styles.textLink} href="/login">Back to log in</a>
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
