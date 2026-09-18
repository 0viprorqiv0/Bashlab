'use client';

import React, { useState, useRef, useEffect } from 'react';

const RESPONSES = {
  pwd: {
    out: '/bashlab',
    desc: 'pwd prints your current directory. This path belongs to the demo.',
  },
  ls: {
    out: 'about.txt   courses/   getting-started.txt',
    desc: 'ls lists entries in the demo root.',
  },
  whoami: {
    out: 'guest',
    desc: 'You are a curious learner. BashLab helps you turn that curiosity into command-line skills.',
  },
  help: {
    out: 'Available demo commands: pwd, ls, whoami, cat about.txt, courses, help, clear',
    desc: 'Simulated commands to explore how Bash interaction works.',
  },
  'cat about.txt': {
    out: 'BashLab provides short guided lessons, real browser practice, and requirement feedback.',
    desc: 'Displaying text file contents with cat.',
  },
  'cat getting-started.txt': {
    out: 'Browse courses -> open a course -> choose a lesson -> start practicing.',
    desc: 'Getting started guide loaded.',
  },
  courses: {
    out: 'Shell 101 — Bash Basics [Available now at /courses/shell-101]',
    desc: 'Explore the full course syllabus in the course section below.',
  },
};

const SUGGESTED_COMMANDS = ['pwd', 'ls', 'whoami', 'help'];

