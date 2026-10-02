'use client';

import Link from 'next/link';
import styles from './Blog.module.css';

export default function BlogCard({ post, isFeatured = false }) {
  return (
    <article className={`${styles.articleCard} ${isFeatured ? styles.featuredCard : ''}`}>
      <div className={styles.cardMeta}>
        <span className={styles.categoryLabel}>{post.category}</span>
        {isFeatured && <span className={styles.featuredLabel}>Featured</span>}
        <span className={styles.readTime}>{post.readTime}</span>
      </div>
      <Link href={`/blog/${post.slug}`} className={styles.cardTitle}>
        <h3>{post.title}</h3>
        <span className="material-symbols-outlined" aria-hidden="true">arrow_outward</span>
      </Link>
      <p className={styles.cardExcerpt}>{post.excerpt}</p>
      <div className={styles.cardFooter}>
        <div className={styles.cardAuthor}>
          <span className={styles.authorInitials} aria-hidden="true">{post.author.name.split(' ').map((part) => part[0]).join('')}</span>
          <span>{post.author.name}</span>
        </div>
        <time dateTime={post.publishedAt}>{post.publishedAt}</time>
      </div>
    </article>
  );
}
