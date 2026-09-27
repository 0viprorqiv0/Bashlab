'use client';

import React from 'react';

const RESEND_COOLDOWN_SECONDS = 45;

export default function ForgotPasswordPage() {
    const [email, setEmail] = React.useState('');
    const [status, setStatus] = React.useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
    const [errorMessage, setErrorMessage] = React.useState('');
    const [secondsLeft, setSecondsLeft] = React.useState(0);

    React.useEffect(() => {
        if (secondsLeft <= 0) return undefined;
        const timer = setTimeout(() => setSecondsLeft((val) => val - 1), 1000);
        return () => clearTimeout(timer);
    }, [secondsLeft]);

    function validateEmail(val) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    }

    function handleSubmit(event) {
        event.preventDefault();
        setErrorMessage('');

        if (!email.trim()) {
            setErrorMessage('Please enter your email address.');
            return;
        }

        if (!validateEmail(email)) {
            setErrorMessage('Please enter a valid email address.');
            return;
        }

        setStatus('loading');

        // Send simulation (to be replaced by your fetch API call once the backend is ready)
        setTimeout(() => {
            setStatus('success');
            setSecondsLeft(RESEND_COOLDOWN_SECONDS);
        }, 800);
    }

    function handleResend() {
        if (secondsLeft > 0 || status === 'loading') return;
        setStatus('loading');
        setTimeout(() => {
            setStatus('success');
            setSecondsLeft(RESEND_COOLDOWN_SECONDS);
        }, 800);
    }

    return (
        <div className="w-full min-h-[70vh] flex items-center justify-center px-4 py-16 md:py-24">
            <div className="w-full max-w-[440px] bg-surface-cmd border border-divider-border/60 rounded-xl shadow-2xl p-6 md:p-8 flex flex-col gap-6">

                {/* En-tête */}
                <div className="flex flex-col gap-1">
                    <h1 className="font-headline text-2xl font-semibold text-white tracking-tight">
                        Reset password
                    </h1>
                    <p className="body-md">
                        Enter the email associated with your account and we’ll send you instructions to reset your password.
                    </p>
                </div>

                {/* Message d'erreur de validation ou service */}
                {errorMessage && (
                    <div
                        className="rounded-lg p-3 flex items-start gap-3 bg-[#0B0E15] border border-accent-amber/30"
                        role="alert"
                    >
            <span className="material-symbols-outlined text-accent-amber text-lg leading-none select-none">
              warning
            </span>
                        <p className="body-sm text-accent-amber">{errorMessage}</p>
                    </div>
                )}

                {/* État Succès : Email envoyé */}
                {status === 'success' ? (
                    <div className="flex flex-col gap-5">
                        <div className="p-4 rounded-lg bg-[#0B0E15] border border-primary/30 flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-xl leading-none select-none">
                mark_email_read
              </span>
                            <div className="flex flex-col gap-1">
                <span className="font-code text-xs uppercase tracking-wide text-primary font-semibold">
                  Check your inbox
                </span>
                                <p className="body-sm text-on-surface">
                                    If an account exists for <span className="text-white font-medium">{email}</span>, you will receive password reset instructions shortly.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={secondsLeft > 0}
                            className="btn-secondary w-full text-xs font-code uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {secondsLeft > 0 ? `Resend email in ${secondsLeft}s` : 'Resend reset link'}
                        </button>
                    </div>
                ) : (
                    /* Formulaire de saisie */
                    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
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
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#0B0E15] text-on-surface text-sm rounded-lg px-3 py-2.5 outline-none border border-transparent placeholder:text-on-surface-variant/60 focus:border-primary/50 focus:bg-black/40 transition-colors"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="btn-primary w-full mt-1 disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                            {status === 'loading' ? (
                                <span className="material-symbols-outlined text-lg animate-spin select-none">
                  progress_activity
                </span>
                            ) : (
                                <>
                                    Send reset link
                                    <span className="material-symbols-outlined text-lg select-none">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Pied de carte */}
                <div className="pt-3 flex items-center justify-between text-sm border-t border-divider-border/60">
                    <a
                        href="/login"
                        className="text-on-surface-variant hover:text-on-surface transition-colors hover:underline focus-visible flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-base select-none">arrow_back</span>
                        Back to log in
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