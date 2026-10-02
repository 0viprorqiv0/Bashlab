import React from 'react';
import Link from 'next/link';
import styles from './about.module.css';

export const metadata = {
  title: 'About — BashLab',
  description: 'Demystifying the Linux command line through interactive browser sandboxes and real test verification.',
};

export default function AboutPage() {
  return (
    <div className={styles.pageWrapper}>
      {/* Header section */}
      <header className={styles.headerSection}>
        <span className={styles.badge}>PLATFORM MANIFESTO // ABOUT</span>
        <h1 className={styles.title}>
          Demystifying Linux through <span className={styles.titleAccent}>real sandboxes</span>.
        </h1>
        <p className={styles.subtitle}>
          BashLab is an interactive learning platform engineered to help software developers, DevOps practitioners, and students master the UNIX terminal in isolated browser environments.
        </p>
      </header>

      {/* Mission statement */}
      <section className={styles.missionBox}>
        <div className={styles.missionHeading}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>terminal</span>
          Our Mission
        </div>
        <p className={styles.missionText}>
          Learning the command line shouldn&apos;t require wrestling with virtual machine setups, risky dual-boots, or static multiple-choice quizzes that don&apos;t reflect real production engineering. We believe muscle memory and deep confidence come from typing real commands and receiving immediate automated feedback on your system changes.
        </p>
      </section>

      {/* 3 Pillars */}
      <div className={styles.pillarsGrid}>
        <div className={styles.pillarCard}>
          <span className={styles.pillarIcon}>⚡</span>
          <h2 className={styles.pillarTitle}>Zero Setup Sandboxes</h2>
          <p className={styles.pillarDesc}>
            Spin up genuine Alpine &amp; Ubuntu container instances in under 2 seconds directly in your web browser. No Docker installation or SSH keys required.
          </p>
        </div>

        <div className={styles.pillarCard}>
          <span className={styles.pillarIcon}>🧪</span>
          <h2 className={styles.pillarTitle}>Real State Verification</h2>
          <p className={styles.pillarDesc}>
            Our verifier engines inspect filesystem changes, process trees, permissions, and exit codes. If your task was to configure an SSH daemon or pipe output, we verify the actual system state.
          </p>
        </div>

        <div className={styles.pillarCard}>
          <span className={styles.pillarIcon}>🛡️</span>
          <h2 className={styles.pillarTitle}>Cyber &amp; DevOps Ready</h2>
          <p className={styles.pillarDesc}>
            Progress seamlessly from basic file navigation (ls, cd, pwd) to shell scripting, text processing with sed and awk, and Linux security defense.
          </p>
        </div>
      </div>

      {/* Platform Specs Matrix */}
      <div className={styles.statsMatrix}>
        <div className={styles.statItem}>
          <div className={styles.statValue}>100%</div>
          <div className={styles.statLabel}>Real Linux Kernels</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>&lt; 2s</div>
          <div className={styles.statLabel}>Container Spin-up</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>120 FPS</div>
          <div className={styles.statLabel}>Smooth Interface</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>Zero</div>
          <div className={styles.statLabel}>Host Risk</div>
        </div>
      </div>

      {/* Story & Philosophy */}
      <section className={styles.storySection}>
        <h2 className={styles.storyTitle}>Built for Engineers, by Engineers</h2>
        <p className={styles.storyParagraph}>
          BashLab was created to bridge the gap between reading manual pages and comfortably troubleshooting production Linux clusters at 3 AM. Every lab is built around bite-sized, practical objectives designed to build genuine muscle memory.
        </p>
        <p className={styles.storyParagraph}>
          Whether you are preparing for certifications (LFCS, RHCSA, CompTIA Linux+) or just want to become faster and more autonomous in your day-to-day software development, BashLab provides the playground you need.
        </p>
      </section>

      {/* Call to action */}
      <div className={styles.ctaBox}>
        <h2 className={styles.ctaTitle}>Ready to command the terminal?</h2>
        <p className={styles.ctaSubtitle}>
          Start with our Shell 101 foundational tracks or explore our comprehensive catalog.
        </p>
        <div className={styles.ctaButtons}>
          <Link href="/courses" className={styles.primaryBtn}>
            <span>Explore Courses</span>
            <span>→</span>
          </Link>
          <Link href="/register" className={styles.secondaryBtn}>
            Create Free Account
          </Link>
        </div>
      </div>

      {/* Footer navigation */}
      <footer className={styles.footerRow}>
        <Link href="/" className={styles.backLink}>
          <span>←</span>
          <span>Return to Home</span>
        </Link>
        <span style={{ fontSize: 13, color: '#637180' }}>BashLab Interactive Systems</span>
      </footer>
    </div>
  );
}
