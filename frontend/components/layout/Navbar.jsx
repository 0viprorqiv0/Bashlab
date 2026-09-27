'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import BrandLogo from '../shared/BrandLogo';

export default function Navbar({ isTransparent = false }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: '/courses', label: 'Courses' },
    { href: '/account', label: 'Account' },
  ];

  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 px-6 lg:px-8 py-2.5 transition-all duration-200 ${
        isTransparent
          ? 'border-b border-[#26313d]/60 bg-[#111720]/35 backdrop-blur-md'
          : 'border-b border-[#26313d] bg-[#111720]/95 shadow-[0_8px_28px_rgba(0,0,0,0.3)] backdrop-blur-xl'
      }`}
      role="banner"
    >
      <div className="w-full max-w-[1340px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-7">
          <a href="/" className="flex items-center" aria-label="BashLab home">
            <BrandLogo />
          </a>

          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`font-code text-xs transition-colors focus-visible ${
                    isActive
                      ? 'text-primary font-semibold'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* User Avatar Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-white/5 transition-colors focus-visible border border-transparent hover:border-white/10"
              aria-expanded={userDropdownOpen}
              aria-haspopup="true"
              aria-label="User menu"
            >
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary/30 to-secondary/20 border border-primary/40 flex items-center justify-center font-code text-[11px] font-bold text-primary shadow-sm">
                AM
              </div>
              <span className="hidden sm:inline font-code text-xs text-on-surface-variant group-hover:text-white">
                Alex Morgan
              </span>
              <span className="material-symbols-outlined text-sm text-on-surface-variant select-none">
                {userDropdownOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#141820] border border-[#26313d] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-divider-border/60 mb-1">
                  <p className="font-headline text-xs font-semibold text-white">Alex Morgan</p>
                  <p className="font-code text-[11px] text-on-surface-variant truncate">alex.morgan@example.com</p>
                  <span className="inline-block mt-1 font-code text-[9px] uppercase tracking-wider text-primary bg-primary/10 border border-primary/30 px-1.5 py-0.5 rounded">
                    Learner
                  </span>
                </div>
                <a
                  href="/account"
                  onClick={() => setUserDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-code text-xs text-on-surface-variant hover:text-white hover:bg-white/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-base text-primary">manage_accounts</span>
                  Account & Security
                </a>
                <a
                  href="/courses"
                  onClick={() => setUserDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-code text-xs text-on-surface-variant hover:text-white hover:bg-white/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-base text-secondary">school</span>
                  My Courses
                </a>
                <div className="border-t border-divider-border/60 my-1"></div>
                <a
                  href="/login"
                  onClick={() => setUserDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-code text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-base">logout</span>
                  Log out
                </a>
              </div>
            )}
          </div>

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
        <div id="mobile-menu" className="md:hidden border-t border-[#343a43]/60 bg-[#0a0d14] px-6 py-4">
          <nav className="flex flex-col gap-4" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-code text-sm text-on-surface-variant hover:text-white transition-colors focus-visible py-2"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
              <a
                href="/account"
                className="text-sm font-code text-on-surface-variant hover:text-white flex items-center gap-2 py-2 focus-visible"
                onClick={() => setMobileOpen(false)}
              >
                <span className="material-symbols-outlined text-base text-primary">manage_accounts</span>
                Account & Security
              </a>
              <a
                href="/login"
                className="text-sm font-code text-red-400 hover:text-red-300 flex items-center gap-2 py-2 focus-visible"
                onClick={() => setMobileOpen(false)}
              >
                <span className="material-symbols-outlined text-base">logout</span>
                Log out
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

