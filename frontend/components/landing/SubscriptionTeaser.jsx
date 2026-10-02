'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './SubscriptionTeaser.module.css';

export default function SubscriptionTeaser() {
  // Billing cycle per plan: 'monthly' | 'annual'
  const [billingCycles, setBillingCycles] = useState({
    pro: 'annual',
    team: 'annual',
  });

  const toggleCycle = (planId) => {
    setBillingCycles((prev) => ({
      ...prev,
      [planId]: prev[planId] === 'annual' ? 'monthly' : 'annual',
    }));
  };

  const plans = [
    {
      id: 'free',
      name: 'Community',
      monthlyPrice: '0',
      annualPrice: '0',
      period: '/ forever',
      hasToggle: false,
      desc: 'Master fundamentals with basic exercises and community discussions.',
      features: [
        'Shell 101 Access (12 Labs)',
        '15-min ephemeral sandboxes',
        'Standard command checks',
        'Community Discord access',
      ],
      ctaText: 'Start Free',
      ctaHref: '/courses',
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
      monthlyPrice: '12',
      annualPrice: '9',
      annualPeriod: '/ month',
      monthlyPeriod: '/ month',
      discountTag: '-25%',
      hasToggle: true,
      desc: 'All-access pass for individual learners, developers, and aspiring engineers.',
      features: [
        'All current & upcoming tracks (Shell 201, Linux Sec)',
        'Unlimited persistent sandbox containers',
        'Automated real-time test verifications',
        'Verified certificate of mastery',
        'Priority runner queue & zero wait',
      ],
      ctaText: 'Unlock Individual Access',
      ctaHref: '/register?plan=individual',
      isPopular: true,
      color: '#68dfa0',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#68dfa0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
    },
    {
      id: 'team',
      name: 'Team & University',
      monthlyPrice: '29',
      annualPrice: '24',
      annualPeriod: '/ seat / mo',
      monthlyPeriod: '/ seat / mo',
      discountTag: '-17%',
      hasToggle: true,
      desc: 'Centralized environment for engineering teams, university labs, and security bootcamps.',
      features: [
        'All Individual tracks & persistent containers',
        'Centralized dashboard & cohort analytics',
        'Custom challenge authoring & scoring',
        'Single Sign-On (SSO / SAML integration)',
        'Volume team license & priority support',
      ],
      ctaText: 'Explore Team & University',
      ctaHref: '/register?plan=team',
      isPopular: false,
      color: '#a78bfa',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
        {plans.map((p) => {
          const isAnnual = billingCycles[p.id] === 'annual';
          const priceValue = p.hasToggle ? (isAnnual ? p.annualPrice : p.monthlyPrice) : p.monthlyPrice;
          const periodText = p.hasToggle ? (isAnnual ? p.annualPeriod : p.monthlyPeriod) : p.period;
          const targetHref = p.id === 'free'
            ? '/courses'
            : `/checkout?plan=${p.id === 'team' ? 'team' : 'individual'}&cycle=${isAnnual ? 'annual' : 'monthly'}`;

          return (
            <div
              key={p.id}
              className={`${styles.card} ${p.isPopular ? styles.cardPopular : ''}`}
            >
              {p.isPopular && <div className={styles.badge}>RECOMMENDED</div>}

              <div className={styles.cardTop}>
                <h3 className={styles.planName}>{p.name}</h3>
                <div className={styles.planIcon}>{p.icon}</div>
              </div>

              {/* Price Wrap with Rolling Animation */}
              <div className={styles.priceWrap}>
                <span className={styles.currency}>$</span>
                <span className={styles.numberRollerSlot}>
                  <span key={priceValue} className={styles.animatedPriceNumber}>
                    {priceValue}
                  </span>
                </span>
                <span className={styles.period}>{periodText}</span>
              </div>

              {/* iOS Style Switch under the price for Individual & Team */}
              {p.hasToggle ? (
                <div className={styles.switchWrapper}>
                  <span
                    className={`${styles.switchMode} ${!isAnnual ? styles.switchModeActive : ''}`}
                    onClick={() => isAnnual && toggleCycle(p.id)}
                  >
                    Monthly
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-label={`Toggle monthly or annual billing for ${p.name}`}
                    aria-checked={isAnnual}
                    className={`${styles.iosSwitch} ${isAnnual ? styles.iosSwitchActive : ''}`}
                    onClick={() => toggleCycle(p.id)}
                  >
                    <span className={styles.iosSwitchThumb} />
                  </button>
                  <span
                    className={`${styles.switchMode} ${isAnnual ? styles.switchModeActive : ''}`}
                    onClick={() => !isAnnual && toggleCycle(p.id)}
                  >
                    Yearly
                    <span className={styles.discountTag}>{p.discountTag}</span>
                  </span>
                </div>
              ) : (
                <div className={styles.switchSpacer} />
              )}

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
                href={targetHref}
                className={`${styles.cardBtn} ${p.isPopular ? styles.cardBtnPopular : ''}`}
              >
                {p.ctaText}
              </Link>
            </div>
          );
        })}
      </div>

      <div className={styles.bottomArea}>
        <span className={styles.guarantee}>
          30-day money-back guarantee · Instant activation · Cancel anytime in 1 click
        </span>
      </div>
    </div>
  );
}
