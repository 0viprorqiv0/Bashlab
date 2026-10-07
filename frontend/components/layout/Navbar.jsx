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
  const rawName = auth.profile?.name || auth.user?.email?.split('@')[0] || 'User';
  const cleanName = rawName.split('.')[0] || 'User';
  const displayName = auth.profile?.name || cleanName;
  const user = auth.user ? {
    name: displayName,
    cleanName,
    email: auth.user.email,
    initials: getInitials(displayName),
    role: auth.isAdmin ? 'Admin' : 'Learner',
    isAdmin: auth.isAdmin,
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
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
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
      className="fixed top-0 left-0 w-full z-50 px-6 lg:px-8 flex items-center transition-all duration-200 border-b border-white/[0.08] bg-[#0A0D14]/95 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
      role="banner"
    >
      <div className="w-full max-w-[1340px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center" aria-label="BashLab home">
            <BrandLogo />
          </Link>

          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={`font-body text-[13px] font-medium transition-colors focus-visible ${
                  isActive(link.href) ? 'text-primary font-semibold' : 'text-[#9BA3B5] hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {!authReady ? null : user ? (
            <div className="relative hidden sm:flex items-center" ref={dropdownRef}>
              {/* Sleek User Profile Capsule (Synchronized with Admin title bar) */}
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="inline-flex items-center gap-2.5 py-1 px-3 pl-1 bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-white/20 rounded-full transition-all cursor-pointer focus-visible select-none"
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
                aria-label="User menu"
              >
                <span className="w-[28px] h-[28px] rounded-full flex items-center justify-center font-headline text-[11px] font-bold text-primary bg-[#052e16] border border-primary/40 flex-shrink-0">
                  {user.initials}
                </span>
                <span className="font-body text-[12.5px] font-medium text-white max-w-[130px] truncate" title={user.name}>
                  {user.cleanName}
                </span>
                <span className={`text-[9.5px] font-code font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                  user.isAdmin ? 'border-primary/40 bg-primary/10 text-primary' : 'border-white/10 bg-white/[0.05] text-[#9BA3B5]'
                }`}>
                  {user.role}
                </span>
                <span className="material-symbols-outlined text-[15px] text-[#777] select-none flex-shrink-0">
                  {userDropdownOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-[#141414] border border-white/10 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-3 p-3 border-b border-white/[0.08] mb-1 min-w-0">
                    <span className="w-[32px] h-[32px] rounded-full flex items-center justify-center font-headline text-[12px] font-bold text-primary bg-[#052e16] border border-primary/40 flex-shrink-0">
                      {user.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-headline text-[13px] font-semibold text-white truncate" title={user.name}>
                        {user.name}
                      </p>
                      <p className="font-code text-[11px] text-primary mt-0.5">
                        {user.role}
                      </p>
                    </div>
                  </div>

                  {user.isAdmin && (
                    <Link
                      href="/admin/content"
                      onClick={() => setUserDropdownOpen(false)}
                      className="group flex items-center gap-2.5 px-3 py-2 rounded-lg font-body text-[12.5px] text-[#9BA3B5] hover:text-white transition-colors"
                    >
                      <span className="material-symbols-outlined text-base text-accent-amber group-hover:brightness-125 transition-all">admin_panel_settings</span>
                      Admin panel
                    </Link>
                  )}

                  <Link
                    href="/my-learning"
                    onClick={() => setUserDropdownOpen(false)}
                    className="group flex items-center gap-2.5 px-3 py-2 rounded-lg font-body text-[12.5px] text-[#9BA3B5] hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-base text-primary group-hover:brightness-125 transition-all">school</span>
                    My Learning
                  </Link>

                  <Link
                    href="/account"
                    onClick={() => setUserDropdownOpen(false)}
                    className="group flex items-center gap-2.5 px-3 py-2 rounded-lg font-body text-[12.5px] text-[#9BA3B5] hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-base text-[#9BA3B5] group-hover:text-white transition-colors">manage_accounts</span>
                    Account &amp; Security
                  </Link>

                  <div className="border-t border-white/[0.08] my-1" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-body text-[12.5px] text-red-400/80 hover:text-red-400 transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-base text-red-400/80 group-hover:text-red-400 transition-colors">logout</span>
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline-flex text-[13px] font-body font-medium text-[#9BA3B5] hover:text-white px-3 py-1.5 transition-colors focus-visible">Log in</Link>
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
          className="absolute top-[64px] left-0 w-full md:hidden border-b border-white/[0.08] bg-[#0a0d14]/98 backdrop-blur-xl px-6 py-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <nav className="flex flex-col gap-3" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={`font-body text-sm font-medium transition-colors focus-visible py-2 ${
                  isActive(link.href) ? 'text-primary' : 'text-[#9BA3B5] hover:text-white'
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-3 border-t border-white/10">
              {!authReady ? null : user ? (
                <>
                  <div className="flex items-center gap-2.5 px-1 py-1 mb-1 border-b border-white/10 pb-3 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-[#052e16] border border-primary/40 flex items-center justify-center font-headline text-xs font-bold text-primary shadow-sm flex-shrink-0">
                      {user.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-headline text-xs font-semibold text-white truncate" title={user.name}>{user.name}</p>
                      <span className="inline-block mt-1 font-code text-[9px] uppercase tracking-wider text-primary bg-primary/10 border border-primary/30 px-1.5 py-0.5 rounded-full">
                        {user.role}
                      </span>
                    </div>
                  </div>
                  {user.isAdmin && (
                    <Link href="/admin/content" className="text-sm font-body text-[#cbd5e1] hover:text-white flex items-center gap-2 py-2 focus-visible" onClick={() => setMobileOpen(false)}>
                      <span className="material-symbols-outlined text-base text-accent-amber">admin_panel_settings</span>
                      Admin panel
                    </Link>
                  )}
                  <Link href="/my-learning" className="text-sm font-body text-[#cbd5e1] hover:text-white flex items-center gap-2 py-2 focus-visible" onClick={() => setMobileOpen(false)}>
                    <span className="material-symbols-outlined text-base text-primary">school</span>
                    My Learning
                  </Link>
                  <Link href="/account" className="text-sm font-body text-[#cbd5e1] hover:text-white flex items-center gap-2 py-2 focus-visible" onClick={() => setMobileOpen(false)}>
                    <span className="material-symbols-outlined text-base text-[#9BA3B5]">manage_accounts</span>
                    Account &amp; Security
                  </Link>
                  <button type="button" onClick={handleLogout} className="text-sm font-body text-red-400 hover:text-red-300 flex items-center gap-2 py-2 focus-visible text-left">
                    <span className="material-symbols-outlined text-base">logout</span>
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-sm font-body text-[#9BA3B5] hover:text-white text-center py-2 focus-visible" onClick={() => setMobileOpen(false)}>Log in</Link>
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
