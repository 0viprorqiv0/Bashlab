'use client';

import React from 'react';
import BrandLogo from '../shared/BrandLogo';
import styles from './Footer.module.css';

const columns = [
  {
    title: 'Curriculum',
    links: [
      ['All Courses', '/courses'],
      ['Shell 101', '/courses/shell-101'],
      ['My Learning', '/my-learning'],
    ],
  },
  {
    title: 'Resources',
    links: [
      ['Blog & Guides', '/blog'],
      ['How It Works', '/#learn'],
      ['Try a command', '/#try'],
      ['FAQ', '/#questions'],
    ],
  },
  {
    title: 'Platform',
    links: [
      ['GitHub Repo', 'https://github.com/0viprorqiv0/Bashlab'],
      ['GitHub / Feedback', 'https://github.com/0viprorqiv0/Bashlab/issues'],
    ],
  },
];

export default function Footer({ className = '' }) {
  const [email, setEmail] = React.useState('');
  const [message, setMessage] = React.useState('');

  const handleEasterEggClick = (event) => {
    event.preventDefault();
    try {
      sessionStorage.removeItem('bashlab:unveil_secret');
    } catch {}

    if (window.location.pathname === '/') {
      window.dispatchEvent(new CustomEvent('bashlab:activate_secret_quote'));
    } else {
      window.location.href = '/';
    }
  };

  const handleSubscribe = (event) => {
    event.preventDefault();
    setMessage('Newsletter signup is coming soon.');
  };

  return (
    <footer className={`${styles.footer} ${className}`.trim()} role="contentinfo">
      <div className={styles.grid}>
        <section className={styles.brand} aria-label="About BashLab">
          <a href="/" className={styles.logo} aria-label="BashLab home">
            <BrandLogo />
          </a>
          <p className={styles.description}>
            Interactive Linux &amp; Bash learning environment powered by isolated Docker sandboxes. Master shell commands by doing.
          </p>
          <div className={styles.statusList} aria-label="Sandbox status">
            <span className={styles.statusPill}><i aria-hidden="true" />Sandbox engine: operational</span>
            <span className={styles.statusPill}>Isolation: 512MB RAM / Container</span>
          </div>
        </section>

        {columns.map(({ title, links }) => (
          <nav className={styles.column} key={title} aria-label={title}>
            <h2>[{title}]</h2>
            {links.map(([label, href]) => (
              <a href={href} key={label} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined}>
                {label}
              </a>
            ))}
          </nav>
        ))}

        <div className={styles.newsletter}>
          <div className={styles.windowBar}>
            <span className={styles.windowDots}><i /><i /><i /></span>
            <span>bashlab-cli — newsletter &amp; updates</span>
          </div>
          <div className={styles.terminal}>
            <p><strong>learner</strong> @bashlab <b>~</b> <strong>$</strong> subscribe --email-updates --track=bash-pro</p>
            <form onSubmit={handleSubscribe}>
              <label className="visually-hidden" htmlFor="footer-email">Email address</label>
              <input
                id="footer-email"
                type="email"
                placeholder="enter_your_email@domain.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <button type="submit">[ EXECUTE ]</button>
            </form>
            {message && <p className={styles.message} role="status">{message}</p>}
          </div>
        </div>

        <div className={styles.copyright}>
          <span>© 2026 <a href="/" onClick={handleEasterEggClick}>BashLab</a>.</span>
          <span>Learn Bash by doing. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
