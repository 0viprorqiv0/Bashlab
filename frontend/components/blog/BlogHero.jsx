'use client';

import styles from './Blog.module.css';

export default function BlogHero({ searchQuery, setSearchQuery }) {
  return (
    <header className={styles.journalHeader}>
      <h1>Linux &amp; Shell Engineering Journal</h1>
      <div className={styles.searchBox}>
        <span className="material-symbols-outlined" aria-hidden="true">search</span>
        <input type="search" aria-label="Search articles" placeholder="Search a command, topic, or article…" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
      </div>
    </header>
  );
}
