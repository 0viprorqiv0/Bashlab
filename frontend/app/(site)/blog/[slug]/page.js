'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BLOG_POSTS } from '@/data/blogData';
import BlogMarkdown from '@/components/blog/BlogMarkdown';
import BlogCard from '@/components/blog/BlogCard';
import BlogReadingPane from '@/components/blog/BlogReadingPane';
import styles from '@/components/blog/Blog.module.css';

export default function BlogDetailPage() {
  const params = useParams();
  const post = BLOG_POSTS.find((item) => item.slug === params?.slug);

  if (!post) {
    return (
      <div className={styles.blogPage}>
        <div className={styles.notFound}>
          <span className="material-symbols-outlined" aria-hidden="true">article</span>
          <h1>Article not found</h1>
          <p>The article you are looking for does not exist or has been moved.</p>
          <Link href="/blog" className={styles.actionButton}>Back to all articles</Link>
        </div>
      </div>
    );
  }

  const relatedPosts = [
    ...BLOG_POSTS.filter((item) => item.id !== post.id && (item.category === post.category || item.featured)),
    ...BLOG_POSTS.filter((item) => item.id !== post.id && item.category !== post.category && !item.featured),
  ].slice(0, 2);
  const sections = post.content.split('\n').flatMap((line, index) => line.startsWith('## ') ? [{ id: `section-${index + 1}`, title: line.slice(3).replace(/`/g, '') }] : []);

  return (
    <div className={styles.blogPage}>
      <header>
        <div className={styles.detailHeader}>
          <h1>{post.title}</h1>
          <p className={styles.detailExcerpt}>{post.excerpt}</p>
          <div className={styles.detailMeta}>
            <div className={styles.cardAuthor}>
              <img src={post.author.avatar} alt="" width={44} height={44} className={styles.authorAvatar} />
              <div><span className={styles.authorName}>{post.author.name}</span><span className={styles.authorRole}>{post.author.role}</span></div>
            </div>
            <div className={styles.publicationMeta}>
              <span className={styles.categoryLabel}>{post.category}</span>
              {post.featured && <span className={styles.featuredLabel}>Featured</span>}
              <time dateTime={post.publishedAt}>{post.publishedAt}</time>
              <span className={styles.metaReadTime}><span className="material-symbols-outlined" aria-hidden="true">schedule</span>{post.readTime}</span>
            </div>
          </div>
        </div>
      </header>

      <div className={styles.readingLayout}>
        <aside className={styles.contentsSidebar}>
          <nav className={styles.stickySidebar} aria-label="Table of contents">
            <Link href="/blog" className={styles.backLink}><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>All articles</Link>
            <h2 className={styles.sidebarHeading}>In this article</h2>
            <ul className={styles.contentsList}>
              {sections.map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}
            </ul>
            <Link href="/courses" className={styles.practiceLink}>Put it into practice<span className="material-symbols-outlined" aria-hidden="true">arrow_outward</span></Link>
          </nav>
        </aside>
        <div className={styles.readingColumn}>
          <BlogReadingPane key={post.slug}>
            <BlogMarkdown content={post.content} />
            <footer className={styles.articleFooter}>
              <div className={styles.tagList}>{post.tags.map((tag) => <Link key={tag} href={`/blog?q=${encodeURIComponent(tag)}`}>#{tag}</Link>)}</div>
              <Link href="/blog" className={styles.backLink}><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Back to all articles</Link>
            </footer>
          </BlogReadingPane>
          {relatedPosts.length > 0 && (
            <section className={styles.relatedSection} aria-label="Related articles">
              <div className={styles.sectionHeading}><h2>Keep exploring</h2><span className={styles.resultCount}>{String(relatedPosts.length).padStart(2, '0')} articles</span></div>
              <div className={styles.articleGrid}>{relatedPosts.map((related) => <BlogCard key={related.id} post={related} />)}</div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
