'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function RegisterPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [agreeTerms, setAgreeTerms] = React.useState(false);

  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const [errors, setErrors] = React.useState({});
  const [status, setStatus] = React.useState('idle'); // 'idle' | 'loading' | 'error'

  // Validation rules designed to maximize input accuracy and minimize submission friction
  const validate = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Password confirmation is required';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!agreeTerms) {
      newErrors.agreeTerms = 'You must accept the terms to proceed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setStatus('loading');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setErrorMessage(error.message);
      setStatus('error');
      return;
    }
    router.push(`/verify-email?email=${encodeURIComponent(email)}`);
  }

  const isLengthValid = password.length >= 8;
  const isMatchValid = confirmPassword.length > 0 && password === confirmPassword;

  return (
    <div className="w-full flex-1 flex items-center justify-center px-4 py-8 md:py-12 max-[1600px]:py-6 max-[950px]:py-4">
      <div className="w-full max-w-[780px] max-[1600px]:max-w-[540px] bg-surface-cmd border border-divider-border/60 rounded-xl shadow-2xl p-6 md:p-10 max-[1600px]:p-5 flex flex-col gap-6 max-[1600px]:gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-headline text-3xl md:text-4xl max-[1600px]:text-3xl font-semibold text-white tracking-tight">
            Create your account
          </h1>
          <p className="body-md">
            Join BashLab to master shell scripting through interactive sandbox sessions.
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
                Registration failed
              </span>
              <p className="body-sm">{errorMessage || 'Could not create your account.'}</p>
            </div>
          </div>
        )}

        <form className="flex flex-col gap-4 max-[1600px]:gap-3" onSubmit={handleSubmit} noValidate>
          {/* Email input */}
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
              placeholder="developer@domain.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              className={`w-full bg-[#0B0E15] text-on-surface text-sm rounded-lg px-3 py-2.5 max-[1600px]:py-2 outline-none border ${
                errors.email ? 'border-red-500/80 focus:border-red-500' : 'border-transparent focus:border-primary/50'
              } placeholder:text-on-surface-variant/60 focus:bg-black/40 transition-colors`}
            />
            {errors.email && (
              <span className="text-xs text-red-400 font-code">{errors.email}</span>
            )}
          </div>

          {/* Password input */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="font-code text-xs text-on-surface font-medium">
              Password
            </label>
            <div className="relative flex items-center">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                className={`w-full bg-[#0B0E15] text-on-surface font-code text-sm rounded-lg pl-3 pr-10 py-2.5 max-[1600px]:py-2 outline-none border ${
                  errors.password ? 'border-red-500/80 focus:border-red-500' : 'border-transparent focus:border-primary/50'
                } placeholder:text-on-surface-variant/60 focus:bg-black/40 transition-colors`}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 p-1 text-on-surface-variant hover:text-on-surface transition-colors rounded focus-visible"
              >
                <span className="material-symbols-outlined text-lg select-none">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {errors.password && (
              <span className="text-xs text-red-400 font-code">{errors.password}</span>
            )}
          </div>

          {/* Confirm Password input */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="font-code text-xs text-on-surface font-medium">
              Confirm password
            </label>
            <div className="relative flex items-center">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                className={`w-full bg-[#0B0E15] text-on-surface font-code text-sm rounded-lg pl-3 pr-10 py-2.5 max-[1600px]:py-2 outline-none border ${
                  errors.confirmPassword ? 'border-red-500/80 focus:border-red-500' : 'border-transparent focus:border-primary/50'
                } placeholder:text-on-surface-variant/60 focus:bg-black/40 transition-colors`}
              />
              <button
                type="button"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-2.5 p-1 text-on-surface-variant hover:text-on-surface transition-colors rounded focus-visible"
              >
                <span className="material-symbols-outlined text-lg select-none">
                  {showConfirmPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {errors.confirmPassword && (
              <span className="text-xs text-red-400 font-code">{errors.confirmPassword}</span>
            )}
          </div>

          {/* Password feedback indicators */}
          {password.length > 0 && (
            <div className="p-2.5 max-[1600px]:p-2 bg-[#0B0E15] rounded-lg flex flex-col gap-1.5 max-[1600px]:gap-1 border border-divider-border/40 text-xs font-code">
              <div className="flex items-center gap-2">
                <span
                  className={`material-symbols-outlined text-sm select-none ${
                    isLengthValid ? 'text-primary' : 'text-on-surface-variant/60'
                  }`}
                >
                  {isLengthValid ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                <span className={isLengthValid ? 'text-on-surface' : 'text-on-surface-variant/70'}>
                  At least 8 characters
                </span>
              </div>
              {confirmPassword.length > 0 && (
                <div className="flex items-center gap-2">
                  <span
                    className={`material-symbols-outlined text-sm select-none ${
                      isMatchValid ? 'text-primary' : 'text-on-surface-variant/60'
                    }`}
                  >
                    {isMatchValid ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span className={isMatchValid ? 'text-on-surface' : 'text-on-surface-variant/70'}>
                    Passwords match
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Terms checkbox */}
          <div className="flex flex-col gap-1 pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => {
                  setAgreeTerms(e.target.checked);
                  if (errors.agreeTerms) setErrors((prev) => ({ ...prev, agreeTerms: undefined }));
                }}
                className="mt-0.5 w-4 h-4 rounded bg-[#0B0E15] accent-primary cursor-pointer"
              />
              <span className="text-xs text-on-surface-variant group-hover:text-on-surface transition-colors leading-relaxed">
                I agree to the Terms of Service and Privacy Policy for practicing on the BashLab platform.
              </span>
            </label>
            {errors.agreeTerms && (
              <span className="text-xs text-red-400 font-code pl-6">{errors.agreeTerms}</span>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="btn-primary w-full mt-2 max-[1600px]:py-3 max-[1600px]:px-6 disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? (
              <span className="material-symbols-outlined text-lg animate-spin select-none">
                progress_activity
              </span>
            ) : (
              <>
                Create account
                <span className="material-symbols-outlined text-lg select-none">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-3 flex items-center justify-center text-sm border-t border-divider-border/60">
          <span className="text-on-surface-variant">
            Already have an account?{' '}
            <a
              href="/login"
              className="text-primary hover:underline font-medium focus-visible ml-1"
            >
              Log in
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}
