'use client';

import React from 'react';
import Link from 'next/link';
import styles from './SubscriptionTeaser.module.css';

export default function SubscriptionTeaser() {
  const plans = [
    {
      id: 'free',
      name: 'Community',
      price: '$0',
      period: '/ forever',
      desc: 'Master fundamentals with basic exercises and community discussions.',
      features: [
        'Shell 101 Access (12 Labs)',
        '15-min ephemeral sandboxes',
        'Standard command checks',
        'Community Discord access',
      ],
      ctaText: 'Start Free',
      isPopular: false,
      color: '#78cbd4',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#78cbd4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      ),
    },
    {
      id: 'pro',
      name: 'Individual',
      price: '$9',
      period: '/ month',
      desc: 'All-access pass for individual learners, developers, and aspiring engineers.',
      features: [
        'All current & upcoming tracks (Shell 201, Linux Sec)',
        'Unlimited persistent sandbox containers',
        'Automated real-time test verifications',
        'Verified certificate of mastery',
        'Priority runner queue & zero wait',
      ],
      ctaText: 'Unlock Individual Access',
      isPopular: true,
      color: '#68dfa0',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#68dfa0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.h2}>
          Start free.<br />
          <span style={{ color: 'var(--lb-accent, #68dfa0)' }}>Level up when you’re ready.</span>
        </h2>
        <p className={styles.sub}>
          Zero hidden costs. Master terminal fundamentals forever, or upgrade for persistent sandboxes and verified certificates.
        </p>
      </div>

      <div className={styles.grid}>
        {plans.map((p) => (
          <div
            key={p.id}
            className={`${styles.card} ${p.isPopular ? styles.cardPopular : ''}`}
          >
            {p.isPopular && <div className={styles.badge}>RECOMMENDED</div>}

            <div className={styles.cardTop}>
              <h3 className={styles.planName}>{p.name}</h3>
              <div className={styles.planIcon}>{p.icon}</div>
            </div>

            <div className={styles.priceWrap}>
              <span className={styles.price}>{p.price}</span>
              <span className={styles.period}>{p.period}</span>
            </div>

            <p className={styles.cardDesc}>{p.desc}</p>

            <ul className={styles.features}>
              {p.features.map((feat, idx) => (
                <li key={idx} className={styles.featureItem}>
                  <span className={styles.check}>✓</span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/subscription"
              className={`${styles.cardBtn} ${p.isPopular ? styles.cardBtnPopular : ''}`}
            >
              {p.ctaText}
            </Link>
          </div>
        ))}
      </div>

      <div className={styles.bottomArea}>
        <span className={styles.guarantee}>
          30-day money-back guarantee · Instant activation · Cancel anytime in 1 click
        </span>
      </div>
    </div>
  );
}
