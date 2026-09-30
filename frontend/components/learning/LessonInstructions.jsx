'use client';

import { useState } from 'react';
import styles from './LessonInstructions.module.css';

function formatText(value = '') {
  return String(value).split(/(`[^`]+`)/g).map((part, index) => part.startsWith('`') && part.endsWith('`')
    ? <code className={styles.inlineCode} key={index}>{part.slice(1, -1)}</code> : part);
}

export default function LessonInstructions({ lesson, completedSteps = [], onToggleStep, done = false, preview = false }) {
  const content = lesson.lesson_content;
  const [copied, setCopied] = useState('');
  if (!content || content.version !== 1) return null;

  async function copyCode(value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      window.setTimeout(() => setCopied((current) => current === value ? '' : current), 1400);
    } catch { setCopied(''); }
  }

  return (
    <article className={`${styles.instructions} ${preview ? styles.preview : ''}`}>
      <header className={styles.header}>
        <h1>{lesson.title}</h1>
        <div className={styles.meta}>
          {content.track && <span>Track: <strong>{content.track}</strong></span>}
          {content.difficulty && <span>{content.difficulty}</span>}
          {content.short_objective && <p>{content.short_objective}</p>}
        </div>
      </header>

      {content.scenario && (
        <section className={styles.section} aria-labelledby="scenario-title">
          <h2 id="scenario-title">Mission Scenario</h2>
          <p>{formatText(content.scenario)}</p>
        </section>
      )}

      {content.steps?.length > 0 && (
        <section className={styles.section} aria-labelledby="objectives-title">
          <h2 id="objectives-title">Objective Tasks ({completedSteps.length} of {content.steps.length} completed)</h2>
          <ul className={styles.steps}>
            {content.steps.map((step, index) => {
              const checked = done || completedSteps.includes(step.id);
              return (
                <li key={step.id}>
                  <label>
                    <input type="checkbox" checked={Boolean(checked)} disabled={preview || !onToggleStep}
                      onChange={() => onToggleStep(step.id)} />
                    <span>Step {index + 1}: {formatText(step.text)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {content.command_syntax?.length > 0 && (
        <section className={styles.section} aria-labelledby="syntax-title">
          <h2 id="syntax-title">Command Syntax &amp; Usage</h2>
          <table className={styles.syntax}><tbody>
            {content.command_syntax.map((row, index) => (
              <tr key={`${row.command}-${index}`}><th scope="row"><code>{row.command}</code></th><td>{formatText(row.description)}</td></tr>
            ))}
          </tbody></table>
        </section>
      )}

      {content.examples?.length > 0 && (
        <section className={styles.section} aria-labelledby="examples-title">
          <h2 id="examples-title">Example Walkthrough</h2>
          {content.examples.map((example, index) => (
            <article className={styles.example} key={`${example.title}-${index}`}>
              <div className={styles.exampleHeader}><h3>{example.title}</h3><button type="button" onClick={() => copyCode(example.code)}>{copied === example.code ? 'Copied' : 'Copy'}</button></div>
              <pre><code>$ {example.code}</code></pre>
              <p>{formatText(example.explanation)}</p>
            </article>
          ))}
        </section>
      )}

      {content.hint && <details className={styles.hint}><summary>Hint</summary><p>{formatText(content.hint)}</p></details>}
      {content.solution_explanation && <details className={styles.hint}><summary>Solution walkthrough</summary><p>{formatText(content.solution_explanation)}</p></details>}
    </article>
  );
}
