'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './Blog.module.css';

function CodeBlock({ children }) {
  const [copyState, setCopyState] = useState('Copy');
  const resetTimer = useRef();
  useEffect(() => () => clearTimeout(resetTimer.current), []);
  const rawText = String(children?.props?.children ?? '').replace(/\n$/, '');
  const language = children?.props?.className?.match(/language-([\w-]+)/)?.[1] || 'text';
  const codeLines = rawText.split('\n');

  async function handleCopy() {
    if (!rawText) return;
    try {
      await navigator.clipboard.writeText(rawText);
      setCopyState('Copied');
    } catch {
      setCopyState('Copy failed');
    }
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopyState('Copy'), 2000);
  }

  return (
    <div className={styles.codeBlock}>
      <div className={styles.terminalBar}>
        <div className={styles.codeLabel}><span aria-hidden="true">{'</>'}</span><span>{language === 'text' ? 'bash' : language}</span></div>
        <button type="button" onClick={handleCopy} aria-label={copyState === 'Copied' ? 'Copied' : 'Copy code'} title={copyState === 'Copied' ? 'Copied' : 'Copy code'} className={styles.copyButton}>
          <span className="material-symbols-outlined" aria-hidden="true">{copyState === 'Copied' ? 'check' : 'content_copy'}</span>
          <span>{copyState}</span>
        </button>
      </div>
      <pre tabIndex={0} aria-label={`${language} code`} data-lenis-prevent-horizontal><code>{codeLines.map((line, index) => {
        const commentAt = line.indexOf('#');
        return <span key={index}>{commentAt < 0 ? line : <>{line.slice(0, commentAt)}<span className={styles.codeComment}>{line.slice(commentAt)}</span></>}{index < codeLines.length - 1 ? '\n' : ''}</span>;
      })}</code></pre>
    </div>
  );
}

export default function BlogMarkdown({ content }) {
  return (
    <div className={styles.prose}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        h2: ({ node, children }) => <h2 id={`section-${node.position.start.line}`}>{children}</h2>,
        a: ({ href, children }) => <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}>{children}</a>,
        table: ({ children }) => <div className={styles.tableScroll} tabIndex={0} aria-label="Article table" role="region" data-lenis-prevent-horizontal><table>{children}</table></div>,
        pre: CodeBlock,
      }}>{content || ''}</ReactMarkdown>
    </div>
  );
}
