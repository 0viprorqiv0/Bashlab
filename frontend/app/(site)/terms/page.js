import React from 'react';
import Link from 'next/link';
import styles from './terms.module.css';

export const metadata = {
  title: 'Terms & Conditions — BashLab',
  description: 'Terms of Service and Interactive Sandbox Usage Policy for BashLab.',
};

export default function TermsPage() {
  return (
    <div className={styles.pageWrapper}>
      <header className={styles.headerSection}>
        <span className={styles.badge}>LEGAL PROTOCOL // TERMS</span>
        <h1 className={styles.title}>Terms &amp; Conditions</h1>
        <div className={styles.metaText}>
          Version 1.2 · Effective October 2026 · Last updated: Oct 2, 2026
        </div>
      </header>

      <div className={styles.summaryBanner}>
        <span style={{ fontSize: 20 }}>🛡️</span>
        <div>
          <strong>Platform Notice:</strong> By accessing, signing up, or executing commands within BashLab interactive container sandboxes, you agree to be bound by these Terms of Service and Responsible Computing Guidelines.
        </div>
      </div>

      <main className={styles.contentBody}>
        {/* Section 1 */}
        <section className={styles.sectionBlock}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionNumber}>01</span>
            Acceptance of Platform Terms
          </h2>
          <p className={styles.sectionParagraph}>
            Welcome to BashLab. These Terms and Conditions (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User&quot;, &quot;Learner&quot;) and BashLab Interactive Learning Systems (&quot;BashLab&quot;, &quot;we&quot;, &quot;us&quot;).
          </p>
          <p className={styles.sectionParagraph}>
            If you do not agree with any provision stated herein, you must immediately cease accessing the platform and terminate any running container instances.
          </p>
        </section>

        {/* Section 2 */}
        <section className={styles.sectionBlock}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionNumber}>02</span>
            Interactive Sandbox &amp; Container Fair-Use Policy
          </h2>
          <p className={styles.sectionParagraph}>
            BashLab provisions isolated Linux environments designed exclusively for hands-on pedagogical practice, command line comprehension, and system administration training.
          </p>
          <ul className={styles.bulletList}>
            <li>
              <strong>No Malicious Activity:</strong> You shall not perform port scans, DDoS attacks, vulnerability exploitation against the host node, or outbound network intrusion tests from container shells.
            </li>
            <li>
              <strong>Prohibition of Crypto Mining:</strong> The execution of cryptocurrency miners, automated botnets, high-frequency scraping, or distributed stress tests is strictly forbidden and results in immediate permanent bans.
            </li>
            <li>
              <strong>Ephemeral Lifecycles:</strong> Free community sandboxes terminate after 15 minutes of inactivity. Persistent storage is only guaranteed under designated Pro Hacker tiers.
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className={styles.sectionBlock}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionNumber}>03</span>
            Account Registration &amp; Security Auditing
          </h2>
          <p className={styles.sectionParagraph}>
            Users must provide a valid email address and maintain confidentiality of authentication credentials. All administrative actions (role promotions, account locks, container terminations) are immutably logged in our internal audit repository.
          </p>
          <p className={styles.sectionParagraph}>
            BashLab administrators reserve the right to suspend or lock any account displaying suspicious activity or repeated container violations without prior notification.
          </p>
        </section>

        {/* Section 4 */}
        <section className={styles.sectionBlock}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionNumber}>04</span>
            Subscriptions, Quotas &amp; Billing
          </h2>
          <p className={styles.sectionParagraph}>
            Access to foundational curriculum tracks (Shell 101) is provided free of charge. Advanced specialized learning modules, persistent sandbox storage, and verified mastery certificates require an active Pro Hacker or Team subscription.
          </p>
          <p className={styles.sectionParagraph}>
            Subscriptions renew automatically according to the selected billing cycle unless cancelled prior to the renewal date via your account management panel.
          </p>
        </section>

        {/* Section 5 */}
        <section className={styles.sectionBlock}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionNumber}>05</span>
            Intellectual Property &amp; Course Materials
          </h2>
          <p className={styles.sectionParagraph}>
            All tutorial texts, interactive lab exercises, automated test verifiers, and user interface designs are the intellectual property of BashLab. You may not scrape, redistribute, or reproduce course syllabi without express written consent.
          </p>
        </section>

        {/* Section 6 */}
        <section className={styles.sectionBlock}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionNumber}>06</span>
            Disclaimer of Warranties &amp; Inquiries
          </h2>
          <p className={styles.sectionParagraph}>
            The service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. For legal questions, violation reporting, or clarification regarding container limits, please contact our security team at{' '}
            <a href="mailto:legal@bashlab.io" style={{ color: '#68dfa0', textDecoration: 'none' }}>
              legal@bashlab.io
            </a>
            .
          </p>
        </section>
      </main>

      <footer className={styles.footerRow}>
        <Link href="/" className={styles.backLink}>
          <span>←</span>
          <span>Return to Home</span>
        </Link>
        <span style={{ fontSize: 13, color: '#637180' }}>BashLab Security &amp; Legal Protocol</span>
      </footer>
    </div>
  );
}
