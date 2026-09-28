'use client';

import React, { Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';

function ResetPasswordContent() {
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

    const [status, setStatus] = React.useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
    const [errorMessage, setErrorMessage] = React.useState('');
    const [errors, setErrors] = React.useState({});

    const isLengthValid = password.length >= 8;
    const isMatchValid = confirmPassword.length > 0 && password === confirmPassword;

    function validate() {
        const errs = {};
        if (!password) {
            errs.password = 'Password is required';
        } else if (password.length < 8) {
            errs.password = 'Password must be at least 8 characters';
        }

        if (!confirmPassword) {
            errs.confirmPassword = 'Confirmation is required';
        } else if (password !== confirmPassword) {
            errs.confirmPassword = 'Passwords do not match';
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (!validate()) return;

        setStatus('loading');
        // The recovery session comes from the link Supabase emailed (parsed
        // automatically from the URL by the client on page load).
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
            setErrorMessage(error.message);
            setStatus('error');
            return;
        }
        setStatus('success');
    }

    return (
        <div className="w-full min-h-[70vh] flex items-center justify-center px-4 py-16 md:py-24">
            <div className="w-full max-w-[440px] bg-surface-cmd border border-divider-border/60 rounded-xl shadow-2xl p-6 md:p-8 flex flex-col gap-6">
                <div className="flex flex-col gap-1">
                    <h1 className="font-headline text-2xl font-semibold text-white tracking-tight">
                        Create new password
                    </h1>
                    <p className="body-md">
                        Choose a strong password to secure your terminal sessions and progress.
                    </p>
                </div>

                {status === 'error' && (
                    <div
                        className="rounded-lg p-3 flex items-start gap-3 bg-[#0B0E15] border border-accent-amber/30"
                        role="alert"
                    >
                        <span className="material-symbols-outlined text-accent-amber text-lg leading-none select-none">
                            warning
                        </span>
                        <p className="body-sm text-accent-amber">
                            {errorMessage || 'This reset link is invalid or has expired.'}
                        </p>
                    </div>
                )}

                {status === 'success' ? (
                    <div className="flex flex-col gap-5">
                        <div className="p-4 rounded-lg bg-[#0B0E15] border border-primary/30 flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-xl leading-none select-none">
                check_circle
              </span>
                            <div className="flex flex-col gap-1">
                <span className="font-code text-xs uppercase tracking-wide text-primary font-semibold">
                  Password updated
                </span>
                                <p className="body-sm text-on-surface">
                                    Your password has been successfully updated. You can now log in with your new credentials.
                                </p>
                            </div>
                        </div>

                        <a href="/login" className="btn-primary w-full text-center flex items-center justify-center gap-2">
                            Proceed to log in
                            <span className="material-symbols-outlined text-lg select-none">arrow_forward</span>
                        </a>
                    </div>
                ) : (
                    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="password" className="font-code text-xs text-on-surface font-medium">
                                New password
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
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`w-full bg-[#0B0E15] text-on-surface font-code text-sm rounded-lg pl-3 pr-10 py-2.5 outline-none border transition-colors ${
                                        errors.password ? 'border-accent-amber/60' : 'border-transparent focus:border-primary/50'
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-2.5 p-1 text-on-surface-variant hover:text-on-surface transition-colors"
                                >
                  <span className="material-symbols-outlined text-lg select-none">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                                </button>
                            </div>
                            {errors.password && <p className="text-xs text-accent-amber">{errors.password}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="confirmPassword" className="font-code text-xs text-on-surface font-medium">
                                Confirm new password
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
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`w-full bg-[#0B0E15] text-on-surface font-code text-sm rounded-lg pl-3 pr-10 py-2.5 outline-none border transition-colors ${
                                        errors.confirmPassword ? 'border-accent-amber/60' : 'border-transparent focus:border-primary/50'
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword((v) => !v)}
                                    className="absolute right-2.5 p-1 text-on-surface-variant hover:text-on-surface transition-colors"
                                >
                  <span className="material-symbols-outlined text-lg select-none">
                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                  </span>
                                </button>
                            </div>
                            {errors.confirmPassword && <p className="text-xs text-accent-amber">{errors.confirmPassword}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5 pt-1">
                            <div className="flex items-center gap-2 text-xs font-code">
                <span className={`material-symbols-outlined text-sm ${isLengthValid ? 'text-primary' : 'text-on-surface-variant/40'}`}>
                  {isLengthValid ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                                <span className={isLengthValid ? 'text-on-surface' : 'text-on-surface-variant/60'}>
                  At least 8 characters
                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-code">
                <span className={`material-symbols-outlined text-sm ${isMatchValid ? 'text-primary' : 'text-on-surface-variant/40'}`}>
                  {isMatchValid ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                                <span className={isMatchValid ? 'text-on-surface' : 'text-on-surface-variant/60'}>
                  Passwords match
                </span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="btn-primary w-full mt-2 disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                            {status === 'loading' ? (
                                <span className="material-symbols-outlined text-lg animate-spin select-none">
                  progress_activity
                </span>
                            ) : (
                                'Update password'
                            )}
                        </button>
                    </form>
                )}

                <div className="pt-3 flex items-center justify-center text-sm border-t border-divider-border/60">
                    <a
                        href="/login"
                        className="text-on-surface-variant hover:text-on-surface transition-colors hover:underline focus-visible"
                    >
                        Back to log in
                    </a>
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ResetPasswordContent />
        </Suspense>
    );
}