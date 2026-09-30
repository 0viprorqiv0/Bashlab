'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/auth/AuthShell';
import AuthField from '@/components/auth/AuthField';
import styles from '@/components/auth/Auth.module.css';
import { authClient } from '@/lib/authClient';
import { useAuth } from '@/components/auth/AuthProvider';

// Pages that bounce anonymous visitors here pass ?next=<path> so the learner
// lands back where they were. Only same-site paths are honoured ("/x", not
// "//evil.com" or "https://…") so this can't be used as an open redirect.
function requestedNext() {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : null;
}

const landingPage = (profile) => requestedNext() || (profile?.role === 'admin' ? '/admin/content' : '/');

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Already signed in (or just finished logging in): leave the login page.
  const { user, profile, loading: authLoading } = useAuth();
  useEffect(() => {
    if (!authLoading && user) router.replace(landingPage(profile));
  }, [authLoading, user, profile, router]);

  async function submit(event) {
    event.preventDefault();
    const next = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(next.email ? 'email' : 'password')?.focus();
      return;
    }
    setStatus('loading');
    try {
      const { profile: signedIn } = await authClient.login(email.trim(), password);
      router.replace(landingPage(signedIn));
    } catch (error) {
      setErrorMessage(error.message);
      setStatus('error');
    }
  }

  return <AuthShell title="Welcome back" description="Log in to continue learning and return to your workspace.">
    {status === 'error' && <p className={styles.errorBox} role="alert">{errorMessage || 'Invalid email or password.'}</p>}
    <form className={styles.form} onSubmit={submit} noValidate>
      <AuthField id="email" label="Email address" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(value) => { setEmail(value); setErrors({ ...errors, email: '' }); }} error={errors.email} />
      <AuthField id="password" label="Password" type="password" autoComplete="current-password" value={password} onChange={(value) => { setPassword(value); setErrors({ ...errors, password: '' }); }} error={errors.password} aside={<Link className={styles.textLink} href="/forgot-password">Forgot password?</Link>} />
      <label className={styles.choice}><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />Remember this device</label>
      <button className={styles.button} type="submit" disabled={status === 'loading'}>{status === 'loading' ? 'Logging in…' : 'Log in'}</button>
    </form>
    <p className={styles.bottomLink}>New to BashLab? <Link className={styles.textLink} href="/register">Create an account</Link></p>
  </AuthShell>;
}
