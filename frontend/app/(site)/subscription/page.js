'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './subscription.module.css';

// Animated Rolling Number Component (TryHackMe Style Reel Transition)
function AnimatedPrice({ value, currency = '$' }) {
  return (
    <div className={styles.animatedPriceContainer}>
      <span className={styles.currencySymbol}>{currency}</span>
      <span key={value} className={styles.animatedPriceValue}>
        {value}
      </span>
    </div>
  );
}

function SubscriptionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Mode: 'individual' | 'business'
  const initialView = searchParams.get('view') === 'business' ? 'business' : 'individual';
  const [view, setView] = useState(initialView);
  
  // Billing: 'annual' | 'monthly'
  const [billingCycle, setBillingCycle] = useState('annual');
  
  // FAQ accordion
  const [openFaq, setOpenFaq] = useState(0);

  // Sync view mode with URL without full page reload
  const handleViewChange = (newView) => {
    setView(newView);
    const url = new URL(window.location.href);
    url.searchParams.set('view', newView);
    window.history.replaceState({}, '', url.toString());
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? -1 : index);
  };

  // --- PLANS DATA ---

  // Individual plans
  const individualPlans = [
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
      href: '/checkout?plan=individual',
    },
    {
      name: 'Team & University',
      badge: 'FOR TEAMS',
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
      cta: 'View Business Plans',
      isPopular: false,
      onClick: () => handleViewChange('business'),
    },
  ];

  // Business plans
  const businessPlans = [
    {
      name: 'Team Starter',
      badge: '5 – 20 SEATS',
      price: billingCycle === 'annual' ? '24' : '29',
      period: 'per seat / month, billed annually',
      savings: billingCycle === 'annual' ? 'Save $60/seat per year' : null,
      desc: 'Equip your engineering or security team with dedicated root sandboxes and cohort analytics.',
      features: [
        'Full Individual Access for all assigned members',
        'Centralized team admin dashboard & license management',
        'Cohort progress & skill assessment reports',
        'Shared scenario workspaces & team leaderboards',
        'Priority runner queue on dedicated cluster',
        'Standard business support with < 24h SLA',
      ],
      notIncluded: [
        'Custom VPC Peering & On-Prem Deployment',
        'Custom interactive CTF authoring tools',
        'LMS (Canvas / Blackboard) integration',
      ],
      cta: 'Start Team Trial',
      isPopular: false,
      href: '/checkout?plan=team',
    },
    {
      name: 'Business Pro',
      badge: 'RECOMMENDED FOR TEAMS',
      price: billingCycle === 'annual' ? '42' : '49',
      period: 'per seat / month (20 – 100 seats)',
      savings: billingCycle === 'annual' ? 'Save $84/seat per year' : null,
      desc: 'Advanced security posture training with SSO, custom interactive scenarios, and deep skill telemetry.',
      features: [
        'Everything in Team Starter tier',
        'Single Sign-On (SAML 2.0 / Okta / Azure AD / Google Workspace)',
        'Custom scenario & internal CTF authoring builder',
        'Automated executive compliance & skill gap reports (CSV/PDF)',
        'Dedicated isolated Docker runner nodes with custom tools',
        'Dedicated Technical Account Manager & 99.98% uptime SLA',
        'Team office hours & live quarterly CTF tournaments',
      ],
      notIncluded: [],
      cta: 'Get Started with Pro',
      isPopular: true,
      href: '/checkout?plan=business_pro',
    },
    {
      name: 'Enterprise & Academic',
      badge: 'CUSTOM SCALE',
      price: 'Custom',
      period: 'tailored for 100+ seats & universities',
      savings: 'Non-profit & University grants',
      desc: 'Tailored deployment with private cloud VPC peering, custom curriculum design, and LMS integration.',
      features: [
        'Unlimited team members with role-based governance',
        'Private Cloud / VPC Peering / On-Premise deploy options',
        'LTI 1.3 Canvas, Moodle & Blackboard LMS integration',
        'Bespoke cybersecurity curriculum tailored to your stack',
        '99.99% Enterprise Uptime SLA & 24/7 emergency response',
        'Co-branded university diplomas & institutional badges',
        'SOC 2 Type II & ISO 27001 audit support documentation',
      ],
      notIncluded: [],
      cta: 'Contact Enterprise Sales',
      isPopular: false,
      href: 'mailto:enterprise@bashlab.io?subject=BashLab%20Enterprise%20Inquiry',
    },
  ];

  // Active plans list based on tab
  const activePlans = view === 'individual' ? individualPlans : businessPlans;

  // --- COMPARISON MATRIX DATA ---

  // Standard comparison categories (shown for Individual)
  const baseComparisonCategories = [
    {
      title: 'Terminal & Infrastructure',
      features: [
        {
          name: 'In-Browser Linux Terminal Sandbox',
          col1: 'Ephemeral (15 min)',
          col2: 'Unlimited Persistent',
          col3: 'Unlimited Dedicated Pool',
        },
        {
          name: 'Root Privilege & Sudo Access',
          col1: 'User-level only',
          col2: 'Full root access',
          col3: 'Full root + Custom kernels',
        },
        {
          name: 'Persistent /home Storage',
          col1: 'None',
          col2: '10 GB SSD Storage',
          col3: '50 GB / Seat + Shared storage',
        },
        {
          name: 'Concurrent Lab Instances',
          col1: '1 Instance',
          col2: '3 Concurrent Instances',
          col3: '10+ Concurrent Instances',
        },
        {
          name: 'Container Spooling Speed',
          col1: 'Standard (~5s)',
          col2: 'Instant Zero-Wait (<1s)',
          col3: 'Dedicated Cluster Node',
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
          col3: 'Full access + Solutions',
        },
        {
          name: 'Shell 201: Automation & Scripting',
          col1: 'Preview first 3 labs',
          col2: 'Full access (24 labs)',
          col3: 'Full access + Custom modules',
        },
        {
          name: 'Linux Security & Exploitation CTFs',
          col1: 'Community CTFs only',
          col2: '40+ Live-Fire Scenarios',
          col3: 'All + Private CTF Hosting',
        },
        {
          name: 'AI Terminal Assistant & Hint Engine',
          col1: 'Basic hints',
          col2: 'Detailed debugging & hints',
          col3: 'Dedicated mentor queue',
        },
      ],
    },
    {
      title: 'Credentials & Analytics',
      features: [
        {
          name: 'Verifiable Certificate of Mastery',
          col1: '✕',
          col2: '✓ Shareable on LinkedIn & CV',
          col3: '✓ Co-branded Institutional',
        },
        {
          name: 'Skill Telemetry & Mastery Graph',
          col1: 'Basic points',
          col2: 'Full competency matrix',
          col3: 'Manager dashboard & export',
        },
        {
          name: 'Community & Office Hours',
          col1: 'Public Discord',
          col2: 'VIP Lounge & Office Hours',
          col3: 'Private Team channel',
        },
      ],
    },
  ];

  // Extra categories added ONLY when in Business mode
  const businessSpecificCategories = [
    {
      title: 'Team Governance & Administration',
      isBusinessOnly: true,
      features: [
        {
          name: 'Single Sign-On (SAML / Okta / Azure AD)',
          col1: '✕',
          col2: '✓ Included (SAML 2.0)',
          col3: '✓ Custom IdP & SCIM Provisioning',
        },
        {
          name: 'Role-Based Access Control (RBAC)',
          col1: '✕',
          col2: 'Owner / Admin / Member',
          col3: 'Granular permissions & Custom roles',
        },
        {
          name: 'Consolidated Billing & Central Invoicing',
          col1: 'Individual receipts',
          col2: 'Single invoice / Credit card',
          col3: 'Net-30 Invoicing / Wire transfer / PO',
        },
        {
          name: 'LMS Integration (Canvas / Moodle / Blackboard)',
          col1: '✕',
          col2: '✕',
          col3: '✓ LTI 1.3 Certified Integration',
        },
      ],
    },
    {
      title: 'Enterprise Security, Isolation & SLA',
      isBusinessOnly: true,
      features: [
        {
          name: 'Private Cloud VPC Peering / On-Premise',
          col1: 'Public Cloud',
          col2: 'Dedicated Cluster Node',
          col3: '✓ Full VPC Peering / AWS / GCP / On-Prem',
        },
        {
          name: 'Custom Scenario & CTF Authoring Builder',
          col1: '✕',
          col2: '5 Custom Lab slots',
          col3: 'Unlimited Private Scenario Creator',
        },
        {
          name: 'SOC 2 Type II & Security Compliance Report',
          col1: 'Standard terms',
          col2: 'Self-serve security pack',
          col3: 'Full SOC 2 Type II, ISO 27001 & BAA',
        },
        {
          name: 'Service Level Agreement (SLA)',
          col1: 'Best effort',
          col2: '99.9% Uptime SLA',
          col3: '99.99% Financial-Backed SLA (24/7)',
        },
      ],
    },
  ];

  // Merge categories based on current view
  const comparisonCategories = view === 'business'
    ? [...baseComparisonCategories, ...businessSpecificCategories]
    : baseComparisonCategories;

  // Comparison table column headers
  const comparisonHeaders = view === 'individual'
    ? { col1: 'Community', col2: 'Individual', col3: 'Team & Uni', popularCol: 2 }
    : { col1: 'Individual', col2: 'Business Pro', col3: 'Enterprise & Academic', popularCol: 2 };

  // Testimonials
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

  // FAQs
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
      q: 'What payment methods are supported for individual and teams?',
      a: 'We support all major Credit & Debit cards (Visa, Mastercard, American Express), Apple Pay, Google Pay, PayPal, and instant bank transfers via VietQR. For Business and Enterprise tiers, we also support Net-30 invoicing, ACH, and wire transfers.',
    },
  ];

  return (
    <div className={styles.pageWrapper}>
      {/* 1. Header Section & Dual-Segment (Individual vs Business) */}
      <section className={styles.headerSection}>
        <div className={styles.topBadge}>
          <span className={styles.topBadgePulse} />
          <span>CYBERSECURITY &amp; LINUX TRAINING</span>
        </div>

        <h1 className={styles.title}>
          Invest in your <span className={styles.titleAccent}>Linux mastery</span>.
        </h1>
        <p className={styles.subtitle}>
          {view === 'individual'
            ? 'Whether you are taking your first steps in the shell or sharpening real-world DevOps & security skills, choose the tier that accelerates your ambitions.'
            : 'Upskill your engineering and security teams with scalable browser sandboxes, cohort analytics, and custom live-fire challenges.'}
        </p>

        {/* PRIMARY TOP SWITCHER: Individual vs Business (TryHackMe Style) */}
        <div className={styles.viewTabsWrapper}>
          <div className={styles.viewSegmentBox}>
            <button
              type="button"
              className={`${styles.viewTabBtn} ${view === 'individual' ? styles.viewTabBtnActive : ''}`}
              onClick={() => handleViewChange('individual')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>For Individuals</span>
            </button>

            <button
              type="button"
              className={`${styles.viewTabBtn} ${view === 'business' ? styles.viewTabBtnActive : ''}`}
              onClick={() => handleViewChange('business')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              <span>For Business &amp; Teams</span>
              <span className={styles.teamsTabTag}>PRO</span>
            </button>
          </div>
        </div>

        {/* SECONDARY SWITCHER: Monthly vs Annual (With Animated Price Numbers) */}
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

      {/* 2. Three Primary Pricing Cards with Animated Numbers */}
      <section className={styles.pricingGrid}>
        {activePlans.map((p) => (
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
                {p.price === 'Custom' ? (
                  <span className={styles.priceCustom}>Custom</span>
                ) : (
                  <AnimatedPrice value={p.price} />
                )}
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

            {p.onClick ? (
              <button
                type="button"
                onClick={p.onClick}
                className={`${styles.ctaBtn} ${p.isPopular ? styles.ctaBtnPopular : ''}`}
              >
                <span>{p.cta}</span>
                <span className={styles.ctaArrow}>→</span>
              </button>
            ) : (
              <Link
                href={p.href}
                className={`${styles.ctaBtn} ${p.isPopular ? styles.ctaBtnPopular : ''}`}
              >
                <span>{p.cta}</span>
                <span className={styles.ctaArrow}>→</span>
              </Link>
            )}
          </div>
        ))}
      </section>

      {/* 3. Social Proof: Trusted by Security Organizers & Universities */}
      <section className={styles.trustedSection}>
        <h2 className={styles.trustedTitle}>
          {view === 'individual'
            ? 'TRUSTED BY CTF ORGANIZERS, SECURITY CLUBS & DEVELOPERS WORLDWIDE'
            : 'TRUSTED BY ENTERPRISE SOC TEAMS, UNIVERSITIES & TECH ORGANIZATIONS'}
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

      {/* 4. Full Plan Comparison Matrix (Adds Business Sections When in Business View) */}
      <section className={styles.comparisonSection}>
        <div className={styles.sectionHeaderWrap}>
          <div className={styles.sectionTag}>
            {view === 'individual' ? 'ACCESS MATRIX' : 'ENTERPRISE ACCESS MATRIX'}
          </div>
          <h2 className={styles.sectionHeading}>
            Detailed Plan Comparison {view === 'business' && <span className={styles.headingBusinessTag}>(Business Edition)</span>}
          </h2>
          <p className={styles.sectionSub}>
            {view === 'individual'
              ? 'Explore every capability across our plans to choose the best configuration for your development environment.'
              : 'Compare team capabilities, administrative controls, VPC peering, and enterprise compliance.'}
          </p>
        </div>

        <div className={styles.tableScrollWrap}>
          <table className={styles.comparisonTable}>
            <thead>
              <tr>
                <th className={styles.featureColHead}>Capabilities &amp; Features</th>
                <th className={styles.planColHead}>{comparisonHeaders.col1}</th>
                <th className={`${styles.planColHead} ${styles.planColPopular}`}>
                  <div className={styles.popularTableBadge}>RECOMMENDED</div>
                  {comparisonHeaders.col2}
                </th>
                <th className={styles.planColHead}>{comparisonHeaders.col3}</th>
              </tr>
            </thead>
            <tbody>
              {comparisonCategories.map((cat) => (
                <React.Fragment key={cat.title}>
                  <tr className={`${styles.categoryRow} ${cat.isBusinessOnly ? styles.businessCategoryRow : ''}`}>
                    <td colSpan="4" className={styles.categoryTitle}>
                      <div className={styles.catTitleWrap}>
                        <span>{cat.title}</span>
                        {cat.isBusinessOnly && (
                          <span className={styles.businessOnlyBadge}>BUSINESS &amp; ENTERPRISE</span>
                        )}
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
                          feat.col3
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

      {/* 5. Learner Testimonials / Reviews */}
      <section className={styles.testimonialsSection}>
        <div className={styles.sectionHeaderWrap}>
          <div className={styles.sectionTag}>COMMUNITY PROOF</div>
          <h2 className={styles.sectionHeading}>Loved by Developers &amp; Security Teams</h2>
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
            Everything you need to know about billing, sandboxes, and enterprise security.
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
            {view === 'individual'
              ? 'Ready to conquer the Linux terminal?'
              : 'Ready to elevate your engineering team’s terminal skills?'}
          </h2>
          <p className={styles.ctaBannerDesc}>
            {view === 'individual'
              ? 'Join over 15,000 engineers and security researchers. Start free or jump straight into root sandboxes with Individual Access.'
              : 'Deploy hands-on Linux and security labs across your entire team in minutes with zero local configuration.'}
          </p>
          <div className={styles.ctaBannerBtns}>
            {view === 'individual' ? (
              <>
                <Link href="/checkout?plan=individual" className={styles.bannerPrimaryBtn}>
                  <span>Upgrade to Individual ($9/mo)</span>
                  <span>→</span>
                </Link>
                <Link href="/courses" className={styles.bannerSecondaryBtn}>
                  Explore Free Courses
                </Link>
              </>
            ) : (
              <>
                <Link href="/checkout?plan=team" className={styles.bannerPrimaryBtn}>
                  <span>Get Team Trial (From $24/seat)</span>
                  <span>→</span>
                </Link>
                <a href="mailto:enterprise@bashlab.io?subject=Schedule%20BashLab%20Demo" className={styles.bannerSecondaryBtn}>
                  Schedule Enterprise Demo
                </a>
              </>
            )}
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