export default function TryCommand() {
  const [logEntries, setLogEntries] = useState([
    { type: 'info', content: '// Suggested command ready. Click below or press Enter to run:' },
    { type: 'prompt', cmd: 'pwd' },
    { type: 'output', content: '/bashlab' },
    { type: 'desc', content: 'pwd prints your current directory. This path belongs to the demo.' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [cmdHistory, setCmdHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const logRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [logEntries]);

  const executeCommand = (raw) => {
    const cmd = raw.trim();
    if (!cmd) return;

    setCmdHistory((prev) => [...prev, cmd]);
    setHistoryIdx(-1);

    if (cmd.toLowerCase() === 'clear') {
      setLogEntries([
        { type: 'info', content: '// Terminal cleared. Type pwd, help, or click a chip:' },
      ]);
      setInputValue('');
      return;
    }

    const newEntries = [
      ...logEntries,
      { type: 'prompt', cmd },
    ];

    const resObj = RESPONSES[cmd.toLowerCase()];
    if (resObj) {
      newEntries.push({ type: 'output', content: resObj.out });
      newEntries.push({ type: 'desc', content: resObj.desc });
    } else {
      newEntries.push({
        type: 'error',
        content: 'This demo supports a few commands. Type help to see them.',
      });
    }

    setLogEntries(newEntries);
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      executeCommand(inputValue);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIdx = historyIdx === -1 ? cmdHistory.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(nextIdx);
      setInputValue(cmdHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx === -1) return;
      const nextIdx = historyIdx + 1;
      if (nextIdx >= cmdHistory.length) {
        setHistoryIdx(-1);
        setInputValue('');
      } else {
        setHistoryIdx(nextIdx);
        setInputValue(cmdHistory[nextIdx]);
      }
    }
  };

  const handleChipClick = (cmd) => {
    executeCommand(cmd);
  };

  const handleClear = () => {
    executeCommand('clear');
  };

  const handleRunClick = () => {
    executeCommand(inputValue);
  };

  return (
    <section
      id="first-command"
      className="relative bg-[#141820] py-14 sm:py-16 border-t"
      style={{ borderColor: '#39434F' }}
      aria-labelledby="try-heading"
    >
      <div className="section-divider" style={{ backgroundColor: '#00FF66' }} aria-hidden="true" />

      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="section-label section-label-secondary">{'// 02 / TRY'}</span>
              <h2
                id="try-heading"
                className="heading-lg mt-3 mb-4"
              >
                Ask the terminal where you are.
              </h2>
              <p className="body-md max-w-[480px]">
                In the command line, every file you view and script you run depends on your current directory. Asking{' '}
                <code className="code-inline">pwd</code> (print working directory) gives you your immediate bearings before making changes.
              </p>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="font-code text-xs sm:text-sm text-outline leading-relaxed">
                You have seen a command. Next, learn when and why to use it.
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="w-full max-w-[640px] rounded-xl border border-white/10 bg-[#0B0F17] shadow-2xl overflow-hidden text-left ml-auto">
              <div className="px-4 py-2.5 bg-[#121622] border-b border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/70 shrink-0" aria-hidden="true" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/70 shrink-0" aria-hidden="true" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/70 shrink-0" aria-hidden="true" />
                  <span className="ml-2 font-code text-xs text-on-surface-variant truncate">guest@bashlab:~$</span>
                </div>
                <span className="font-code text-[11px] text-outline hidden sm:block shrink-0">Interactive demo — simulated commands, no real shell</span>
              </div>

              <div
                ref={logRef}
                className="p-5 font-code text-xs space-y-3 min-h-[170px] max-h-[260px] overflow-y-auto"
                role="log"
                aria-live="polite"
                aria-label="Terminal output"
              >
                {logEntries.map((entry, index) => (
                  <div
                    key={index}
                    className={`${entry.type === 'prompt' ? 'flex items-start gap-2 text-white' : ''} ${entry.type === 'output' ? 'pl-4 text-on-surface font-semibold text-white/90' : ''} ${entry.type === 'desc' ? 'pl-4 text-[11px] text-on-surface-variant border-l-2 leading-relaxed py-0.5' : ''} ${entry.type === 'error' ? 'pl-4 text-xs text-outline' : ''} ${entry.type === 'info' ? 'text-outline' : ''}`}
                    style={{
                      borderLeftColor: entry.type === 'desc' ? 'rgba(0, 255, 102, 0.4)' : 'transparent',
                    }}
                  >
                    {entry.type === 'prompt' ? (
                      <>
                        <span className="text-secondary font-semibold">guest@bashlab:~$ </span>
                        <span className="text-primary font-bold">{entry.cmd}</span>
                      </>
                    ) : (
                      entry.content
                    )}
                  </div>
                ))}
              </div>

              <div className="px-4 py-2 bg-[#0E121C] border-t border-white/10 flex items-center gap-2">
                <span className="text-secondary font-semibold shrink-0">guest@bashlab:~$</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type pwd, ls, whoami, help..."
                  spellCheck={false}
                  autoComplete="off"
                  className="w-full bg-transparent border-0 p-0 text-white font-code text-xs focus:ring-0 focus:outline-none placeholder:text-outline/50"
                  id="cmd-input"
                  aria-label="Command input"
                />
                <button
                  onClick={handleRunClick}
                  className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-code text-[11px] uppercase tracking-wider shrink-0 transition-colors focus-visible"
                  type="button"
                  aria-label="Run command"
                >
                  RUN
                </button>
              </div>

              <div className="px-4 py-2.5 bg-[#090C12] border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Suggested commands">
                  {SUGGESTED_COMMANDS.map((cmd) => (
                    <button
                      key={cmd}
                      onClick={() => handleChipClick(cmd)}
                      className={`chip ${cmd === 'pwd' ? 'chip-primary' : 'chip-ghost'}`}
                      style={{
                        borderColor: cmd === 'pwd' ? 'rgba(0, 255, 102, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                        backgroundColor: cmd === 'pwd' ? 'rgba(0, 255, 102, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      }}
                      aria-label={`Run ${cmd} command`}
                    >
                      {cmd === 'pwd' && (
                        <>
                          <span className="material-symbols-outlined text-sm">play_arrow</span>
                          <span>Run demo command: {cmd}</span>
                        </>
                      )}
                      {cmd !== 'pwd' && cmd}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleClear}
                  className="text-outline hover:text-white font-code text-[11px] uppercase tracking-wider transition-colors focus-visible"
                  type="button"
                  aria-label="Clear terminal"
                >
                  CLEAR
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}