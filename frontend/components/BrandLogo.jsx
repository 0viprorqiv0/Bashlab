import styles from './BrandLogo.module.css';

export default function BrandLogo({ iconOnly = false }) {
  return (
    <span className={styles.logo} aria-hidden="true">
      <svg width="24" height="24" viewBox="0 0 104 104" fill="none">
        <rect x="2" y="2" width="100" height="100" rx="22" fill="#141820" stroke="#292e36" strokeWidth="4" />
        <path d="M30 35L51 52L30 69M58 69H79" stroke="#00ff66" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!iconOnly && <span className={styles.name}>Bash<span>Lab</span></span>}
    </span>
  );
}
