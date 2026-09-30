import Link from 'next/link';
import BrandLogo from '@/components/shared/BrandLogo';
import styles from './Auth.module.css';

export default function AuthShell({ children, title, description, demoNote }) {
  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <aside className={styles.story} aria-label="About BashLab">
          <div className={styles.storyRule} aria-hidden="true" />
          <p className={styles.storyTitle}>Learn Bash<br />by doing<span className={styles.storyPeriod}>.</span></p>
          <p className={styles.storyText}>Short lessons, hands-on practice, and clear feedback for every step.</p>
          <Link href="/" className={styles.storyLogo} aria-label="BashLab home"><BrandLogo /></Link>
        </aside>
        <section className={styles.formRegion} aria-labelledby="auth-title">
          <h1 id="auth-title" className={styles.title}>{title}</h1>
          <p className={styles.description}>{description}</p>
          {children}
          {demoNote && <p className={styles.demoNote}>{demoNote}</p>}
        </section>
      </div>
    </div>
  );
}
