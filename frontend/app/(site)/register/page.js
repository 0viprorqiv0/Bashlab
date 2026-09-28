'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/auth/AuthShell';
import AuthField from '@/components/auth/AuthField';
import styles from '@/components/auth/Auth.module.css';
import { supabase } from '@/lib/supabaseClient';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [agreed, setAgreed] = useState(false);
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
    if (password.length < 8) next.password = 'Use at least 8 characters.';
    if (!confirmation || confirmation !== password) next.confirmation = 'Passwords do not match.';
    if (!agreed) next.agreed = 'Agree to the terms to continue.';
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }
    setStatus('loading');
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/verify-email` },
    });
    if (error) {
      setErrorMessage(error.message);
      setStatus('error');
      return;
    }
    router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
  }

  return <AuthShell title="Create your account" description="Start learning Bash with short lessons and hands-on practice.">
    {status === 'error' && <p className={styles.errorBox} role="alert">{errorMessage || 'Could not create your account.'}</p>}
    <form className={styles.form} onSubmit={submit} noValidate>
      <AuthField id="email" label="Email address" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(value) => { setEmail(value); setErrors({ ...errors, email: '' }); }} error={errors.email} />
      <AuthField id="password" label="Password" type="password" autoComplete="new-password" value={password} onChange={(value) => { setPassword(value); setErrors({ ...errors, password: '' }); }} error={errors.password} hint="Use at least 8 characters." />
      <AuthField id="confirmation" label="Confirm password" type="password" autoComplete="new-password" value={confirmation} onChange={(value) => { setConfirmation(value); setErrors({ ...errors, confirmation: '' }); }} error={errors.confirmation || (confirmation && password !== confirmation ? 'Passwords do not match.' : '')} />
      <div>
        <label className={styles.choice}><input id="agreed" type="checkbox" checked={agreed} aria-describedby={errors.agreed ? 'agreed-error' : undefined} onChange={(event) => { setAgreed(event.target.checked); setErrors({ ...errors, agreed: '' }); }} /><span>I agree to the Terms of Service and Privacy Policy for BashLab.</span></label>
        {errors.agreed && <p id="agreed-error" className={styles.error}>{errors.agreed}</p>}
      </div>
      <button className={styles.button} type="submit" disabled={status === 'loading'}>{status === 'loading' ? 'Creating account…' : 'Create account'}</button>
    </form>
    <p className={styles.bottomLink}>Already have an account? <a className={styles.textLink} href="/login">Log in</a></p>
  </AuthShell>;
}
