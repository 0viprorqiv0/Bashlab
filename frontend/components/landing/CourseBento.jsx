'use client';

import { useRef, useState } from 'react';
import styles from './CourseBento.module.css';

const modules = [
  { title: 'Find your bearings.', name: 'Filesystem', accent: '#78cbd4', description: 'Know where you are. Find your way through folders and paths.', commands: ['pwd', 'ls -la', 'cd'], examples: [
    { command: 'pwd', output: '/home/learner', note: 'Your current working directory, printed as an absolute path.' },
    { command: 'ls -la', output: 'drwxr-xr-x  learner  .\ndrwxr-xr-x  learner  projects\n-rw-r--r--  learner  .bashrc', note: 'An illustrative listing, including hidden files and permissions.' },
    { command: 'cd projects && pwd', output: '/home/learner/projects', note: 'Change directory, then print the new location.' },
  ], skills: ['Read absolute paths', 'Inspect hidden files', 'Navigate directories'] },
  { title: 'Make it your own.', name: 'Directories & files', accent: '#68dfa0', description: 'Create a workspace. Organize files with a few deliberate commands.', commands: ['mkdir', 'touch', 'cp'], examples: [
    { command: 'mkdir notes && ls', output: 'notes/   projects/', note: 'mkdir creates a directory. ls lets you check the result.' },
    { command: 'touch notes/today.txt && ls notes', output: 'today.txt', note: 'Create an empty file inside the notes directory.' },
    { command: 'cp notes/today.txt notes/backup.txt && ls notes', output: 'backup.txt   today.txt', note: 'Copy a file while keeping the original.' },
  ], skills: ['Create directories', 'Create empty files', 'Copy files safely'] },
  { title: 'Connect the dots.', name: 'Search & pipes', accent: '#ecc37b', description: 'Find useful lines in text. Connect commands into a working pipeline.', commands: ['cat', 'grep', '|'], examples: [
    { command: 'cat status.txt', output: 'OK server started\nERROR connection lost\nOK retry complete', note: 'cat prints the contents of a file.' },
    { command: 'grep "ERROR" status.txt', output: 'ERROR connection lost', note: 'grep keeps only the lines matching your search.' },
    { command: 'grep "OK" status.txt | wc -l', output: '2', note: 'The pipe sends matching lines into wc, which counts them.' },
  ], skills: ['Read file contents', 'Filter matching lines', 'Combine commands'] },
];

const commandParts = [
  [
    [['pwd', 'Print working directory'], ['No arguments', 'Uses your current location']],
    [['ls', 'List directory contents'], ['-l', 'Show details'], ['-a', 'Include hidden files']],
    [['cd projects', 'Enter projects'], ['&&', 'Continue if successful'], ['pwd', 'Print the new location']],
  ],
  [
    [['mkdir notes', 'Create notes directory'], ['&&', 'Continue if successful'], ['ls', 'List the result']],
    [['touch notes/today.txt', 'Create file if missing'], ['&&', 'Continue if successful'], ['ls notes', 'List notes directory']],
    [['cp', 'Copy a file'], ['notes/today.txt', 'Source file'], ['notes/backup.txt', 'Destination file']],
  ],
  [
    [['cat', 'Print file contents'], ['status.txt', 'The file to read']],
    [['grep', 'Find matching lines'], ['"ERROR"', 'The search pattern'], ['status.txt', 'The file to search']],
    [['grep "OK" status.txt', 'Find matching lines'], ['|', 'Send output onward'], ['wc -l', 'Count the lines']],
  ],
];

