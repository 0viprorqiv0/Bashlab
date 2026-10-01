'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false);

  const codeElement = children;
  const rawText = String(codeElement?.props?.children ?? '').replace(/\n$/, '');
  const className = codeElement?.props?.className || '';
  const langMatch = className.match(/language-(\w+)/);
  const language = langMatch ? langMatch[1] : 'bash';

  const handleCopy = () => {
    if (!rawText) return;
    navigator.clipboard?.writeText(rawText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="my-6 rounded-lg overflow-hidden border border-slate-700/60 bg-[#0D1117] shadow-sm">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161B22] border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]/80 inline-block" />
          </div>
          <span className="ml-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {language}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
          aria-label="Copy code"
        >
          <span className="material-symbols-outlined text-[14px]">
            {copied ? 'check' : 'content_copy'}
          </span>
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Code Area */}
      <pre className="p-4 overflow-x-auto font-mono text-xs sm:text-sm text-slate-200 leading-relaxed scrollbar-thin">
        {codeElement}
      </pre>
    </div>
  );
}

export default function BlogMarkdown({ content }) {
  return (
    <div className="blog-prose font-sans text-slate-700 text-[15px] sm:text-base leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-10 mb-4 pb-3 border-b border-slate-200 font-sans tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-10 mb-4 pb-2 border-b border-slate-200 font-sans tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 mt-7 mb-3 font-sans">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-bold text-slate-800 mt-5 mb-2 font-sans">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-5 leading-relaxed text-slate-700 font-sans">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-6 mb-5 space-y-2 text-slate-700 font-sans">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 mb-5 space-y-2 text-slate-700 font-sans">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-6 border-l-4 border-[#0F766E] bg-teal-50/60 px-4 py-3.5 rounded-r-lg text-slate-700 text-sm sm:text-[15px] leading-relaxed font-sans shadow-sm">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-8 border-t border-slate-200" />
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="text-[#0F766E] hover:text-[#0D9488] font-semibold underline underline-offset-4 transition-colors"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-slate-900">
              {children}
            </strong>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-6 border border-slate-200 rounded-lg shadow-sm">
              <table className="w-full text-left border-collapse font-sans text-xs sm:text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-50 border-b border-slate-200">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-100">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-slate-50/50 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2.5 font-mono text-xs uppercase font-bold text-slate-700 border-r border-slate-200 last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2.5 text-slate-700 border-r border-slate-100 last:border-r-0">
              {children}
            </td>
          ),
          code: ({ node, className, children, ...props }) => {
            // Check if this is an inline code snippet (not inside pre)
            const isInline = !className && !String(children).includes('\n');
            if (isInline) {
              return (
                <code
                  className="font-mono text-xs sm:text-[13px] bg-slate-100 text-[#0F766E] px-1.5 py-0.5 rounded border border-slate-200/80 font-semibold"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          pre: CodeBlock
        }}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  );
}
