'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SponsorsBar } from '@/components/landing/ReviewsSponsors';
import styles from './subscription.module.css';

// Animated Rolling Number Component (TryHackMe Style Reel Transition)
function AnimatedPrice({ value, currency = '$' }) {
  return (
    <div className={styles.priceGroup}>
      <span className={styles.currencySymbol}>{currency}</span>
      <span className={styles.numberRollerSlot}>
        <span key={value} className={styles.animatedPriceValue}>
          {value}
        </span>
      </span>
    </div>
  );
}

function SubscriptionContent() {
  const searchParams = useSearchParams();
  const initialCycle = searchParams.get('cycle') === 'monthly' ? 'monthly' : 'annual';
  
  // Billing: 'annual' | 'monthly'
  const [billingCycle, setBillingCycle] = useState(initialCycle);

  // --- PLANS DATA (Cá nhân & Miễn phí) ---
  const plans = [
    {
      name: 'Community',
      badge: null,
      price: '0',
      period: 'forever',
      desc: 'Everything you need to learn terminal fundamentals and syntax basics.',
      features: [
        'Shell 101 Access (12 Beginner Labs)',
        '15-minute ephemeral sandboxes',
        'Standard interactive verification',
        'Public discussion & Discord access',
        'Basic progress & streak tracking',
      ],
      notIncluded: [
        'Advanced tracks (Shell 201, Linux Sec)',
        'Persistent containers & home storage',
        'Verified certificates of mastery',
        'Priority execution queue (Zero wait)',
      ],
      cta: 'Start Learning Free',
      isPopular: false,
      href: '/courses',
    },
    {
      name: 'Individual Access',
      badge: 'MOST POPULAR',
      price: billingCycle === 'annual' ? '9' : '12',
      period: billingCycle === 'annual' ? 'per month, billed annually ($89/yr)' : 'per month, billed monthly',
      savings: billingCycle === 'annual' ? 'Save 25% with annual' : null,
      desc: 'Unrestricted access to all Linux sandboxes, live-fire CTFs, persistent environments & verified credentials.',
      features: [
        'All current & upcoming tracks (Shell 101, 201, Linux Sec)',
        'Unlimited persistent container sessions (Root access)',
        '10GB persistent /home storage for your dotfiles',
        'Automated test suites & instant AI hints',
        'Cryptographically verified Certificate of Mastery',
        'Priority runner queue (Zero wait time)',
        'Exclusive Discord Pro badge & private channels',
      ],
      notIncluded: [],
      cta: 'Upgrade to Individual',
      isPopular: true,
      href: `/checkout?plan=individual&cycle=${billingCycle}`,
    },
    {
      name: 'Team & University',
      badge: null,
      price: billingCycle === 'annual' ? '24' : '29',
      period: 'per seat / month (min 5 seats)',
      savings: 'Volume team pricing',
      desc: 'Centralized environment for engineering teams, university security labs & bootcamp cohorts.',
      features: [
        'Everything in Individual for all team members',
        'Centralized team dashboard & cohort analytics',
        'Custom interactive challenge & scenario creator',
        'Dedicated isolated Docker runner nodes',
        '99.98% uptime SLA & priority support',
        'Single Sign-On (SSO / SAML integration)',
        'Co-branded university graduation certificates',
      ],
      notIncluded: [],
      cta: 'Get Team & University',
      isPopular: false,
      href: `/checkout?plan=team&cycle=${billingCycle}`,
    },
  ];

  // --- COMPARISON MATRIX DATA ---
  const comparisonCategories = [
    {
      title: 'Terminal Sandbox & Environment',
      features: [
        {
          name: 'In-Browser Linux Terminal Sandbox',
          col1: 'Ephemeral (15 min)',
          col2: 'Unlimited Persistent',
          col3: 'Dedicated Isolated Nodes',
        },
        {
          name: 'Root Privilege & Sudo Access',
          col1: 'User-level only',
          col2: 'Full root access',
          col3: 'Full root access + Custom tools',
        },
        {
          name: 'Persistent /home Storage',
          col1: 'None',
          col2: '10 GB SSD Storage',
          col3: '50 GB Team Storage',
        },
        {
          name: 'Concurrent Lab Instances',
          col1: '1 Instance',
          col2: '3 Concurrent Instances',
          col3: '10 Instances / seat',
        },
        {
          name: 'Container Spooling Speed',
          col1: 'Standard (~5s)',
          col2: 'Instant Zero-Wait (<1s)',
          col3: 'Instant Dedicated (<500ms)',
        },
      ],
    },
    {
      title: 'Curriculum & Scenarios',
      features: [
        {
          name: 'Shell 101: CLI Fundamentals',
          col1: 'Full access (12 labs)',
          col2: 'Full access + Extra challenges',
          col3: 'Full access + Cohort grading',
        },
        {
          name: 'Shell 201: Automation & Scripting',
          col1: 'Preview first 3 labs',
          col2: 'Full access (24 labs)',
          col3: 'Full access + Team grading',
        },
        {
          name: 'Linux Security & Exploitation CTFs',
          col1: 'Community CTFs only',
          col2: '40+ Live-Fire Scenarios',
          col3: 'All CTFs + Custom CTF Builder',
        },
        {
          name: 'AI Terminal Assistant & Hint Engine',
          col1: 'Basic hints',
          col2: 'Detailed debugging & hints',
          col3: 'Unlimited Team AI hints',
        },
      ],
    },
    {
      title: 'Governance & Credentials',
      features: [
        {
          name: 'Verifiable Certificate of Mastery',
          col1: '✕',
          col2: '✓ Individual Shareable',
          col3: '✓ Co-branded University Certs',
        },
        {
          name: 'Skill Telemetry & Mastery Graph',
          col1: 'Basic points',
          col2: 'Full competency matrix',
          col3: 'Team Leaderboard & Admin Analytics',
        },
        {
          name: 'Centralized Team Dashboard',
          col1: '✕',
          col2: '✕',
          col3: '✓ Member Management & Seats',
        },
        {
          name: 'Single Sign-On (SSO / SAML)',
          col1: '✕',
          col2: '✕',
          col3: '✓ Okta, Google, Azure AD',
        },
        {
          name: 'Support & Onboarding SLA',
          col1: 'Community Discord',
          col2: 'VIP Lounge & Office Hours',
          col3: 'Dedicated Slack & < 4h SLA',
        },
      ],
    },
  ];

  // --- REALISTIC TESTIMONIALS ---
  const testimonials = [
    {
      name: 'Alex Rivera',
      role: 'Junior SOC Analyst',
      company: 'CloudSec Technologies',
      avatar: 'AR',
      rating: 5,
      content: 'BashLab bridged the exact gap between memorizing command syntax and surviving real live-fire incident response. The instant root sandboxes are unmatched in speed and realism.',
    },
    {
      name: 'Minh Nguyen',
      role: 'Cybersecurity Student & CTF Player',
      company: 'Hanoi University of Science and Tech',
      avatar: 'MN',
      rating: 5,
      content: 'I went from panicking inside vim to solving complex privilege escalation challenges in 3 weeks. Upgrading to Individual was the single best career investment I made this year.',
    },
    {
      name: 'Sarah Jenkins',
      role: 'DevOps Engineer',
      company: 'Collegiate Cloud Group',
      avatar: 'SJ',
      rating: 5,
      content: 'The zero-setup browser terminals mean you spend 100% of your time mastering pipelines, streams, and Linux automation instead of debugging local Docker issues.',
    },
  ];

  return (
    <div className={styles.pageWrapper}>
      {/* Background Cityscape với lớp tint đen như trang Landing & Checkout */}
      <div className={styles.newBgContainer} aria-hidden="true">
        <video
          autoPlay
          loop
          muted
          playsInline
          className={styles.bgMedia}
          src="/background/pixel-cityscape.1920x1080.mp4"
        />
        <div className={styles.bgDimOverlay} />
      </div>

      {/* 1. Header Section */}
      <section className={styles.headerSection}>
        <h1 className={styles.title}>
          Invest in your <span className={styles.titleAccent}>Linux mastery</span>.
        </h1>
        <p className={styles.subtitle}>
          Whether you are taking your first steps in the shell or sharpening real-world DevOps &amp; security skills, choose the tier that accelerates your ambitions.
        </p>

        {/* SWITCHER: Monthly vs Annual (With Animated Price Numbers) */}
        <div className={styles.switchWrapper}>
          <div className={styles.cycleSwitch}>
            <button
              type="button"
              className={`${styles.cycleBtn} ${billingCycle === 'monthly' ? styles.cycleBtnActive : ''}`}
              onClick={() => setBillingCycle('monthly')}
            >
              Billed Monthly
            </button>
            <button
              type="button"
              className={`${styles.cycleBtn} ${billingCycle === 'annual' ? styles.cycleBtnActive : ''}`}
              onClick={() => setBillingCycle('annual')}
            >
              Billed Annually
            </button>
          </div>
        </div>
      </section>

      {/* 2. Primary Pricing Cards */}
      <section className={styles.pricingGrid}>
        {plans.map((p) => (
          <div
            key={p.name}
            className={`${styles.card} ${p.isPopular ? styles.cardPopular : ''}`}
          >
            {p.isPopular && (
              <div className={styles.popularBadge}>
                {p.badge}
              </div>
            )}

            <div className={styles.cardHeader}>
              <div className={styles.cardName}>{p.name}</div>
              {!p.isPopular && p.badge && <span className={styles.standardBadge}>{p.badge}</span>}
            </div>

            <p className={styles.cardDesc}>{p.desc}</p>

            {/* Price Block with Smooth Animated Reel transition */}
            <div className={styles.priceBlock}>
              <div className={styles.priceRow}>
                <AnimatedPrice value={p.price} />
                <span className={styles.pricePeriod}>/ {p.period}</span>
              </div>
              {p.savings && (
                <div className={styles.savingsNotice}>
                  ⚡ {p.savings}
                </div>
              )}
            </div>

            <div className={styles.featuresBlock}>
              <div className={styles.featuresLabel}>WHAT'S INCLUDED:</div>
              <ul className={styles.featuresList}>
                {p.features.map((f, i) => (
                  <li key={i} className={styles.featureItem}>
                    <span className={styles.checkIcon}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
                {p.notIncluded?.map((f, i) => (
                  <li key={i} className={`${styles.featureItem} ${styles.featureItemDisabled}`}>
                    <span className={styles.crossIcon}>✕</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href={p.href}
              className={`${styles.ctaBtn} ${p.isPopular ? styles.ctaBtnPopular : ''}`}
            >
              <span>{p.cta}</span>
              <span className={styles.ctaArrow}>→</span>
            </Link>
          </div>
        ))}
      </section>

      {/* 3. Full Plan Comparison Matrix */}
      <section className={styles.comparisonSection}>
        <div className={styles.sectionHeaderWrap}>
          <h2 className={styles.sectionHeading}>
            Detailed Plan Comparison
          </h2>
          <p className={styles.sectionSub}>
            Explore every capability across our plans to choose the best configuration for your development environment.
          </p>
        </div>

        <div className={styles.tableScrollWrap}>
          <table className={styles.comparisonTable}>
            <thead>
              <tr>
                <th className={styles.featureColHead}>Capabilities &amp; Features</th>
                <th className={styles.planColHead}>Community</th>
                <th className={`${styles.planColHead} ${styles.planColPopular}`}>
                  <div className={styles.popularTableBadge}>RECOMMENDED</div>
                  Individual Access
                </th>
                <th className={styles.planColHead}>Team &amp; University</th>
              </tr>
            </thead>
            <tbody>
              {comparisonCategories.map((cat) => (
                <React.Fragment key={cat.title}>
                  <tr className={styles.categoryRow}>
                    <td colSpan="4" className={styles.categoryTitle}>
                      <div className={styles.catTitleWrap}>
                        <span>{cat.title}</span>
                      </div>
                    </td>
                  </tr>
                  {cat.features.map((feat) => (
                    <tr key={feat.name} className={styles.featureRow}>
                      <td className={styles.featureNameCell}>
                        {feat.name}
                      </td>
                      <td className={styles.valueCell}>
                        {feat.col1 === '✓' ? (
                          <span className={styles.checkIcon}>✓</span>
                        ) : feat.col1 === '✕' ? (
                          <span className={styles.crossIcon}>✕</span>
                        ) : (
                          feat.col1
                        )}
                      </td>
                      <td className={`${styles.valueCell} ${styles.valueCellPopular}`}>
                        {feat.col2 === '✓' ? (
                          <span className={styles.checkIcon}>✓</span>
                        ) : feat.col2 === '✕' ? (
                          <span className={styles.crossIcon}>✕</span>
                        ) : (
                          <span className={styles.boldCell}>{feat.col2}</span>
                        )}
                      </td>
                      <td className={styles.valueCell}>
                        {feat.col3 === '✓' ? (
                          <span className={styles.checkIcon}>✓</span>
                        ) : feat.col3 === '✕' ? (
                          <span className={styles.crossIcon}>✕</span>
                        ) : (
                          <span className={styles.boldCell}>{feat.col3}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Social Proof: Trusted by Security Organizers & Developers */}
      <section className={styles.trustedSection}>
        <h2 className={styles.trustedTitle}>
          TRUSTED BY CTF ORGANIZERS, SECURITY CLUBS &amp; DEVELOPERS WORLDWIDE
        </h2>

        {/* Stats counter */}
        <div className={styles.statsRow}>
          <div className={styles.statItem}>
            <div className={styles.statValue}>15,000+</div>
            <div className={styles.statLabel}>Active Learners</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>120,000+</div>
            <div className={styles.statLabel}>Sandboxes Launched</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>99.98%</div>
            <div className={styles.statLabel}>Container Uptime</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>4.9 / 5.0</div>
            <div className={styles.statLabel}>Community Rating</div>
          </div>
        </div>
      </section>

      {/* 5. Learner Testimonials */}
      <section className={styles.testimonialsSection}>
        <div className={styles.sectionHeaderWrap}>
          <h2 className={styles.sectionHeading}>Loved by learners worldwide</h2>
          <p className={styles.sectionSub}>
            Hear how hands-on Linux terminal practice with real root sandboxes transformed careers and study paths.
          </p>
        </div>

        <div className={styles.testimonialGrid}>
          {testimonials.map((t, idx) => (
            <div key={idx} className={styles.testimonialCard}>
              <div className={styles.starsRow}>
                {[...Array(t.rating)].map((_, i) => (
                  <span key={i} className={styles.star}>★</span>
                ))}
              </div>
              <p className={styles.testimonialQuote}>"{t.content}"</p>
              <div className={styles.authorRow}>
                <div className={styles.authorAvatar}>{t.avatar}</div>
                <div>
                  <div className={styles.authorName}>{t.name}</div>
                  <div className={styles.authorRole}>{t.role} • <span className={styles.authorCompany}>{t.company}</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trusted by developers from teams at (From Landing) */}
        <SponsorsBar className={styles.sponsorsSection} />
      </section>

      {/* 6. Bottom High-Impact CTA Banner */}
      <section className={styles.bottomCtaBanner}>
        <div className={styles.ctaBannerInner}>
          <h2 className={styles.ctaBannerTitle}>
            Ready to conquer the Linux terminal?
          </h2>
          <p className={styles.ctaBannerDesc}>
            Join over 15,000 engineers and security researchers. Start free or jump straight into root sandboxes with Individual Access.
          </p>
          <div className={styles.ctaBannerBtns}>
            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={styles.bannerPrimaryBtn}
            >
              <span>Upgrade now</span>
            </button>
          </div>
          <div className={styles.ctaGuaranteeNote}>
            🔒 30-Day Money-Back Guarantee • Cancel anytime with 1 click
          </div>
        </div>
      </section>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', padding: '120px 24px', textAlign: 'center', color: '#8c9ba8' }}>Loading pricing plans...</div>}>
      <SubscriptionContent />
    </Suspense>
  );
}
