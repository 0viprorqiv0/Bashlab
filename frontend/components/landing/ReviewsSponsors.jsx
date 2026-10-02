'use client';

import React from 'react';
import styles from './ReviewsSponsors.module.css';

const SPONSORS = [
  {
    name: 'GitHub',
    url: 'https://github.com',
    brandColor: '#a371f7',
    icon: (
      <svg className={styles.sponsorIcon} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
  },
  {
    name: 'Docker',
    url: 'https://www.docker.com',
    brandColor: '#2496ed',
    icon: (
      <svg className={styles.sponsorIcon} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.186.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.186.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.186.186.186m5.893 2.715h2.118a.186.186 0 00.186-.186V9.006a.185.185 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186H8.1a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186H5.136a.186.186 0 00-.186.185v1.888c0 .102.084.185.186.185m-2.928 0h2.12a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186h-2.12a.186.186 0 00-.186.185v1.888c0 .102.084.185.186.185M23.76 9.89c-.965-.776-2.583-.69-3.468.175-.38.373-.674.836-.88 1.343-1.12-.663-2.617-.92-3.953-.66l-.08.016v-2.07a.386.386 0 00-.385-.385H2.155a.386.386 0 00-.386.385v5.334c0 3.738 2.775 6.945 6.643 7.625 4.39.772 8.766-.757 11.238-3.926 2.012-2.58 2.597-5.717 2.05-7.39l.06-.062c.732-.73 2.062-1.39 2-.38" />
      </svg>
    ),
  },
  {
    name: 'Vercel',
    url: 'https://vercel.com',
    brandColor: '#ffffff',
    icon: (
      <svg className={styles.sponsorIcon} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M24 22.525H0l12-21.05 12 21.05z" />
      </svg>
    ),
  },
  {
    name: 'Supabase',
    url: 'https://supabase.com',
    brandColor: '#3ecf8e',
    icon: (
      <svg className={styles.sponsorIcon} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21.362 9.354H12V.396a.396.396 0 00-.716-.233L.198 13.916a.792.792 0 00.618 1.282H10v8.958a.396.396 0 00.716.233l11.086-13.753a.792.792 0 00-.44-1.282z" />
      </svg>
    ),
  },
  {
    name: 'Cloudflare',
    url: 'https://www.cloudflare.com',
    brandColor: '#f38020',
    icon: (
      <svg className={styles.sponsorIcon} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18.675 11.968c-.14-.775-.465-1.503-.948-2.127a5.556 5.556 0 00-2.05-1.636 5.65 5.65 0 00-2.617-.63c-1.42 0-2.736.53-3.742 1.408a5.59 5.59 0 00-1.748 3.193 4.316 4.316 0 00-2.82 1.287 4.3 4.3 0 00-1.246 3.037c0 .178.01.353.03.526H1.5a.75.75 0 000 1.5h17.5a3.75 3.75 0 003.75-3.75 3.75 3.75 0 00-4.075-3.808z" />
      </svg>
    ),
  },
  {
    name: 'Linux Foundation',
    url: 'https://www.linuxfoundation.org',
    brandColor: '#fcc624',
    icon: (
      <svg className={styles.sponsorIcon} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.8 19.2h9.6V24H0V9.6h4.8v9.6zM0 0v7.2h4.8V4.822h14.4V19.2h-2.4V24H24V0H0z" />
      </svg>
    ),
  },
];

const REVIEWS = [
  {
    quote: 'BashLab provides the fastest feedback loop for learning shell scripting. The isolated sandbox let me experiment boldly during my OS coursework without fear of bricking my laptop.',
    author: 'Minh Tran',
    role: 'Computer Science Student',
    initials: 'MT',
    badge: 'Verified Student',
    accent: '#68dfa0',
    metric: '48 Labs Solved',
  },
  {
    quote: 'The interactive lessons and real-time requirement checks feel like pair-programming with a senior mentor. It turned Linux from a dreaded subject into my favorite superpower.',
    author: 'Sarah Chen',
    role: 'Cybersecurity Learner',
    initials: 'SC',
    badge: 'Security Junior',
    accent: '#78cbd4',
    metric: 'Shell 101 Graduate',
  },
  {
    quote: 'Went from being terrified of standard streams and bash syntax to confidently writing automated scripts in days. The hands-on practice is unmatched for beginners.',
    author: 'Alex Rivera',
    role: 'Aspiring Cloud Engineer',
    initials: 'AR',
    badge: 'Top 1% Learner',
    accent: '#f59e0b',
    metric: 'Top 1% Learner',
  },
];

export default function ReviewsSponsors() {
  return (
    <div className={styles.container}>
      {/* Testimonials Grid & Star Rating */}
      <div className={styles.reviewsGroup}>
        <div className={styles.reviewsGrid}>
          {REVIEWS.map((review) => (
            <article
              key={review.author}
              className={styles.reviewCard}
              style={{ '--card-accent': review.accent }}
            >
              <div className={styles.cardHeader}>
                <div className={styles.stars} aria-label="5 out of 5 stars">
                  {'★'.repeat(5)}
                </div>
                <span className={styles.badge}>{review.badge}</span>
              </div>

              <p className={styles.quote}>"{review.quote}"</p>

              <div className={styles.authorRow}>
                <div className={styles.avatar} aria-hidden="true">
                  {review.initials}
                </div>
                <div className={styles.authorMeta}>
                  <span className={styles.authorName}>{review.author}</span>
                  <span className={styles.authorRole}>{review.role}</span>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <span>VERIFIED LEARNER</span>
                <span className={styles.metricTag}>{review.metric}</span>
              </div>
            </article>
          ))}
        </div>

        {/* Sleek Star Rating (Frameless, compact & clean) */}
        <div className={styles.ratingRow}>
          <div className={styles.ratingStarsGroup}>
            <span className={styles.ratingStars} aria-label="4.9 out of 5 stars">
              ★★★★★
            </span>
            <span className={styles.ratingScore}>4.9/5</span>
          </div>

          <span className={styles.ratingDot} aria-hidden="true">·</span>

          <div className={styles.ratingText}>
            <span className={styles.ratingHeading}>
              Trusted by 1,200+ students &amp; aspiring engineers
            </span>
            <span className={styles.ratingNote}>
              — Zero-friction learning with instant feedback
            </span>
          </div>
        </div>
      </div>

      {/* Sponsors & Backers Pill */}
      <div className={styles.sponsorsSection}>
        <span className={styles.sponsorsLabel}>
          Trusted by developers from teams at
        </span>
        <div className={styles.sponsorsTrack} role="list" aria-label="Sponsors and partners">
          {SPONSORS.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.sponsorItem}
              style={{ '--brand-color': s.brandColor }}
              role="listitem"
              title={`Visit ${s.name}`}
            >
              {s.icon}
              <span>{s.name}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
