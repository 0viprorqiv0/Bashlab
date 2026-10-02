'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
  
  // FAQ accordion
  const [openFaq, setOpenFaq] = useState(0);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? -1 : index);
  };

  // --- PLANS DATA (Cá nhân & Miễn phí) ---
  const plans = [
    {
      name: 'Community',
      badge: 'FREE FOREVER',
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
        },
        {
          name: 'Root Privilege & Sudo Access',
          col1: 'User-level only',
          col2: 'Full root access',
        },
        {
          name: 'Persistent /home Storage',
          col1: 'None',
          col2: '10 GB SSD Storage',
        },
        {
          name: 'Concurrent Lab Instances',
          col1: '1 Instance',
          col2: '3 Concurrent Instances',
        },
        {
          name: 'Container Spooling Speed',
          col1: 'Standard (~5s)',
          col2: 'Instant Zero-Wait (<1s)',
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
        },
        {
          name: 'Shell 201: Automation & Scripting',
          col1: 'Preview first 3 labs',
          col2: 'Full access (24 labs)',
        },
        {
          name: 'Linux Security & Exploitation CTFs',
          col1: 'Community CTFs only',
          col2: '40+ Live-Fire Scenarios',
        },
        {
          name: 'AI Terminal Assistant & Hint Engine',
          col1: 'Basic hints',
          col2: 'Detailed debugging & hints',
        },
      ],
    },
    {
      title: 'Credentials & Community',
      features: [
        {
          name: 'Verifiable Certificate of Mastery',
          col1: '✕',
          col2: '✓ Shareable on LinkedIn & CV',
        },
        {
          name: 'Skill Telemetry & Mastery Graph',
          col1: 'Basic points',
          col2: 'Full competency matrix',
        },
        {
          name: 'Community & Office Hours',
          col1: 'Public Discord',
          col2: 'VIP Lounge & Office Hours',
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

  // --- FAQ ITEMS ---
  const faqs = [
    {
      q: 'Can I cancel or change my subscription at any time?',
      a: 'Yes, you can cancel your subscription with a single click at any time from your Account settings. You will retain full access to all Individual features until the end of your paid billing period with zero unexpected renewal charges.',
    },
    {
      q: 'Do I need to install Linux, Docker, or a Virtual Machine on my computer?',
      a: 'Not at all! Every lab runs completely inside your modern web browser via WebSockets connected to our high-performance isolated container cluster. You only need Google Chrome, Edge, Safari, or Firefox.',
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
      a: 'We support all major Credit & Debit cards (Visa, Mastercard, American Express), Apple Pay, Google Pay, PayPal, and instant bank transfers via VietQR.',
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
              <span>Billed Annually</span>
              <span className={styles.saveBadge}>SAVE 25%</span>
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
              {!p.isPopular && <span className={styles.standardBadge}>{p.badge}</span>}
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

      {/* 3. Social Proof: Trusted by Security Organizers & Developers */}
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

      {/* 4. Full Plan Comparison Matrix */}
      <section className={styles.comparisonSection}>
        <div className={styles.sectionHeaderWrap}>
          <div className={styles.sectionTag}>
            ACCESS MATRIX
          </div>
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
                <th className={styles.planColHead}>Community (Free)</th>
                <th className={`${styles.planColHead} ${styles.planColPopular}`}>
                  <div className={styles.popularTableBadge}>RECOMMENDED</div>
                  Individual Access
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonCategories.map((cat) => (
                <React.Fragment key={cat.title}>
                  <tr className={styles.categoryRow}>
                    <td colSpan="3" className={styles.categoryTitle}>
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
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Learner Testimonials */}
      <section className={styles.testimonialsSection}>
        <div className={styles.sectionHeaderWrap}>
          <div className={styles.sectionTag}>COMMUNITY PROOF</div>
          <h2 className={styles.sectionHeading}>Loved by Developers &amp; Security Researchers</h2>
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

      {/* 6. FAQ Section */}
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
            <Link href={`/checkout?plan=individual&cycle=${billingCycle}`} className={styles.bannerPrimaryBtn}>
              <span>Upgrade to Individual ({billingCycle === 'annual' ? '$9/mo' : '$12/mo'})</span>
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

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', padding: '120px 24px', textAlign: 'center', color: '#8c9ba8' }}>Loading pricing plans...</div>}>
      <SubscriptionContent />
    </Suspense>
  );
}
