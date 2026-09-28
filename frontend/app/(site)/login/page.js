'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/auth/AuthShell';
import AuthField from '@/components/auth/AuthField';
import styles from '@/components/auth/Auth.module.css';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/my-learning');
    });
  }, [router]);

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
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setErrorMessage(/banned/i.test(error.message)
        ? 'Your account has been locked by an administrator.'
        : error.message);
      setStatus('error');
      return;
    }
    router.push('/my-learning');
  }

  return <AuthShell title="Welcome back" description="Log in to continue learning and return to your workspace.">
    {status === 'error' && <p className={styles.errorBox} role="alert">{errorMessage || 'Invalid email or password.'}</p>}
    <form className={styles.form} onSubmit={submit} noValidate>
      <AuthField id="email" label="Email address" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(value) => { setEmail(value); setErrors({ ...errors, email: '' }); }} error={errors.email} />
      <AuthField id="password" label="Password" type="password" autoComplete="current-password" value={password} onChange={(value) => { setPassword(value); setErrors({ ...errors, password: '' }); }} error={errors.password} aside={<a className={styles.textLink} href="/forgot-password">Forgot password?</a>} />
      <label className={styles.choice}><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />Remember this device</label>
      <button className={styles.button} type="submit" disabled={status === 'loading'}>{status === 'loading' ? 'Logging in…' : 'Log in'}</button>
    </form>
    <p className={styles.bottomLink}>New to BashLab? <a className={styles.textLink} href="/register">Create an account</a></p>
  </AuthShell>;
}
