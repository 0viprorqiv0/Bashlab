'use client';

import React from 'react';

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative bg-[#0A0D14] pt-20 pb-20 sm:pt-24 sm:pb-24 overflow-hidden"
      aria-labelledby="hero-heading"
    >
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[620px] pointer-events-none -z-10"
        style={{
          background: 'radial-gradient(circle at 50% 30%, rgba(0, 255, 102, 0.08) 0%, rgba(0, 229, 255, 0.03) 40%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div className="container text-center flex flex-col items-center">
        <h1
          id="hero-heading"
          className="font-headline font-bold text-4xl sm:text-6xl md:text-[64px] leading-[1.08] tracking-tight text-white mb-6 max-w-[860px]"
        >
          Every command starts<br />
          with <span className="text-primary">curiosity</span>.
        </h1>

        <p className="font-body text-base sm:text-lg text-on-surface-variant max-w-[600px] leading-relaxed mb-10 text-center">
          Learn Bash one small step at a time. Try a command, understand what it does, and build confidence through guided practice.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
          <a
            href="/courses"
            className="btn-primary"
          >
            <span>Start learning</span>
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </a>
          <a
            href="#first-command"
            className="btn-secondary"
          >
            <span>Try your first command</span>
            <span className="material-symbols-outlined text-base">arrow_downward</span>
          </a>
        </div>

        <div className="pt-2">
          <p className="font-code text-xs sm:text-sm text-outline flex items-center justify-center gap-2 tracking-wide">
            <span className="text-primary font-semibold">$ pwd</span>
            <span>— Start with a simple question: where am I?</span>
          </p>
        </div>
      </div>
    </section>
  );
}