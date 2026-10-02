'use client';

import React from 'react';
import styles from './Footer.module.css';

export default function Footer({ className = '', isLanding = false }) {
  const handleEasterEggClick = (event) => {
    event.preventDefault();
    try {
      sessionStorage.removeItem('bashlab:unveil_secret');
    } catch {}

    if (typeof window !== 'undefined') {
      if (window.location.pathname === '/') {
        window.dispatchEvent(new CustomEvent('bashlab:activate_secret_quote'));
      } else {
        window.location.href = '/';
      }
    }
  };

  return (
    <footer
      className={`${styles.footer} ${isLanding ? styles.landingFooter : styles.standardFooter} ${className}`.trim()}
      role="contentinfo"
    >
      <div className={styles.inner}>
        <div className={styles.copyright}>
          <span>© 2026 <a href="/" onClick={handleEasterEggClick} className={styles.brandLink}>BashLab</a>. All rights reserved.</span>
        </div>
        <nav className={styles.nav} aria-label="Footer links">
          <a href="/terms" className={styles.link}>Terms &amp; Conditions</a>
          <a href="mailto:contact@bashlab.io" className={styles.link}>Contact</a>
          <a href="/about" className={styles.link}>About</a>
        </nav>
      </div>
    </footer>
  );
}
