import styles from './Loading.module.css';

// Shown while a page waits for its first data instead of rendering nothing,
// so a slow network reads as "loading", not as a broken blank page.
export function PageLoading({ label = 'Loading…' }) {
  return (
    <div className={styles.page} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function PageError({ message, onRetry }) {
  return (
    <div className={styles.page} role="alert">
      <span>{message}</span>
      {onRetry && <button type="button" className={styles.retry} onClick={onRetry}>Try again</button>}
    </div>
  );
}
