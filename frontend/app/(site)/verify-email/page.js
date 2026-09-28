'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthShell from '@/components/auth/AuthShell';
import styles from '@/components/auth/Auth.module.css';
import { supabase } from '@/lib/supabaseClient';

const previews = ['inbox', 'cooldown', 'verified', 'expired'];

function VerifyEmail() {
  const params = useSearchParams();
  const email = params.get('email') || 'your email address';
  const requested = params.get('state');
  const [view, setView] = useState(requested === 'verified' || requested === 'expired' ? requested : 'inbox');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sending, setSending] = useState(false);

  // Supabase's client auto-processes the verification link's URL (session or
  // error) on load. If it left us signed in, the link was valid; an
  // `error_description` in the URL means expired/invalid.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (hash.get('error') || params.get('error')) {
      setView('expired');
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setView('verified');
    });
  }, [params]);

  useEffect(() => {
    if (!secondsLeft) return undefined;
    const timer = window.setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  async function resend() {
    if (sending || secondsLeft) return;
    setSending(true);
    await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/verify-email` },
    });
    setSending(false);
    setView('cooldown');
    setSecondsLeft(45);
  }

  const content = {
    inbox: ['Check your email', 'Account email:', 'We sent an activation link to verify your account. Click it to continue.'],
    cooldown: ['Request received', 'Verification email address:', 'We sent another verification link. It may take a minute to arrive — check spam too.'],
    verified: ['Email verified', 'Account email:', 'Your account is active. You can now log in.'],
    expired: ['Link expired', 'Account email:', 'This verification link is invalid or has expired. Request a new one below.'],
  }[view];

  return <AuthShell title={content[0]} description={content[2]}>
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
