'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BLOG_POSTS } from '@/data/blogData';
import BlogMarkdown from '@/components/blog/BlogMarkdown';

export default function BlogDetailPage() {
  const params = useParams();
  const slug = params?.slug;

  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans">
        <div className="bg-gradient-to-b from-[#111720] to-[#0A0D14] border-b border-white/10 pt-28 pb-20 text-center px-4">
          <span className="material-symbols-outlined text-6xl text-slate-500 mb-3 block">article</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            Article Not Found
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6 font-sans">
            The blog article you are looking for does not exist or has been moved.
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F766E] hover:bg-[#0D9488] text-white text-xs font-mono font-semibold rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  const relatedPosts = BLOG_POSTS.filter(
    (p) => p.id !== post.id && (p.category === post.category || p.featured)
  ).slice(0, 2);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans">
      {/* Top Header / Hero Section (Dark theme harmonized with navbar & outer blog hero) */}
      <header className="bg-gradient-to-b from-[#111720] to-[#0A0D14] border-b border-white/10 pt-24 pb-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-6 flex-wrap">
            <Link href="/" className="hover:text-[#68DFA0] transition-colors">Home</Link>
            <span className="text-slate-600">/</span>
            <Link href="/blog" className="hover:text-[#68DFA0] transition-colors">Blog</Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400 hover:text-slate-200 transition-colors">
              {post.category}
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300 truncate max-w-[240px] sm:max-w-xs">{post.title}</span>
          </nav>

          {/* Badges */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="inline-flex items-center px-2.5 py-1 rounded bg-[#0F766E]/20 text-[#2DD4BF] border border-[#0F766E]/40 font-mono text-xs font-semibold uppercase tracking-wider">
              {post.category}
            </span>
            {post.featured && (
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono text-[10px] font-semibold uppercase tracking-wider">
                FEATURED
              </span>
            )}
          </div>

          {/* Article Title */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4 font-sans">
            {post.title}
          </h1>

          {/* Abstract / Excerpt */}
          {post.excerpt && (
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans mb-8">
              {post.excerpt}
            </p>
          )}

          {/* Author & Publication Meta Bar */}
          <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-400">
            {/* Author Info */}
            <div className="flex items-center gap-3">
              <img
                src={post.author.avatar}
                alt={post.author.name}
                className="w-10 h-10 rounded-full border-2 border-[#0F766E]/60 object-cover"
              />
              <div>
                <h4 className="font-sans text-sm font-semibold text-white">
                  {post.author.name}
                </h4>
                {post.author.role && (
                  <p className="font-sans text-xs text-slate-400">
                    {post.author.role}
                  </p>
                )}
              </div>
            </div>

            {/* Publishing Stats */}
            <div className="flex items-center gap-3 text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-slate-400">calendar_today</span>
                <span>{post.publishedAt}</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-slate-400">schedule</span>
                <span>{post.readTime}</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Article Reading Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <article className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 md:p-12 shadow-sm">
          {/* Markdown Content */}
          <BlogMarkdown content={post.content} />

          {/* Article Footer & Tags */}
          <div className="mt-10 pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider">
                TAGS:
              </span>
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="font-mono text-xs bg-slate-100 hover:bg-[#0F766E]/10 hover:text-[#0F766E] text-slate-600 px-2.5 py-1 rounded border border-slate-200 transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#0F766E] hover:text-[#0D9488] px-3.5 py-2 rounded-lg border border-[#0F766E]/30 bg-teal-50/50 hover:bg-teal-50 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to all articles
            </Link>
          </div>
        </article>

        {/* Related Articles Section */}
        {relatedPosts.length > 0 && (
          <section className="mt-14" aria-label="Related Articles">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6">
              <h3 className="font-mono text-xs uppercase font-bold text-slate-700 tracking-wider">
                RELATED PAPERS &amp; GUIDES
              </h3>
              <span className="font-mono text-xs text-slate-500">
                [ 0{relatedPosts.length} ARTICLES ]
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {relatedPosts.map((relPost) => (
                <Link
                  key={relPost.id}
                  href={`/blog/${relPost.slug}`}
                  className="bg-white border border-slate-200 rounded-xl p-5 hover:border-[#0F766E] hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div>
                    {/* Meta */}
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-2">
                      <span className="text-[#0F766E] font-semibold tracking-wider uppercase">
                        {relPost.category}
                      </span>
                      <span>•</span>
                      <span>{relPost.readTime}</span>
                    </div>

                    {/* Title */}
                    <h4 className="text-base font-bold text-slate-900 group-hover:text-[#0F766E] group-hover:underline transition-colors leading-snug mb-2 font-sans">
                      {relPost.title}
                    </h4>

                    {/* Excerpt */}
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans line-clamp-2">
                      {relPost.excerpt}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-slate-500 font-sans pt-3 mt-4 border-t border-slate-100">
                    <span className="font-medium text-slate-700">{relPost.author.name}</span>
                    <span className="text-[#0F766E] font-mono text-xs font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Read paper <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
