'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './Markdown.module.css';

function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false);
  const text = String(children?.props?.children ?? '').replace(/\n$/, '');

  function copy() {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className={styles.codeBlock}>
      <pre>{children}</pre>
      <button type="button" className={styles.copy} onClick={copy} aria-label="Copy code">
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

// Raw HTML in lesson Markdown is not rendered (react-markdown default), so
// admin-authored content cannot inject scripts.
export default function Markdown({ children }) {
  return (
    <div className={styles.markdown}>
      <ReactMarkdown components={{ pre: CodeBlock }}>{children || ''}</ReactMarkdown>
    </div>
  );
}
