'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './Markdown.module.css';

function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false);
  const text = String(children?.props?.children ?? '').replace(/\n$/, '');
  const language = children?.props?.className?.match(/language-([\w-]+)/)?.[1] || 'bash';

  function renderCode() {
    return text.split('\n').map((line, index, lines) => {
      const commentAt = line.indexOf('#');
      return <span key={index}>{commentAt < 0 ? line : <>{line.slice(0, commentAt)}<span className={styles.comment}>{line.slice(commentAt)}</span></>}{index < lines.length - 1 ? '\n' : ''}</span>;
    });
  }

  function copy() {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        <span className={styles.codeLanguage}><span aria-hidden="true">{'</>'}</span> {language}</span>
        <button type="button" className={styles.copy} onClick={copy} aria-label={copied ? 'Copied' : 'Copy code'} title={copied ? 'Copied' : 'Copy code'}>
          {copied ? '✓' : <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>}
        </button>
      </div>
      <pre aria-label={`${language} code`}><code>{renderCode()}</code></pre>
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
