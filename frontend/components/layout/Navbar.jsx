'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import BrandLogo from '../shared/BrandLogo';
import { authClient } from '@/lib/authClient';
import { useAuth } from '@/components/auth/AuthProvider';

function getInitials(nameOrEmail) {
  if (!nameOrEmail) return 'U';
  const parts = nameOrEmail.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Navbar({ isTransparent = false }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`);
  const dropdownRef = React.useRef(null);
  const auth = useAuth();
  const authReady = !auth.loading;
  const displayName = auth.profile?.name || auth.user?.email;
  const user = auth.user ? {
    name: displayName,
    email: auth.user.email,
    initials: getInitials(displayName),
    role: auth.isAdmin ? 'Admin' : 'Learner',
  } : null;

  const navLinks = [
    { href: '/courses', label: 'Courses' },
    { href: '/subscription', label: 'Pricing' },
    { href: '/blog', label: 'Blog' },
  ];

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    setUserDropdownOpen(false);
    setMobileOpen(false);
    await authClient.logout();
    router.push('/login');
  }

  return (
    <header
      style={{ height: '64px', zIndex: 1000 }}
      className="fixed top-0 left-0 w-full z-50 px-6 lg:px-8 flex items-center transition-all duration-200 border-b border-[#26313d] bg-[#111720]/95 backdrop-blur-md shadow-[0_8px_28px_rgba(0,0,0,0.3)]"
      role="banner"
    >
      <div className="w-full max-w-[1340px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-7">
          <Link href="/" className="flex items-center" aria-label="BashLab home">
            <BrandLogo />
          </Link>

          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={`font-code text-xs transition-colors focus-visible ${
                  isActive(link.href) ? 'text-primary' : 'text-on-surface-variant hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {!authReady ? null : user ? (
            <div className="relative hidden sm:flex items-center gap-2" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/5 transition-colors focus-visible border border-transparent hover:border-white/10 max-w-[190px] md:max-w-[240px] lg:max-w-[280px]"
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
                aria-label="User menu"
              >
                <span className="w-7 h-7 rounded-md bg-gradient-to-br from-primary/30 to-secondary/20 border border-primary/40 flex items-center justify-center font-code text-[11px] font-bold text-primary shadow-sm flex-shrink-0">
                  {user.initials}
                </span>
                <span className="hidden sm:inline font-code text-xs text-on-surface-variant truncate text-left" title={user.name}>
                  {user.name}
                </span>
                <span className="material-symbols-outlined text-sm text-on-surface-variant select-none flex-shrink-0">
                  {userDropdownOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-[#141820] border border-[#26313d] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-divider-border/60 mb-1 min-w-0">
                    <p className="font-headline text-xs font-semibold text-white truncate" title={user.name}>
                      {user.name}
                    </p>
                    {auth.profile?.name && auth.profile?.name !== user.email && (
                      <p className="font-code text-[11px] text-on-surface-variant truncate mt-0.5" title={user.email}>
                        {user.email}
                      </p>
                    )}
                    <span className="inline-block mt-1.5 font-code text-[9px] uppercase tracking-wider text-primary bg-primary/10 border border-primary/30 px-1.5 py-0.5 rounded">
                      {user.role}
                    </span>
                  </div>
                  <Link href="/account" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-code text-xs text-on-surface-variant hover:text-white hover:bg-white/5 transition-colors">
                    <span className="material-symbols-outlined text-base text-primary">manage_accounts</span>
                    Account &amp; Security
                  </Link>
                  <Link href="/my-learning" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-code text-xs text-on-surface-variant hover:text-white hover:bg-white/5 transition-colors">
                    <span className="material-symbols-outlined text-base text-secondary">school</span>
                    My Learning
                  </Link>
                  {user.role === 'Admin' && (
                    <Link href="/admin/content" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-code text-xs text-on-surface-variant hover:text-white hover:bg-white/5 transition-colors">
                      <span className="material-symbols-outlined text-base text-accent-amber">admin_panel_settings</span>
                      Admin panel
                    </Link>
                  )}
                  <div className="border-t border-divider-border/60 my-1" />
                  <button type="button" onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-code text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                    <span className="material-symbols-outlined text-base">logout</span>
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline-flex text-xs font-code text-on-surface-variant hover:text-white px-3 py-1.5 transition-colors focus-visible">Log in</Link>
              <Link href="/register" className="btn-primary !py-1.5 !px-3.5 !text-xs !gap-1.5 !hidden sm:!inline-flex shadow-none">Sign up</Link>
            </>
          )}

          <button
            className="md:hidden p-1.5 text-on-surface-variant hover:text-white transition-colors focus-visible rounded"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <span className="material-symbols-outlined text-lg">
              {mobileOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          id="mobile-menu"
          className="absolute top-[64px] left-0 w-full md:hidden border-b border-[#343a43]/60 bg-[#0a0d14]/98 backdrop-blur-xl px-6 py-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <nav className="flex flex-col gap-4" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={`font-code text-sm transition-colors focus-visible py-2 ${
                  isActive(link.href) ? 'text-primary' : 'text-on-surface-variant hover:text-white'
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
              {!authReady ? null : user ? (
                <>
                  <div className="flex items-center gap-2.5 px-1 py-1 mb-1 border-b border-white/10 pb-3 min-w-0">
                    <span className="w-8 h-8 rounded-md bg-gradient-to-br from-primary/30 to-secondary/20 border border-primary/40 flex items-center justify-center font-code text-xs font-bold text-primary shadow-sm flex-shrink-0">
                      {user.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-headline text-xs font-semibold text-white truncate" title={user.name}>{user.name}</p>
                      {auth.profile?.name && auth.profile?.name !== user.email && (
                        <p className="font-code text-[11px] text-on-surface-variant truncate" title={user.email}>{user.email}</p>
                      )}
                      <span className="inline-block mt-1 font-code text-[9px] uppercase tracking-wider text-primary bg-primary/10 border border-primary/30 px-1.5 py-0.5 rounded">
                        {user.role}
                      </span>
                    </div>
                  </div>
                  <Link href="/my-learning" className="text-sm font-code text-on-surface-variant hover:text-white flex items-center gap-2 py-2 focus-visible" onClick={() => setMobileOpen(false)}>
                    <span className="material-symbols-outlined text-base text-secondary">school</span>
                    My Learning
                  </Link>
                  <Link href="/account" className="text-sm font-code text-on-surface-variant hover:text-white flex items-center gap-2 py-2 focus-visible" onClick={() => setMobileOpen(false)}>
                    <span className="material-symbols-outlined text-base text-primary">manage_accounts</span>
                    Account &amp; Security
                  </Link>
                  {user.role === 'Admin' && (
                    <>
                      <Link href="/admin/activity" className="text-sm font-code text-on-surface-variant hover:text-white flex items-center gap-2 py-2 focus-visible" onClick={() => setMobileOpen(false)}>
                        <span className="material-symbols-outlined text-base text-teal-400">monitoring</span>
                        System Dashboard
                      </Link>
                      <Link href="/admin/content" className="text-sm font-code text-on-surface-variant hover:text-white flex items-center gap-2 py-2 focus-visible" onClick={() => setMobileOpen(false)}>
                        <span className="material-symbols-outlined text-base text-accent-amber">admin_panel_settings</span>
                        Admin
                      </Link>
                    </>
                  )}
                  <button type="button" onClick={handleLogout} className="text-sm font-code text-red-400 hover:text-red-300 flex items-center gap-2 py-2 focus-visible text-left">
                    <span className="material-symbols-outlined text-base">logout</span>
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-sm font-code text-on-surface-variant hover:text-white text-center py-2 focus-visible" onClick={() => setMobileOpen(false)}>Log in</Link>
                  <Link href="/register" className="btn-primary text-center" onClick={() => setMobileOpen(false)}>
                    Sign up
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
