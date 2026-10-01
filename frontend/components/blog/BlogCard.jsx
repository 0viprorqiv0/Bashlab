'use client';

import React from 'react';
import Link from 'next/link';

export default function BlogCard({ post, isFeatured = false }) {
  return (
    <article className="pb-8 mb-8 border-b border-slate-200 last:border-b-0 last:mb-0 last:pb-0">
      {/* 1. Metadata dòng đơn: YYYY-MM-DD • CATEGORY • Read Time */}
      <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-2.5 flex-wrap">
        {isFeatured && (
          <span className="bg-[#0F766E]/10 text-[#0F766E] px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase mr-1">
            FEATURED
          </span>
        )}
        <span>{post.publishedAt}</span>
        <span>•</span>
        <span className="text-[#0F766E] font-semibold tracking-wider uppercase">
          {post.category}
        </span>
        <span>•</span>
        <span>{post.readTime}</span>
      </div>

      {/* 2. Tiêu đề bài viết */}
      <Link href={`/blog/${post.slug}`} className="group inline-block">
        <h2 className="text-xl font-bold text-slate-900 mb-2.5 group-hover:text-[#0F766E] group-hover:underline transition-colors leading-snug cursor-pointer">
          {post.title}
        </h2>
      </Link>

      {/* 3. Đoạn tóm tắt (Abstract) */}
      <p className="text-sm text-slate-600 leading-relaxed mb-3 font-sans">
        {post.excerpt}
      </p>

      {/* 4. Tác giả */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-sans">
        <span className="font-medium text-slate-700">{post.author.name}</span>
        {post.author.role && (
          <>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400">{post.author.role}</span>
          </>
        )}
      </div>
    </article>
  );
}


