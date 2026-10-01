'use client';

import React from 'react';

export default function BlogHero({
  searchQuery,
  setSearchQuery
}) {
  return (
    <section className="bg-gradient-to-b from-[#111720] to-[#0A0D14] border-b border-white/10 pt-24 pb-10 text-center px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-2.5">
          Linux &amp; Shell Engineering Journal
        </h1>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed mb-6 font-sans max-w-xl mx-auto">
          Technical papers, system administration guides, and practical command line research.
        </p>

        <div className="relative max-w-md mx-auto">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none select-none">
            search
          </span>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/15 rounded-lg text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0F766E] focus:bg-white/10 focus:ring-1 focus:ring-[#0F766E] transition-all font-sans shadow-inner"
            placeholder="Search papers by title, command, tag or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
    </section>
  );
}




