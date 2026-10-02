'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { BLOG_POSTS, BLOG_CATEGORIES } from '@/data/blogData';
import BlogHero from '@/components/blog/BlogHero';
import BlogCard from '@/components/blog/BlogCard';
import styles from '@/components/blog/Blog.module.css';

export default function BlogListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    setSearchQuery(new URLSearchParams(window.location.search).get('q') || '');
  }, []);

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
    <div className={`${styles.blogPage} ${styles.listPage}`}>
      {/* Editorial Journal Header */}
      <BlogHero searchQuery={searchQuery} setSearchQuery={setSearchQuery} />


      {/* Main 2-Column Section */}
      <div className={styles.journalLayout}>
        {/* CỘT TRÁI: MỤC LỤC SIDEBAR (240px - 280px) */}
        <aside className={styles.sidebar}>
          <div className={styles.stickySidebar}>
            <div className={styles.sectionHeading}>
              <h2>Explore topics</h2>
            </div>
            <ul className={styles.categoryList}>
              {BLOG_CATEGORIES.map((cat) => {
                const count = categoryCounts[cat] || 0;
                const isActive = selectedCategory === cat;
                return (
                  <li key={cat}>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      aria-pressed={isActive}
                      className={`${styles.categoryButton} ${isActive ? styles.categoryActive : ''}`}
                    >
                      <span>{cat === 'All' ? 'All articles' : cat}</span>
                      <span className={styles.categoryCount}>{String(count).padStart(2, '0')}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* CỘT PHẢI: LUỒNG BÀI VIẾT DẠNG EDITORIAL LIST */}
        <section
          role="region"
          aria-label="Article list"
          className={styles.articleSection}
        >
          <div className={styles.sectionHeading}>
            <h2>
              {selectedCategory === 'All' ? 'Latest articles' : selectedCategory}
            </h2>
            <span className={styles.resultCount} role="status" aria-live="polite">
              {String(filteredPosts.length).padStart(2, '0')} articles
            </span>
          </div>

          {filteredPosts.length > 0 ? (
            <div className={styles.articleGrid}>
              {filteredPosts.map((post) => (
                <BlogCard
                  key={post.id}
                  post={post}
                  isFeatured={post.featured && selectedCategory === 'All' && !searchQuery}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">search_off</span>
              <h3>No articles found</h3>
              <p>
                {searchQuery ? `No results for “${searchQuery}” in ${selectedCategory === 'All' ? 'all topics' : selectedCategory}.` : `No articles in ${selectedCategory}.`} Try another topic or reset the filters.
              </p>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
              >
                Reset Filters
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}