export default function CourseBento({ onPractice }) {
  const [selected, setSelected] = useState(0);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [ran, setRan] = useState(false);
  const [runCount, setRunCount] = useState(0);
  const previewRef = useRef(null);
  const chapter = modules[selected];
  const example = chapter.examples[exampleIndex];
  const chooseModule = (index) => {
    setSelected(index); setExampleIndex(0); setRan(false);
    if (window.matchMedia('(max-width: 650px)').matches) {
      previewRef.current?.focus({ preventScroll: true });
      previewRef.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
  };

  return (
    <div className={styles.grid}>
      <article className={`${styles.card} ${styles.intro}`}>
        <div className={styles.meta}>BEGINNER TRACK <span>12 lessons · Est. 2h</span></div>
        <div>
          <span className={styles.shellMark} aria-hidden="true">&gt;_</span>
          <h3>Shell 101<span>Bash basics.<br />Real possibilities.</span></h3>
          <p>A path from your first command to navigating files and connecting tools.</p>
        </div>
        <div className={styles.introBottom}>
          <button className={styles.primary} onClick={() => { chooseModule(0); setRan(true); previewRef.current?.focus({ preventScroll: true }); }}>Preview your first command <span aria-hidden="true">↗</span></button>
          <span className={styles.small}>Free starter · Beginner-friendly</span>
        </div>
      </article>

      <article ref={previewRef} tabIndex={-1} className={`${styles.card} ${styles.preview}`} style={{ '--tile-accent': chapter.accent }}>
        <div className={styles.topline}><h3>Command preview</h3><span className={styles.small}>SIMULATED DEMO</span></div>
        <p>{chapter.description}</p>
        <div className={styles.commandPicker} role="group" aria-label="Choose an example command">
          {chapter.commands.map((command, index) => <button key={command} aria-pressed={exampleIndex === index} onClick={() => { setExampleIndex(index); setRan(false); }}>{command}</button>)}
        </div>
        <div className={styles.console}>
          <div className={styles.consoleBar}><span>learner@bashlab</span><span>bash</span></div>
          <code className={styles.command}><span aria-hidden="true">$ </span>{example.command}</code>
          <div className={styles.result} role="status" aria-live="polite">
            {ran ? <div key={`${selected}-${exampleIndex}-${runCount}`} className={styles.resultReveal}><pre>{example.output}</pre><p>{example.note}</p></div> : <p className={styles.ready}>Ready when you are. Run the example to see its output.</p>}
          </div>
        </div>
        <div className={styles.actions}><span className={styles.small}>Example output · No real shell</span><button className={styles.run} onClick={() => { setRan(true); setRunCount(value => value + 1); }}>{ran ? 'Run again' : 'Run example'} <span aria-hidden="true">↵</span></button></div>
      </article>

      <article className={`${styles.card} ${styles.anatomy}`} style={{ '--tile-accent': chapter.accent }}>
        <div className={styles.topline}><h3>Command anatomy</h3><span className={styles.small}>READ THE SYNTAX</span></div>
        <dl key={`${selected}-${exampleIndex}`} className={`${styles.parts} ${styles.resultReveal}`}>
          {commandParts[selected][exampleIndex].map(([token, meaning]) => <div key={token}><dt><code>{token}</code></dt><dd>{meaning}</dd></div>)}
        </dl>
      </article>

      {modules.map((item, index) => (
        <button key={item.name} className={`${styles.card} ${styles.module}`} style={{ '--tile-accent': item.accent }} aria-pressed={selected === index} aria-label={`Preview chapter ${index + 1}: ${item.name}`} onClick={() => chooseModule(index)}>
          <span className={styles.moduleTop}><span className={styles.number}>0{index + 1}</span><span>{selected === index ? 'SELECTED' : 'EXPLORE CHAPTER'} <span aria-hidden="true">↗</span></span></span>
          <strong>{item.title}</strong><span className={styles.moduleName}>{item.name}</span>
          <span className={styles.description}>{item.description}</span>
          <span className={styles.commandList}>{item.commands.map(command => <code key={command}>{command}</code>)}</span>
        </button>
      ))}

      <article className={`${styles.card} ${styles.skills}`}>
        <div><h3>What you’ll take with you</h3><p>Skills from the selected chapter.</p></div>
        <ul key={selected} className={styles.resultReveal}>{chapter.skills.map(skill => <li key={skill}><span aria-hidden="true">✓</span>{skill}</li>)}</ul>
      </article>
      <article className={`${styles.card} ${styles.practice}`}>
        <div><h3>Keep experimenting.</h3><p>Try commands in the interactive terminal demo.</p></div>
        <button className={styles.textButton} onClick={onPractice}>Open terminal demo <span aria-hidden="true">↗</span></button>
      </article>
    </div>
  );
}
