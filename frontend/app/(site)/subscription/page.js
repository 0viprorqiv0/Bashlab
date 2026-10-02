'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './subscription.module.css';

export default function SubscriptionPage() {
  const [billingCycle, setBillingCycle] = useState('annual'); // 'annual' | 'monthly'
  const [openFaq, setOpenFaq] = useState(0); // index of open FAQ item, default first open

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? -1 : index);
  };

  const plans = [
    {
      name: 'Community',
      badge: 'FREE FOREVER',
      price: '$0',
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
        'Advanced courses (Shell 201, Linux Sec)',
        'Persistent containers & home storage',
        'Verified certificates of mastery',
        'Priority execution queue (Zero wait)',
      ],
      cta: 'Get Started Free',
      isPopular: false,
      href: '/courses',
    },
    {
      name: 'Individual',
      badge: 'MOST POPULAR',
      price: billingCycle === 'annual' ? '$9' : '$12',
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
      href: '/checkout?plan=individual',
    },
    {
      name: 'Team & University',
      badge: 'ENTERPRISE',
      price: '$29',
      period: 'per seat / month (min 5 seats)',
      savings: 'Volume discounts available',
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
      cta: 'Contact Sales / Inquire',
      isPopular: false,
      href: '/checkout?plan=team',
    },
  ];

  const comparisonCategories = [
    {
      title: 'Terminal & Sandboxes',
      features: [
        {
          name: 'In-Browser Linux Terminal Sandbox',
          free: 'Ephemeral (15 min)',
          individual: 'Unlimited Persistent',
          team: 'Unlimited Dedicated Pool',
        },
        {
          name: 'Root Privilege & Sudo Access',
          free: 'User-level only',
          individual: 'Full root access',
          team: 'Full root + Custom kernels',
        },
        {
          name: 'Persistent /home Storage',
          free: 'None',
          individual: '10 GB SSD Storage',
          team: '50 GB / Seat + Shared storage',
        },
        {
          name: 'Concurrent Lab Instances',
          free: '1 Instance',
          individual: '3 Concurrent Instances',
          team: '10+ Concurrent Instances',
        },
        {
          name: 'Container Spooling Speed',
          free: 'Standard (~5s)',
          individual: 'Instant Zero-Wait (<1s)',
          team: 'Dedicated Cluster Node',
        },
      ],
    },
    {
      title: 'Curriculum & Scenarios',
      features: [
        {
          name: 'Shell 101: CLI Fundamentals',
          free: 'Full access (12 labs)',
          individual: 'Full access + Extra challenges',
          team: 'Full access + Solutions',
        },
        {
          name: 'Shell 201: Automation & Scripting',
          free: 'Preview first 3 labs',
          individual: 'Full access (24 labs)',
          team: 'Full access + Custom modules',
        },
        {
          name: 'Linux Security & Exploitation CTFs',
          free: 'Community CTFs only',
          individual: '40+ Live-Fire Scenarios',
          team: 'All + Private CTF Hosting',
        },
        {
          name: 'AI Terminal Assistant & Hint Engine',
          free: 'Basic hints',
          individual: 'Detailed debugging & hints',
          team: 'Dedicated mentor queue',
        },
      ],
    },
    {
      title: 'Credentials & Analytics',
      features: [
        {
          name: 'Verifiable Certificate of Mastery',
          free: '✕',
          individual: '✓ Shareable on LinkedIn & CV',
          team: '✓ Co-branded Institutional',
        },
        {
          name: 'Skill Telemetry & Mastery Graph',
          free: 'Basic points',
          individual: 'Full competency matrix',
          team: 'Manager dashboard & export',
        },
        {
          name: 'Discord Community Access',
          free: 'Public channels',
          individual: 'VIP Lounge & Office Hours',
          team: 'Private Team channel',
        },
        {
          name: 'Support Level',
          free: 'Community forum',
          individual: 'Priority email (< 24h)',
          team: 'Dedicated Account Manager & SLA',
        },
      ],
    },
  ];

  const testimonials = [
    {
      name: 'Alex Rivera',
      role: 'Junior SOC Analyst',
      company: 'CloudSec Technologies',
      avatar: 'AR',
      rating: 5,
      content:
        'BashLab bridged the exact gap between memorizing command syntax and surviving real live-fire incident response. The instant root sandboxes are unmatched in speed and realism.',
    },
    {
      name: 'Minh Nguyen',
      role: 'Cybersecurity Student & CTF Player',
      company: 'Hanoi University of Science and Tech',
      avatar: 'MN',
      rating: 5,
      content:
        'I went from panicking inside vim to solving complex privilege escalation challenges in 3 weeks. Upgrading to Individual was the single best career investment I made this year.',
    },
    {
      name: 'Sarah Jenkins',
      role: 'Lead CTF Organizer',
      company: 'Collegiate Cyber Defense Network',
      avatar: 'SJ',
      rating: 5,
      content:
        'Our university security club uses BashLab for hands-on Linux workshops. The zero-setup browser terminals mean students spend 100% of their time learning, not debugging Docker.',
    },
  ];

  const faqs = [
    {
      q: 'Can I cancel or change my subscription at any time?',
      a: 'Yes, you can cancel your subscription with a single click at any time from your Account settings. You will retain full access to all Individual features until the end of your paid billing period with zero unexpected renewal charges.',
    },
    {
      q: 'Do I need to install Linux, Docker, or a Virtual Machine on my computer?',
      a: 'Not at all! BashLab runs 100% in your modern web browser. When you launch any exercise, we spin up an isolated, dedicated Linux container in the cloud in under 2 seconds. All you need is a browser.',
    },
    {
      q: 'How does the 30-day money-back guarantee work?',
      a: 'We want you to be completely confident in your learning. If you try BashLab Individual and feel it is not the right fit for your learning goals, contact us within 30 days and we will process a 100% full refund, no questions asked.',
    },
    {
      q: 'Do you offer student or academic discounts?',
      a: 'Yes! We believe practical cybersecurity education should be accessible to all students. If you have an active school email or student ID, you can use promo code STUDENT at checkout for an instant 20% discount on all individual plans.',
    },
    {
      q: 'How do the verified certificates of mastery work?',
      a: 'Upon completing a curriculum track and passing the hands-on practical exam, you receive a cryptographically signed Certificate of Mastery with a unique verification URL that you can attach directly to LinkedIn, GitHub, or your resume.',
    },
    {
      q: 'What payment methods are supported?',
      a: 'We support all major Credit & Debit cards (Visa, Mastercard, American Express), Apple Pay, Google Pay, PayPal, and instant bank transfers via VietQR for learners in Vietnam.',
    },
  ];

  return (
    <div className={styles.pageWrapper}>
      {/* 1. Header & Billing Cycle Switcher */}
      <section className={styles.headerSection}>
        <div className={styles.topBadge}>
          <span className={styles.topBadgePulse} />
          <span>CYBERSECURITY &amp; LINUX TRAINING</span>
        </div>
        <h1 className={styles.title}>
          Invest in your <span className={styles.titleAccent}>Linux mastery</span>.
        </h1>
        <p className={styles.subtitle}>
          Whether you are taking your first steps in the shell or sharpening real-world DevOps &amp; security skills, choose the tier that accelerates your ambitions.
        </p>

        {/* Monthly / Annual Switcher Toggle */}
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
              <span>Billed Annually</span>
              <span className={styles.saveBadge}>SAVE 25%</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Three Primary Pricing Cards */}
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
              {!p.isPopular && <span className={styles.standardBadge}>{p.badge}</span>}
            </div>

            <p className={styles.cardDesc}>{p.desc}</p>

            <div className={styles.priceBlock}>
              <div className={styles.priceRow}>
                <span className={styles.priceValue}>{p.price}</span>
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
                {p.notIncluded.map((f, i) => (
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

      {/* 3. Social Proof: Trusted by Security Organizers & Universities (TryHackMe Style) */}
      <section className={styles.trustedSection}>
        <h2 className={styles.trustedTitle}>
          TRUSTED BY CTF ORGANIZERS, SECURITY CLUBS &amp; DEVELOPERS WORLDWIDE
        </h2>

        {/* Logo / Badge Marquee */}
        <div className={styles.logoMarquee}>
          <div className={styles.logoBadge}>
            <span className={styles.logoIcon}>🛡️</span>
            <span>DEF CON GROUPS</span>
          </div>
          <div className={styles.logoBadge}>
            <span className={styles.logoIcon}>🌐</span>
            <span>OWASP CHAPTERS</span>
          </div>
          <div className={styles.logoBadge}>
            <span className={styles.logoIcon}>⚡</span>
            <span>BSIDES SECURITY</span>
          </div>
          <div className={styles.logoBadge}>
            <span className={styles.logoIcon}>🎓</span>
            <span>CYBER LABS &amp; UNIS</span>
          </div>
          <div className={styles.logoBadge}>
            <span className={styles.logoIcon}>💻</span>
            <span>HACKTHEBOX MEETUPS</span>
          </div>
          <div className={styles.logoBadge}>
            <span className={styles.logoIcon}>🔍</span>
            <span>MITRE ATT&amp;CK REPO</span>
          </div>
        </div>

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

      {/* 4. Full Plan Comparison Matrix (TryHackMe Style) */}
      <section className={styles.comparisonSection}>
        <div className={styles.sectionHeaderWrap}>
          <div className={styles.sectionTag}>ACCESS MATRIX</div>
          <h2 className={styles.sectionHeading}>Detailed Plan Comparison</h2>
          <p className={styles.sectionSub}>
            Explore every capability across our plans to choose the best configuration for your development environment.
          </p>
        </div>

        <div className={styles.tableScrollWrap}>
          <table className={styles.comparisonTable}>
            <thead>
              <tr>
                <th className={styles.featureColHead}>Features</th>
                <th className={styles.planColHead}>Community</th>
                <th className={`${styles.planColHead} ${styles.planColPopular}`}>
                  <div className={styles.popularTableBadge}>RECOMMENDED</div>
                  Individual
                </th>
                <th className={styles.planColHead}>Team &amp; Uni</th>
              </tr>
            </thead>
            <tbody>
              {comparisonCategories.map((cat, catIdx) => (
                <React.Fragment key={cat.title}>
                  <tr className={styles.categoryRow}>
                    <td colSpan="4" className={styles.categoryTitle}>
                      {cat.title}
                    </td>
                  </tr>
                  {cat.features.map((feat, fIdx) => (
                    <tr key={feat.name} className={styles.featureRow}>
                      <td className={styles.featureNameCell}>
                        {feat.name}
                      </td>
                      <td className={styles.valueCell}>
                        {feat.free === '✓' ? (
                          <span className={styles.checkIcon}>✓</span>
                        ) : feat.free === '✕' ? (
                          <span className={styles.crossIcon}>✕</span>
                        ) : (
                          feat.free
                        )}
                      </td>
                      <td className={`${styles.valueCell} ${styles.valueCellPopular}`}>
                        {feat.individual === '✓' ? (
                          <span className={styles.checkIcon}>✓</span>
                        ) : (
                          <span className={styles.boldCell}>{feat.individual}</span>
                        )}
                      </td>
                      <td className={styles.valueCell}>
                        {feat.team === '✓' ? (
                          <span className={styles.checkIcon}>✓</span>
                        ) : (
                          feat.team
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

      {/* 5. Learner Testimonials / Reviews (TryHackMe Style) */}
      <section className={styles.testimonialsSection}>
        <div className={styles.sectionHeaderWrap}>
          <div className={styles.sectionTag}>COMMUNITY PROOF</div>
          <h2 className={styles.sectionHeading}>Loved by Developers &amp; Security Engineers</h2>
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
      </section>

      {/* 6. Frequently Asked Questions (QNA Accordion) */}
      <section className={styles.faqSection}>
        <div className={styles.sectionHeaderWrap}>
          <div className={styles.sectionTag}>FAQ // QUESTIONS</div>
          <h2 className={styles.sectionHeading}>Frequently Asked Questions</h2>
          <p className={styles.sectionSub}>
            Everything you need to know about billing, sandboxes, and verified certificates.
          </p>
        </div>

        <div className={styles.faqAccordion}>
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className={`${styles.faqItem} ${openFaq === idx ? styles.faqItemOpen : ''}`}
            >
              <button
                type="button"
                className={styles.faqQuestionBtn}
                onClick={() => toggleFaq(idx)}
                aria-expanded={openFaq === idx}
              >
                <span className={styles.faqQuestionText}>{faq.q}</span>
                <span className={styles.faqChevron}>
                  {openFaq === idx ? '−' : '+'}
                </span>
              </button>
              {openFaq === idx && (
                <div className={styles.faqAnswer}>
                  <p>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 7. Bottom High-Impact CTA Banner */}
      <section className={styles.bottomCtaBanner}>
        <div className={styles.ctaBannerInner}>
          <h2 className={styles.ctaBannerTitle}>
            Ready to conquer the Linux terminal?
          </h2>
          <p className={styles.ctaBannerDesc}>
            Join over 15,000 engineers and security researchers. Start free or jump straight into root sandboxes with Individual Access.
          </p>
          <div className={styles.ctaBannerBtns}>
            <Link href="/checkout?plan=individual" className={styles.bannerPrimaryBtn}>
              <span>Upgrade to Individual ($9/mo)</span>
              <span>→</span>
            </Link>
            <Link href="/courses" className={styles.bannerSecondaryBtn}>
              Explore Free Courses
            </Link>
          </div>
          <div className={styles.ctaGuaranteeNote}>
            🔒 30-Day Money-Back Guarantee • Cancel anytime with 1 click
          </div>
        </div>
      </section>
    </div>
  );
}
