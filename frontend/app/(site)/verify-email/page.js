'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';

const RESEND_COOLDOWN_SECONDS = 45;

const STATES = [
  { id: 'inbox', label: '1: Inbox' },
  { id: 'cooldown', label: '2: Cooldown' },
  { id: 'verified', label: '3: Verified' },
  { id: 'expired', label: '4: Expired' },
];

const FOOTER_STATUS = {
  inbox: 'PENDING',
  cooldown: 'SENT',
  verified: 'VERIFIED',
  expired: 'EXPIRED',
};

function initialState(value) {
  return value === 'verified' || value === 'expired' ? value : 'inbox';
}

function StatusIcon({ name, className }) {
  return (
    <div className={`w-12 h-12 rounded flex items-center justify-center mb-4 ${className}`}>
      <span className="material-symbols-outlined text-2xl select-none">{name}</span>
    </div>
  );
}

function Eyebrow({ children, className }) {
  return (
    <span className={`font-code text-[10px] font-semibold uppercase tracking-[0.08em] mb-1 ${className}`}>
      {children}
    </span>
  );
}

function VerifyEmail() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || 'your email address';

  // No backend exists yet (see backend/README.md). The page starts from the
  // ?state= query (verified | expired), which is where the real verification
  // link will land, and "resending" only runs the cooldown locally.
  const [view, setView] = React.useState(() => initialState(searchParams.get('state')));
  const [sending, setSending] = React.useState(false);
  const [secondsLeft, setSecondsLeft] = React.useState(0);

  React.useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  function startCooldown() {
    setView('cooldown');
    setSecondsLeft(RESEND_COOLDOWN_SECONDS);
  }

  function handleResend() {
    if (sending || secondsLeft > 0) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      startCooldown();
    }, 700);
  }

  function switchView(id) {
    if (id === 'cooldown') {
      startCooldown();
    } else {
      setSecondsLeft(0);
      setView(id);
    }
  }

  const resendLabel = secondsLeft > 0 ? `Resend email in ${secondsLeft}s` : 'Resend verification email';

  return (
    <div className="w-full min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 md:py-24 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center" aria-hidden="true">
        <div className="w-[640px] h-[640px] rounded-full bg-gradient-to-tr from-primary/10 via-secondary/5 to-transparent blur-3xl opacity-40" />
      </div>

      <div
        role="group"
        aria-label="Verification state preview"
        className="relative z-10 w-full max-w-md mb-6 bg-[#0B0E15] p-1 rounded-lg flex items-center gap-1"
      >
        {STATES.map((state) => (
          <button
            key={state.id}
            type="button"
            aria-pressed={view === state.id}
            onClick={() => switchView(state.id)}
            className={`flex-1 py-1.5 px-1 sm:px-2 whitespace-nowrap rounded font-code text-[9px] sm:text-[10px] uppercase tracking-[0.08em] transition-colors focus-visible ${
              view === state.id
                ? 'bg-surface-course text-primary font-semibold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {state.label}
          </button>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md bg-surface-cmd border border-divider-border/60 rounded-xl shadow-2xl overflow-hidden">
        <div className="bg-[#10131A] px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-divider-border/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-divider-border/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-divider-border/70" />
            <span className="ml-2 font-code text-[13px] text-on-surface-variant">bashlab://auth/verify</span>
          </div>
          <div className="flex items-center gap-1 text-secondary font-code text-[10px] font-semibold uppercase tracking-[0.08em]">
            <span className="material-symbols-outlined text-sm select-none">terminal</span>
            <span>TTY_04</span>
          </div>
        </div>

        <div className="p-6 md:p-10 flex flex-col" aria-live="polite">
          {view === 'inbox' && (
            <section className="flex flex-col">
              <StatusIcon name="mark_email_unread" className="bg-surface-course text-secondary" />
              <Eyebrow className="text-secondary">01 // Verification_required</Eyebrow>
              <h1 className="font-headline text-2xl font-semibold text-white tracking-tight mb-1">
                Check your email
              </h1>
              <p className="body-md mb-4">We sent an activation link to verify your account:</p>

              <div className="bg-[#0B0E15] p-4 rounded-lg flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="material-symbols-outlined text-primary text-base select-none">alternate_email</span>
                  <span className="font-code text-[13px] text-on-surface font-medium truncate">{email}</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-code text-[10px] font-semibold uppercase tracking-[0.08em]">
                  Pending
                </span>
              </div>

              <div className="bg-[#10131A] p-4 rounded-lg mb-6 flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <span className="font-code text-[13px] text-secondary">01.</span>
                  <span className="text-xs leading-[18px] text-on-surface">Open the message and click the verification link.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-code text-[13px] text-secondary">02.</span>
                  <span className="text-xs leading-[18px] text-on-surface">Your account and sandbox will activate automatically.</span>
                </div>
                <div className="flex items-start gap-2 pt-1">
                  <span className="material-symbols-outlined text-accent-amber text-sm mt-0.5 select-none">info</span>
                  <span className="text-xs leading-[18px] text-on-surface-variant">
                    Can&apos;t find it? Check your spam, trash or promotions folders.
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={sending}
                  className="btn-secondary w-full uppercase text-xs tracking-wider disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className={`material-symbols-outlined text-base select-none ${sending ? 'animate-spin' : ''}`}>
                    {sending ? 'progress_activity' : 'outgoing_mail'}
                  </span>
                  {sending ? 'Sending…' : 'Resend verification email'}
                </button>
                <a
                  href="/login"
                  className="w-full py-2 text-center font-code text-xs text-on-surface-variant hover:text-on-surface transition-colors focus-visible"
                >
                  ← Back to log in
                </a>
              </div>
            </section>
          )}

          {view === 'cooldown' && (
            <section className="flex flex-col">
              <StatusIcon name="forward_to_inbox" className="bg-surface-course text-primary" />
              <Eyebrow className="text-primary">02 // Transmission_sent</Eyebrow>
              <h1 className="font-headline text-2xl font-semibold text-white tracking-tight mb-1">Email sent</h1>
              <p className="body-md mb-4">
                A new verification link is on its way to{' '}
                <span className="font-code text-[13px] text-on-surface">{email}</span>. Please wait before requesting
                another one.
              </p>

              <div className="bg-[#0B0E15] p-4 rounded-lg mb-6 flex flex-col items-center justify-center gap-1">
                <div className="flex items-center gap-1 text-on-surface-variant">
                  <span className={`material-symbols-outlined text-sm select-none ${secondsLeft > 0 ? 'animate-spin' : ''}`}>
                    sync
                  </span>
                  <span className="font-code text-[10px] font-semibold uppercase tracking-[0.08em]">
                    {secondsLeft > 0 ? 'Rate_limit_active' : 'Ready'}
                  </span>
                </div>
                <span className="font-code text-2xl text-primary font-bold" aria-label={`${secondsLeft} seconds left`}>
                  {secondsLeft}s
                </span>
                <span className="text-xs text-on-surface-variant">Cooldown between resend requests</span>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={sending || secondsLeft > 0}
                  className="btn-secondary w-full uppercase text-xs tracking-wider disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className={`material-symbols-outlined text-base select-none ${sending ? 'animate-spin' : ''}`}>
                    {sending ? 'progress_activity' : secondsLeft > 0 ? 'hourglass_empty' : 'outgoing_mail'}
                  </span>
                  {sending ? 'Sending…' : resendLabel}
                </button>
                <div className="flex items-center justify-between pt-1">
                  <a
                    href="/register"
                    className="font-code text-xs text-on-surface-variant hover:text-on-surface transition-colors focus-visible"
                  >
                    Wrong email address?
                  </a>
                  <a
                    href="/login"
                    className="font-code text-xs text-secondary hover:underline focus-visible"
                  >
                    Back to log in
                  </a>
                </div>
              </div>
            </section>
          )}

          {view === 'verified' && (
            <section className="flex flex-col">
              <StatusIcon name="verified" className="bg-primary/10 text-primary" />
              <Eyebrow className="text-primary">03 // Shell_authorized</Eyebrow>
              <h1 className="font-headline text-2xl font-semibold text-white tracking-tight mb-1">Email verified</h1>
              <p className="body-md mb-4">
                Your account is active. You can now start courses and open terminal sessions.
              </p>

              <div className="bg-[#0B0E15] p-4 rounded-lg mb-6 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-code text-[10px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
                    Account_status
                  </span>
                  <span className="font-code text-[13px] text-primary font-semibold">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-code text-[10px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
                    Default_shell
                  </span>
                  <span className="font-code text-[13px] text-secondary">/bin/bash</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <a href="/courses" className="btn-primary w-full !uppercase !text-xs !tracking-wider focus-visible">
                  Continue to courses
                  <span className="material-symbols-outlined text-base select-none">arrow_forward</span>
                </a>
                <a
                  href="/account"
                  className="w-full py-2 text-center font-code text-xs text-on-surface-variant hover:text-on-surface transition-colors focus-visible"
                >
                  Go to account settings
                </a>
              </div>
            </section>
          )}

          {view === 'expired' && (
            <section className="flex flex-col">
              <StatusIcon name="link_off" className="bg-[#93000a]/20 text-[#ffb4ab]" />
              <Eyebrow className="text-[#ffb4ab]">Err_token_expired</Eyebrow>
              <h1 className="font-headline text-2xl font-semibold text-white tracking-tight mb-1">
                Invalid or expired link
              </h1>
              <p className="body-md mb-4">
                This verification link has expired or was already used. Request a new one to finish activating your
                account.
              </p>

              <div className="bg-[#0B0E15] p-4 rounded-lg mb-6 flex flex-col gap-1 font-code text-[13px] text-on-surface-variant">
                <div className="flex items-center gap-2">
                  <span className="text-[#ffb4ab]">&gt;</span>
                  <span>VERIFY_SESSION: failed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#ffb4ab]">&gt;</span>
                  <span>TOKEN: expired_or_used</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-secondary">&gt;</span>
                  <span>ACTION: request_new_link()</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={sending}
                  className="btn-primary w-full !uppercase !text-xs !tracking-wider disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  <span className={`material-symbols-outlined text-base select-none ${sending ? 'animate-spin' : ''}`}>
                    {sending ? 'progress_activity' : 'refresh'}
                  </span>
                  {sending ? 'Sending…' : 'Request new verification link'}
                </button>
                <a href="/login" className="btn-secondary w-full uppercase text-xs tracking-wider focus-visible">
                  Back to log in
                </a>
              </div>
            </section>
          )}
        </div>

        <div className="bg-[#0B0E15] px-4 py-1.5 flex items-center justify-between">
          <span className="font-code text-[13px] text-on-surface-variant">auth // verify-email</span>
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-code text-[10px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
              {FOOTER_STATUS[view]}
            </span>
          </div>
        </div>
      </div>

      <p className="relative z-10 mt-6 flex items-center gap-1 text-xs text-on-surface-variant">
        <span className="material-symbols-outlined text-sm text-accent-amber select-none">dns</span>
        UI demo — email delivery is not connected yet, no message is actually sent.
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <React.Suspense fallback={null}>
      <VerifyEmail />
    </React.Suspense>
  );
}
