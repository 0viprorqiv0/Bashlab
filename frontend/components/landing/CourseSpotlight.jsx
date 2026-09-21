'use client';

import React from 'react';

export default function CourseSpotlight() {
  return (
    <section
      id="courses"
      className="relative bg-[#171C24] py-14 sm:py-16 border-t"
      style={{ borderColor: '#39434F' }}
      aria-labelledby="course-heading"
    >
      <div className="section-divider" style={{ backgroundColor: '#00FF66' }} aria-hidden="true" />

      <div className="container">
        <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 id="course-heading" className="heading-lg">
              Your next command starts in Shell 101.
            </h2>
          </div>
          <div className="hidden md:flex items-center gap-2 font-code text-xs font-semibold text-[#849581] tracking-widest uppercase pb-1">
            <span>PRACTICE</span>
            <span className="text-white/20">&gt;</span>
            <span>LEARN</span>
            <span className="text-white/20">&gt;</span>
            <span>BUILD</span>
            <span className="text-white/20">&gt;</span>
            <span>BELONG</span>
          </div>
        </div>

        {/* Bento Grid Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left Column: Hero Course Card (Col 1-6 lg) */}
          <div className="lg:col-span-6 rounded-xl bg-[#0D1017]/85 backdrop-blur-md border border-white/10 p-4 sm:p-5 flex flex-col justify-between gap-3 hover:border-primary/25 transition-all duration-200 h-full">
            {/* Top Meta */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-code text-[10px] font-bold px-2 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary shadow-[0_0_10px_rgba(0,255,102,0.2)]">
                  BEGINNER TRACK
                </span>
                <span className="inline-flex items-center gap-1 font-code text-xs text-[#849581]">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                  <span>12 LESSONS</span>
                </span>
                <span className="inline-flex items-center gap-1 font-code text-xs text-[#849581]">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span>Est. 2h</span>
                </span>
              </div>
              <div className="flex flex-col items-end font-code text-[8.5px] font-bold tracking-widest text-[#849581] leading-tight">
                <span>BASHLAB ///</span>
                <span className="text-primary">LEARN BY DOING</span>
              </div>
            </div>

            {/* Title & Pitch */}
            <div className="flex flex-col gap-1">
              <h3 className="font-headline font-bold text-xl sm:text-2xl text-white tracking-tight leading-snug">
                Shell 101 — Bash Basics
              </h3>
              <p className="text-xs sm:text-sm text-[#9BA3B5] leading-relaxed">
                Learn the shell by actually using it. Hands-on, practical, and built for real progress.
              </p>
            </div>

            {/* Simulated Terminal Preview */}
            <div className="rounded-lg overflow-hidden bg-[#06090E]/95 border border-white/10 shadow-inner">
              <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.025] border-b border-white/[0.05]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF5F56] opacity-80" />
                  <span className="w-2 h-2 rounded-full bg-[#FFBD2E] opacity-80" />
                  <span className="w-2 h-2 rounded-full bg-[#27C93F] opacity-80" />
                </div>
                <span className="font-code text-[10px] text-[#849581]">bashlab@sandbox:~</span>
                <span className="font-code text-[9px] text-white/30">bash</span>
              </div>
              <div className="p-3 font-code text-xs leading-normal flex flex-col gap-1 text-[#E8E9F0]">
                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold">$</span>
                  <span className="text-white font-medium">whoami</span>
                </div>
                <div className="text-secondary pl-4 text-[11px]">learner</div>

                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold">$</span>
                  <span className="text-white font-medium">pwd</span>
                </div>
                <div className="text-secondary pl-4 text-[11px]">/home/learner</div>

                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold">$</span>
                  <span className="text-white font-medium">ls -la</span>
                </div>
                <div className="text-[#849581] pl-4 text-[10px] leading-tight opacity-85">
                  <div>drwxr-xr-x 3 learner learner 4096 Oct 26 10:24 .</div>
                  <div>-rw-r--r-- 1 learner learner  220 Oct 26 10:24 .bashrc</div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold">$</span>
                  <span className="text-white font-medium">echo &quot;Ready to learn Bash! 🚀&quot;</span>
                </div>
                <div className="text-secondary pl-4 text-[11px]">Ready to learn Bash! 🚀</div>
              </div>
            </div>

            {/* Feature Chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 font-code text-[10.5px] text-[#E8E9F0] px-2.5 py-1 rounded bg-white/[0.03] border border-white/[0.08]">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                <span>Linux sandbox</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-code text-[10.5px] text-[#E8E9F0] px-2.5 py-1 rounded bg-white/[0.03] border border-white/[0.08]">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/></svg>
                <span>Free starter</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-code text-[10.5px] text-[#E8E9F0] px-2.5 py-1 rounded bg-white/[0.03] border border-white/[0.08]">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span>Beginner-friendly</span>
              </span>
            </div>

            {/* What You'll Learn & Matrix & CTA Button */}
            <div className="flex items-end justify-between gap-3 pt-1">
              <div className="flex flex-col gap-2.5 flex-1 min-w-0">
                <div className="flex flex-col gap-1.5">
                  <span className="font-code text-[9px] font-bold tracking-wider text-[#849581] uppercase">
                    WHAT YOU&apos;LL LEARN
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['filesystem', 'file ops', 'grep', 'pipes'].map((topic) => (
                      <span
                        key={topic}
                        className="inline-flex items-center gap-1 font-code text-[10px] text-[#E8E9F0] px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08]"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <a
                    href="/courses/shell-101"
                    className="btn-primary w-fit"
                  >
                    <span>Explore Shell 101</span>
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </a>
                </div>
              </div>

              <div className="flex flex-col items-end font-code text-[7.5px] font-bold tracking-widest text-[#849581] leading-tight opacity-75 flex-none pb-0.5">
                <span>SMALL</span>
                <span>COMMANDS</span>
                <span>BIG</span>
                <span>PROGRESS</span>
                <span className="text-primary text-[9px]">&gt;_</span>
              </div>
            </div>
          </div>

          {/* Right Column: Roadmap & 3 Stats Cards (Col 7-12 lg) */}
          <div className="lg:col-span-6 flex flex-col gap-3 justify-between h-full">
            {/* Course Roadmap Bento Card */}
            <div className="rounded-xl bg-[#0D1017]/85 backdrop-blur-md border border-white/10 p-4 sm:p-5 flex flex-col justify-between gap-3 flex-1">
              <div className="flex items-center justify-between pb-0.5">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FF66" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  <span className="font-code text-xs font-bold uppercase tracking-wider text-white">
                    COURSE ROADMAP
                  </span>
                </div>
                <span className="font-code text-[10px] text-[#849581]">3 MODULES · 12 LESSONS</span>
              </div>

              <div className="flex flex-col gap-2.5 flex-1 justify-between">
                {/* Module 01 */}
                <div className="rounded-lg bg-[#121822]/85 border border-white/[0.08] p-3 flex items-center gap-3 hover:border-secondary/40 transition-all duration-200">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-code text-xs font-bold bg-[#00E5FF]/10 text-secondary border border-[#00E5FF]/40 shadow-[0_0_10px_rgba(0,229,255,0.2)] flex-none">
                    01
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-headline text-xs font-bold text-white tracking-tight">Filesystem</h4>
                      <span className="font-code text-[9px] font-semibold text-[#849581]">4 LESSONS &gt;</span>
                    </div>
                    <p className="text-[11px] text-[#9BA3B5] leading-tight">Navigate, explore, and understand the Linux filesystem.</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {['pwd', 'ls -la', 'cd', 'tree'].map((cmd) => (
                        <span key={cmd} className="font-code text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-[#00E5FF]/10 text-secondary border border-[#00E5FF]/25">
                          {cmd}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Module 02 */}
                <div className="rounded-lg bg-[#121822]/85 border border-white/[0.08] p-3 flex items-center gap-3 hover:border-primary/40 transition-all duration-200">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-code text-xs font-bold bg-primary/10 text-primary border border-primary/40 shadow-[0_0_10px_rgba(0,255,102,0.2)] flex-none">
                    02
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-headline text-xs font-bold text-white tracking-tight">Directories &amp; Files</h4>
                      <span className="font-code text-[9px] font-semibold text-[#849581]">4 LESSONS &gt;</span>
                    </div>
                    <p className="text-[11px] text-[#9BA3B5] leading-tight">Create, move, copy, and manage files like a pro.</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {['mkdir', 'touch', 'cp', 'mv', 'rm'].map((cmd) => (
                        <span key={cmd} className="font-code text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/25">
                          {cmd}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Module 03 */}
                <div className="rounded-lg bg-[#121822]/85 border border-white/[0.08] p-3 flex items-center gap-3 hover:border-accent/40 transition-all duration-200">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-code text-xs font-bold bg-accent/10 text-accent border border-accent/40 shadow-[0_0_10px_rgba(245,158,11,0.2)] flex-none">
                    03
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-headline text-xs font-bold text-white tracking-tight">Search &amp; Pipes</h4>
                      <span className="font-code text-[9px] font-semibold text-[#849581]">4 LESSONS &gt;</span>
                    </div>
                    <p className="text-[11px] text-[#9BA3B5] leading-tight">Find what you need and chain commands together.</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {['cat', 'grep', '|', '>', '>>'].map((cmd) => (
                        <span key={cmd} className="font-code text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/25">
                          {cmd}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 3-Column Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Stat 1: Zero Setup */}
              <div className="rounded-xl bg-[#0D1017]/85 backdrop-blur-md border border-white/10 p-3.5 flex flex-col justify-between gap-2 hover:border-secondary/30 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-code text-[9px] font-bold text-[#849581] uppercase">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#00E5FF" stroke="#00E5FF"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    <span>ZERO SETUP</span>
                  </div>
                  <span className="material-symbols-outlined text-[#849581]/70 text-xs">terminal</span>
                </div>
                <div className="font-headline font-bold text-2xl text-secondary leading-none">
                  &lt; 50ms
                </div>
                <p className="text-[10px] text-[#9BA3B5] leading-tight">Browser sandbox ready. No WSL / VM required.</p>
              </div>

              {/* Stat 2: Auto Graded */}
              <div className="rounded-xl bg-[#0D1017]/85 backdrop-blur-md border border-white/10 p-3.5 flex flex-col justify-between gap-2 hover:border-primary/30 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-code text-[9px] font-bold text-[#849581] uppercase">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#00FF66" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <span>AUTO GRADED</span>
                  </div>
                  <span className="material-symbols-outlined text-[#849581]/70 text-xs">analytics</span>
                </div>
                <div className="font-code font-bold text-lg text-primary leading-none">
                  [PASS ✓]
                </div>
                <div className="flex items-center gap-1.5 font-code text-[9.5px] font-semibold text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_#00FF66]" />
                  <span>12/12 checks</span>
                </div>
                <p className="text-[10px] text-[#9BA3B5] leading-tight">stdout + syntax validation.</p>
              </div>

              {/* Stat 3: Skills Unlocked */}
              <div className="rounded-xl bg-[#0D1017]/85 backdrop-blur-md border border-white/10 p-3.5 flex flex-col justify-between gap-1.5 hover:border-primary/30 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-code text-[9px] font-bold text-[#849581] uppercase">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00FF66" strokeWidth="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                    <span>SKILLS UNLOCKED</span>
                  </div>
                  <span className="material-symbols-outlined text-[#849581]/70 text-xs">lock</span>
                </div>
                <div className="flex flex-col gap-1 my-0.5">
                  {['Linux fundamentals', 'Command line fluency', 'Text processing', 'Real-world workflow'].map((skill) => (
                    <span key={skill} className="font-code text-[8.5px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5 w-fit">
                      {skill}
                    </span>
                  ))}
                </div>
                <p className="font-code text-[7.5px] font-semibold text-[#849581] uppercase tracking-wider">
                  SAME TOOLS. BRIGHTER OPPORTUNITIES.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}