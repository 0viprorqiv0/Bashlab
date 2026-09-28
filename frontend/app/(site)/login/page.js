'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [status, setStatus] = React.useState('idle'); // idle | loading | error
  const [errorMessage, setErrorMessage] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [remember, setRemember] = React.useState(true);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/my-learning');
    });
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('loading');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMessage(/banned/i.test(error.message)
        ? 'Your account has been locked by an administrator.'
        : error.message);
      setStatus('error');
      return;
    }
    setStatus('idle');
    router.push('/my-learning');
  }

  return (
    <div className="w-full flex-1 flex items-center justify-center px-4 py-10 md:py-14 max-[1600px]:py-6 max-[950px]:py-4">
      <div className="w-full max-w-[780px] max-[1600px]:max-w-[540px] bg-surface-cmd border border-divider-border/60 rounded-xl shadow-2xl p-6 md:p-10 max-[1600px]:p-5 flex flex-col gap-6 max-[1600px]:gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-headline text-3xl md:text-4xl max-[1600px]:text-3xl font-semibold text-white tracking-tight">
            Welcome back
          </h1>
          <p className="body-md">
            Enter your credentials to access your workspace and terminal sessions.
          </p>
        </div>

        {status === 'error' && (
          <div
            className="rounded-lg p-3 flex items-start gap-3 bg-[#0B0E15] border border-accent-amber/30"
            role="alert"
          >
            <span className="material-symbols-outlined text-accent-amber text-lg leading-none select-none">
              dns
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="font-code text-xs uppercase tracking-wide text-accent-amber font-semibold">
                Login failed
              </span>
              <p className="body-sm">{errorMessage || 'Invalid email or password.'}</p>
            </div>
          </div>
        )}

        <form className="flex flex-col gap-4 max-[1600px]:gap-3" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="font-code text-xs text-on-surface font-medium">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@domain.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full bg-[#0B0E15] text-on-surface text-sm rounded-lg px-3 py-2.5 max-[1600px]:py-2 outline-none border border-transparent placeholder:text-on-surface-variant/60 focus:border-primary/50 focus:bg-black/40 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="font-code text-xs text-on-surface font-medium">
              Password
            </label>
            <div className="relative flex items-center">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-[#0B0E15] text-on-surface font-code text-sm rounded-lg pl-3 pr-10 py-2.5 max-[1600px]:py-2 outline-none border border-transparent placeholder:text-on-surface-variant/60 focus:border-primary/50 focus:bg-black/40 transition-colors"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2.5 p-1 text-on-surface-variant hover:text-on-surface transition-colors rounded focus-visible"
              >
                <span className="material-symbols-outlined text-lg select-none">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none group pt-1">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="w-4 h-4 rounded bg-[#0B0E15] accent-primary cursor-pointer"
            />
            <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
              Remember this device
            </span>
          </label>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="btn-primary w-full mt-1 max-[1600px]:py-3 max-[1600px]:px-6 disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? (
              <span className="material-symbols-outlined text-lg animate-spin select-none">
                progress_activity
              </span>
            ) : (
              <>
                Log in
                <span className="material-symbols-outlined text-lg select-none">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-3 flex items-center justify-between text-sm border-t border-divider-border/60">
          <a
            href="/forgot-password"
            className="text-on-surface-variant hover:text-on-surface transition-colors hover:underline focus-visible"
          >
            Forgot password?
          </a>
          <a
            href="/register"
            className="text-on-surface-variant hover:text-on-surface transition-colors hover:underline focus-visible"
          >
            Create account
          </a>
        </div>
      </div>
    </div>
  );
}
