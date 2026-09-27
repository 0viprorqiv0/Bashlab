'use client';

import React from 'react';
import BrandLogo from '../shared/BrandLogo';

export default function Navbar({ isTransparent = false }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const navLinks = [
    { href: '/courses', label: 'Courses' },
  ];

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
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-code text-xs text-on-surface-variant hover:text-white transition-colors focus-visible"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/login"
            className="hidden sm:inline-flex text-xs font-code text-on-surface-variant hover:text-white px-3 py-1.5 transition-colors focus-visible"
          >
            Log in
          </a>
          <a
            href="/register"
            className="btn-primary !py-1.5 !px-3.5 !text-xs !gap-1.5 hidden sm:inline-flex shadow-none"
          >
            Start learning
          </a>

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
                href="/login"
                className="text-sm font-code text-on-surface-variant hover:text-white text-center py-2 focus-visible"
                onClick={() => setMobileOpen(false)}
              >
                Log in
              </a>
              <a
                href="/register"
                className="btn-primary text-center"
                onClick={() => setMobileOpen(false)}
              >
                Start learning
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
