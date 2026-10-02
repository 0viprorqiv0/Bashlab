'use client';

import styles from './Blog.module.css';

export default function BlogHero({ searchQuery, setSearchQuery }) {
  return (
    <header className={styles.hero}>
      <div className={styles.heroLayout}>
        <div className={styles.heroCopy}>
          <h1>Linux &amp; Shell<br /><span>Engineering Journal</span><span className={styles.cursor} aria-hidden="true" /></h1>
          <p>Technical papers, system administration guides, and practical command line research.</p>
          <div className={styles.searchBox}>
            <span className="material-symbols-outlined" aria-hidden="true">search</span>
            <input type="search" aria-label="Search articles" placeholder="Search a command, topic, or article…" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
          </div>
        </div>
        <div className={styles.heroTerminal} aria-label="Example Linux terminal session">
          <div className={styles.terminalBar}>
            <span className={styles.terminalDots} aria-hidden="true"><i /><i /><i /></span>
            <span>learner@bashlab: ~</span>
            <span className="material-symbols-outlined" aria-hidden="true">terminal</span>
          </div>
          <div className={styles.terminalBody}>
            <p><span>~ $</span> whoami</p>
            <p className={styles.terminalOutput}>the next Linux engineer</p>
            <p><span>~ $</span> cat journal.md</p>
            <p className={styles.terminalComment}># Learn the shell. Understand the system.</p>
            <p className={styles.terminalOutput}>Linux basics · Shell scripting<br />Security · Tips &amp; tricks</p>
            <p><span>~ $</span> <span className={styles.terminalCursor} aria-hidden="true" /></p>
          </div>
          <div className={styles.terminalStatus}><span>bash</span><span>Illustrative shell session</span></div>
        </div>
      </div>
    </header>
  );
}
