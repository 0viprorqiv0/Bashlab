'use client';

import React from 'react';
import BrandLogo from './BrandLogo';

export default function Footer({ className = '' }) {
  const footerLinks = [
    { href: '/courses', label: 'Courses' },
    { href: '/#how-it-works', label: 'How it works' },
    { href: '/#faq', label: 'FAQ' },
  ];

  const handleEasterEggClick = (e) => {
    e.preventDefault();
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.removeItem('bashlab:unveil_secret');
    } catch {}

    if (window.location.pathname === '/' || window.location.pathname === '') {
      window.dispatchEvent(new CustomEvent('bashlab:activate_secret_quote'));
    } else {
      window.location.href = '/';
    }
  };

  return (
    <footer
      className={`w-full border-t border-[#343a43]/60 bg-[#0a0d14] px-8 py-6 ${className}`.trim()}
      role="contentinfo"
    >
      <div className="w-full max-w-[1340px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BrandLogo iconOnly />
          <span className="text-[#667568]">—</span>
          <span
            role="button"
            tabIndex={0}
            onClick={handleEasterEggClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleEasterEggClick(e);
              }
            }}
            title="Learn Bash by doing."
            className="text-sm text-[#a0ada2] cursor-pointer hover:text-[#00ff66] transition-colors select-none"
          >
            Learn Bash by doing.
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-4 md:gap-6" aria-label="Footer navigation">
          {footerLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-[#b9cab5] hover:text-[#00ff66] transition-colors focus-visible"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="text-sm text-[#667568]">
          © 2026 BashLab. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
