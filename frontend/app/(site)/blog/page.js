'use client';

import React, { useState, useMemo } from 'react';
import { BLOG_POSTS, BLOG_CATEGORIES } from '@/data/blogData';
import BlogHero from '@/components/blog/BlogHero';
import BlogCard from '@/components/blog/BlogCard';

export default function BlogListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Calculate post count per category
  const categoryCounts = useMemo(() => {
    const counts = { All: BLOG_POSTS.length };
    BLOG_POSTS.forEach((post) => {
      counts[post.category] = (counts[post.category] || 0) + 1;
    });
    return counts;
  }, []);

  const filteredPosts = useMemo(() => {
    return BLOG_POSTS.filter((post) => {
      const matchesCategory =
        selectedCategory === 'All' || post.category === selectedCategory;

      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query) ||
        post.category.toLowerCase().includes(query) ||
        post.tags.some((tag) => tag.toLowerCase().includes(query));

      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans">
      {/* Editorial Journal Header */}
      <BlogHero
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />


      {/* Main 2-Column Section */}
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row gap-12">
        {/* CỘT TRÁI: MỤC LỤC SIDEBAR (240px - 280px) */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="md:sticky md:top-24 text-sm">
            <p className="font-mono text-xs uppercase text-slate-500 mb-3 tracking-wider font-semibold border-b border-slate-200 pb-2">
              CATEGORIES
            </p>
            <ul className="space-y-1.5 text-slate-700">
              {BLOG_CATEGORIES.map((cat) => {
                const count = categoryCounts[cat] || 0;
                const isActive = selectedCategory === cat;
                return (
                  <li key={cat}>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left py-1.5 px-2.5 rounded transition-colors flex items-center justify-between text-xs font-mono ${
                        isActive
                          ? 'bg-[#0F766E]/10 text-[#0F766E] font-semibold border-l-2 border-[#0F766E]'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                      }`}
                    >
                      <span>{cat}</span>
                      <span className="text-slate-400 font-normal">({count})</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* CỘT PHẢI: LUỒNG BÀI VIẾT DẠNG EDITORIAL LIST */}
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-8">
            <h2 className="font-mono text-xs uppercase font-bold text-slate-700 tracking-wider">
              {selectedCategory === 'All' ? 'ALL ARTICLES' : `${selectedCategory.toUpperCase()} ARTICLES`}
            </h2>
            <span className="font-mono text-xs text-slate-500">
              [ {filteredPosts.length < 10 ? `0${filteredPosts.length}` : filteredPosts.length} ARTICLES ]
            </span>
          </div>

          {filteredPosts.length > 0 ? (
            <div>
              {filteredPosts.map((post) => (
                <BlogCard
                  key={post.id}
                  post={post}
                  isFeatured={post.featured && selectedCategory === 'All' && !searchQuery}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded border border-slate-200 p-8">
              <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">search_off</span>
              <h3 className="text-base font-semibold text-slate-800 mb-1">No articles found</h3>
              <p className="text-xs text-slate-500 mb-4">
                We couldn't find any articles matching "{searchQuery}".
              </p>
              <button
                type="button"
                className="px-3 py-1.5 bg-[#0F766E] text-white text-xs font-semibold rounded hover:bg-[#0D9488] transition-colors"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
              >
                Reset Filters
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}




