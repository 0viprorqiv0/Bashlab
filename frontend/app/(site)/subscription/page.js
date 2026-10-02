import React from 'react';
import Link from 'next/link';
import styles from './subscription.module.css';

export const metadata = {
  title: 'Subscription & Pricing — BashLab',
  description: 'Choose the right BashLab plan for your learning journey.',
};

export default function SubscriptionPage() {
  const plans = [
    {
      name: 'Community',
      badge: 'FREE',
      price: '$0',
      period: 'forever',
      desc: 'Everything you need to learn terminal fundamentals.',
      features: [
        'Shell 101 Access (12 Labs)',
        '15-minute ephemeral sandboxes',
        'Standard interactive verification',
        'Public discussion & Discord access',
        'Basic progress tracking',
      ],
      notIncluded: [
        'Advanced courses (Shell 201, Linux Sec)',
        'Persistent containers & storage',
        'Verified certificates of mastery',
        'Priority execution queue',
      ],
      cta: 'Current Plan',
      isPopular: false,
      href: '/subscription',
    },
    {
      name: 'Pro Hacker',
      badge: 'RECOMMENDED',
      price: '$9',
      period: 'per month, billed annually ($89/yr)',
      desc: 'Unrestricted access to all Linux sandboxes, upcoming tracks & certificates.',
      features: [
        'All current & upcoming tracks (Shell 101, 201, Linux Sec)',
        'Unlimited persistent container sessions',
        'Automated test suites & instant feedback',
        'Verified digital Certificate of Mastery',
        'Priority runner queue (Zero wait time)',
        'Exclusive Discord Pro badge & office hours',
      ],
      notIncluded: [],
      cta: 'Upgrade to Pro Access',
      isPopular: true,
      href: '/checkout?plan=pro',
    },
    {
      name: 'Team & University',
      badge: 'ENTERPRISE',
      price: '$29',
      period: 'per seat / month (min 5 seats)',
      desc: 'Centralized environment for engineering teams, university labs & bootcamps.',
      features: [
        'Everything in Pro for all team members',
        'Centralized dashboard & cohort analytics',
        'Custom interactive challenge creator',
        'Dedicated isolated Docker runner nodes',
        '99.9% uptime SLA & priority support',
        'Single Sign-On (SSO / SAML)',
      ],
      notIncluded: [],
      cta: 'Contact Sales / Inquire',
      isPopular: false,
      href: '/checkout?plan=team',
    },
  ];

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.headerSection}>
        <h1 className={styles.title}>
          Invest in your <span className={styles.titleAccent}>Linux mastery</span>.
        </h1>
        <p className={styles.subtitle}>
          Whether you are just starting with command-line tools or sharpening production DevOps skills, pick a tier that matches your ambitions.
        </p>
      </div>

      {/* Grid 3 Pricing Plans */}
      <div className={styles.pricingGrid}>
        {plans.map((p) => (
          <div
            key={p.name}
            className={`${styles.card} ${p.isPopular ? styles.cardPopular : ''}`}
          >
            {p.isPopular && (
              <div className={styles.popularBadge}>
                MOST POPULAR
              </div>
            )}

            <div className={styles.cardName}>{p.name}</div>
            <p className={styles.cardDesc}>
              {p.desc}
            </p>

            <div className={styles.priceBlock}>
              <span className={styles.priceValue}>{p.price}</span>
              <span className={styles.pricePeriod}>/ {p.period}</span>
            </div>

            <div className={styles.featuresBlock}>
              <div className={styles.featuresLabel}>
                WHAT'S INCLUDED:
              </div>
              <ul className={styles.featuresList}>
                {p.features.map((f, i) => (
                  <li key={i} className={styles.featureItem}>
                    <span className={styles.checkIcon}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
                {p.notIncluded.map((f, i) => (
                  <li key={i} className={`${styles.featureItem} ${styles.featureItemDisabled}`}>
                    <span className={styles.crossIcon}>✕</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href={p.href || '/checkout?plan=pro'}
              className={`${styles.ctaBtn} ${p.isPopular ? styles.ctaBtnPopular : ''}`}
            >
              {p.cta}
            </Link>
          </div>
        ))}
      </div>

      {/* Back button */}
      <div className={styles.footerRow}>
        <Link href="/" className={styles.backLink}>
          <span>←</span>
          <span>Return to Home</span>
        </Link>
      </div>
    </div>
  );
}
