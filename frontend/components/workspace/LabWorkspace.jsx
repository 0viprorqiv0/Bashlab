'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './LabWorkspace.module.css';
import { useAuth } from '@/components/auth/AuthProvider';
import { authClient } from '@/lib/authClient';
import Markdown from '@/components/shared/Markdown';
import { PageError, PageLoading } from '@/components/shared/Loading';
import {
  fetchCourseWithLessons, fetchProgressMap, lessonHref, markLessonDone, markLessonStarted, toDisplayLab,
} from '@/lib/learning';
import {
  checkSolution, createSession, endSession, resetSession, runCommand,
} from '@/lib/sandbox';

const HOME = '/home/student';
const shortCwd = (cwd) => (cwd === HOME ? '~' : cwd?.startsWith(`${HOME}/`) ? `~${cwd.slice(HOME.length)}` : cwd || '~');

export default function LabWorkspace({ courseId = 'shell-101', labId }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState({ loading: true });
  const [attempt, setAttempt] = useState(0);

  // Load from the stored session immediately; the API identity check (useAuth)
  // runs in parallel and bounces to /login if it disagrees.
  useEffect(() => {
    if (!authLoading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [authLoading, user, pathname, router]);

  useEffect(() => {
    const userId = authClient.peekUserId();
    if (!userId) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        // Course + lessons and progress in parallel instead of one after another.
        const [course, progressMap] = await Promise.all([fetchCourseWithLessons(courseId), fetchProgressMap(userId)]);
        const labs = course?.lessons || [];
        const index = labs.findIndex((item) => item.slug === labId);
        if (cancelled) return;
        if (index === -1) {
          setState({ loading: false, notFound: true });
          return;
        }
        setState({ loading: false, labs, index, progressMap, userId });
        // Recording "started" must not hold up the page.
        markLessonStarted(userId, labs[index].id).then(() => {});
      } catch (error) {
        if (!cancelled) setState({ loading: false, error: error.message });
      }
    })();
    return () => { cancelled = true; };
  }, [courseId, labId, pathname, router, attempt]);

  if (state.loading) return <PageLoading label="Opening lab…" />;
  if (state.error) return <PageError message={`Could not load this lab: ${state.error}`} onRetry={() => { setState({ loading: true }); setAttempt((n) => n + 1); }} />;
  if (state.notFound) {
    return (
      <div className={styles.workspacePage}>
        <p style={{ padding: 32, color: '#eef1ef' }}>
          Lab not found. <Link href={`/courses/${courseId}`}>Back to {courseId}</Link>
        </p>
      </div>
    );
  }
  return <Workspace key={state.labs[state.index].id} courseId={courseId} user={{ id: state.userId }} {...state} />;
}

function Workspace({ courseId, user, labs, index, progressMap }) {
  const currentLab = toDisplayLab(labs[index], progressMap);
  const totalLabs = labs.length;

  // Active tab on left pane
  const [activeTab, setActiveTab] = useState('instructions');

  // Completed steps checklist
  const [completedSteps, setCompletedSteps] = useState(() => (
    currentLab.status === 'solved' ? (currentLab.steps || []).map((s) => s.id) : []
  ));

  const [isLabSolved, setIsLabSolved] = useState(currentLab.status === 'solved');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState('');

  const terminal = useSandbox(user, currentLab);
  const instanceStatus = terminal.status === 'ready' ? 'running' : terminal.status === 'connecting' ? 'restarting' : 'stopped';

  useEffect(() => {
    setShowHint(false);
  }, [currentLab.id]);

  // Red button: Stop / Toggle instance
  function handleToggleStopInstance() {
    if (instanceStatus === 'running' || instanceStatus === 'restarting') {
      terminal.stop();
    } else {
      terminal.retry();
    }
  }

  // Yellow button: Restart instance — resets the sandbox filesystem, keeps the session.
  function handleRestartInstance() {
    terminal.reset();
  }

  // Green button: Maximize / Minimize
  function handleToggleMaximize() {
    setIsMaximized((prev) => !prev);
  }

  // Close maximize on Escape key
  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if (e.key === 'Escape' && isMaximized) {
        setIsMaximized(false);
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isMaximized]);

  function formatInlineCode(text) {
    if (!text) return null;
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index}>{part.slice(1, -1)}</code>;
      }
      return part;
    });
  }

  // Terminal input state (pure UI — the sandbox session itself lives in `terminal`)
  const [terminalInput, setTerminalInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cmdHistory, setCmdHistory] = useState([]);
  const currentDir = terminal.cwd;
  const terminalLogs = terminal.log;

  const terminalEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  // Focus input on click anywhere in terminal
  function focusTerminal() {
    inputRef.current?.focus();
  }

  async function complete() {
    const { error } = await markLessonDone(user.id, currentLab.id);
    if (error) {
      setCheckMessage(error.message);
      return false;
    }
    setIsLabSolved(true);
    return true;
  }

  // Without a reachable sandbox (not configured on this machine, or offline)
  // an automatic check is impossible; the learner may complete it by hand, as
  // before the lab redesign. Progress is not anti-cheat protected anyway.
  const sandboxDown = terminal.status === 'disabled' || terminal.status === 'offline';
  const autoCheck = Boolean(currentLab.verifier) && !sandboxDown;

  // Toggle step completion manually — only used for labs without an automatic
  // check; ticking every step marks the lab solved for real.
  async function toggleStep(stepId) {
    const next = completedSteps.includes(stepId)
      ? completedSteps.filter((id) => id !== stepId)
      : [...completedSteps, stepId];
    setCompletedSteps(next);
    if (!autoCheck && currentLab.steps.length && next.length === currentLab.steps.length) {
      await complete();
    }
  }

  // Check Solution — real sandbox check when the lesson has a verifier and the
  // sandbox is up; otherwise ticks every step and records completion directly.
  async function handleCheckSolution() {
    if (checking) return;
    setChecking(true);
    setCheckMessage('');
    try {
      if (autoCheck) {
        if (!terminal.sessionId) {
          setCheckMessage('The sandbox is still starting — try again in a moment.');
          return;
        }
        const result = await checkSolution(terminal.sessionId, currentLab.verifier);
        if (result.passed) {
          setCompletedSteps(currentLab.steps.map((s) => s.id));
          await complete();
        } else {
          const failed = result.checks.filter((c) => !c.passed).map((c) => c.name).join('; ');
          setCheckMessage(`Not quite yet — ${failed || 'some checks did not pass'}.`);
        }
      } else {
        setCompletedSteps(currentLab.steps.map((s) => s.id));
        await complete();
      }
    } catch (error) {
      setCheckMessage(error.message);
    } finally {
      setChecking(false);
    }
  }

  // Copy code snippet helper — remembers which snippet was copied so only
  // that one flips to "Copied".
  function handleCopy(text, key) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedCode(key);
      setTimeout(() => setCopiedCode((current) => (current === key ? false : current)), 2000);
    }
  }

  // Command execution — runs for real in the sandbox; matches completed steps
  // against the real command text as before.
  function handleCommandSubmit(e) {
    e.preventDefault();
    const rawCmd = terminalInput.trim();
    if (!rawCmd) return;
    setCmdHistory((prev) => [...prev, rawCmd]);
    setHistoryIndex(-1);
    setTerminalInput('');

    if (currentLab.steps.length) {
      // target_cmd is optional in lesson_content; steps without one are ticked by hand.
      const newlyDone = currentLab.steps
        .filter((step) => step.targetCmd && rawCmd.toLowerCase().includes(step.targetCmd.toLowerCase()))
        .map((step) => step.id)
        .filter((id) => !completedSteps.includes(id));
      if (newlyDone.length) setCompletedSteps((prev) => [...prev, ...newlyDone]);
    }

    terminal.run(rawCmd);
  }

  // Handle arrow up / arrow down command history
  function handleKeyDown(e) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIndex = historyIndex === -1 ? cmdHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setTerminalInput(cmdHistory[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cmdHistory.length === 0 || historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= cmdHistory.length) {
        setHistoryIndex(-1);
        setTerminalInput('');
      } else {
        setHistoryIndex(nextIndex);
        setTerminalInput(cmdHistory[nextIndex]);
      }
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      terminal.clear();
    }
  }

  // Fill terminal input with quick chip command
  function handleQuickCommand(cmdText) {
    setTerminalInput(cmdText);
    inputRef.current?.focus();
  }

  const prevLab = labs[index - 1] || null;
  const nextLab = labs[index + 1] || null;

  return (
    <div className={styles.workspacePage} data-lenis-prevent="true">
      {/* Top Workspace Header Bar */}
      <header className={styles.topBar}>
        <div className={styles.topLeft}>
          <Link href={`/courses/${courseId}`} className={styles.backBtn}>
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>{courseId}</span>
          </Link>

          <div className={styles.courseDivider} />

          <div className={styles.labNavGroup}>
            <Link
              href={prevLab ? lessonHref(courseId, prevLab.slug) : '#'}
              className={styles.navArrowBtn}
              aria-disabled={!prevLab}
              title={prevLab ? `Previous: ${prevLab.title}` : 'First Lab'}
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </Link>

            <span className="font-code text-xs text-on-surface-variant font-medium">
              {index + 1} / {totalLabs}
            </span>

            <Link
              href={nextLab ? lessonHref(courseId, nextLab.slug) : '#'}
              className={styles.navArrowBtn}
              aria-disabled={!nextLab}
              title={nextLab ? `Next: ${nextLab.title}` : 'Last Lab'}
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </Link>
          </div>

          <h1 className={styles.labTitleHeader}>
            Lab #{index + 1}: {currentLab.title}
          </h1>

          {currentLab.difficulty && (
            <span
              className={`${styles.diffBadge} ${
                currentLab.difficulty === 'Easy'
                  ? styles.diffEasy
                  : currentLab.difficulty === 'Medium'
                  ? styles.diffMedium
                  : styles.diffHard
              }`}
            >
              {currentLab.difficulty}
            </span>
          )}
        </div>

        <div className={styles.topRight}>
          {isLabSolved && (
            <span className={styles.solvedBadge}>
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Completed
            </span>
          )}

          <button
            type="button"
            className={styles.checkSolutionBtn}
            onClick={handleCheckSolution}
            disabled={checking || isLabSolved || (autoCheck && !terminal.sessionId)}
            title="Validate completed tasks and check solution"
          >
            <span className="material-symbols-outlined">verified</span>
            <span>{checking ? 'Checking…' : isLabSolved ? 'Completed' : autoCheck ? 'Check Solution' : 'Mark as complete'}</span>
          </button>
        </div>
      </header>

      {/* 50 / 50 Split Layout */}
      <div className={styles.splitLayout}>
        {/* LEFT HALF: Problem Statement & Instructions */}
        <section className={styles.leftPane} data-lenis-prevent="true" aria-label="Problem statement and instructions">
          {/* Tabs */}
          <div className={styles.paneTabs}>
            <button
              type="button"
              className={`${styles.paneTab} ${activeTab === 'instructions' ? styles.paneTabActive : ''}`}
              onClick={() => setActiveTab('instructions')}
            >
              <span className="material-symbols-outlined">menu_book</span>
              <span>Instructions</span>
            </button>

            <button
              type="button"
              className={`${styles.paneTab} ${activeTab === 'solution' ? styles.paneTabActive : ''}`}
              onClick={() => setActiveTab('solution')}
            >
              <span className="material-symbols-outlined">lightbulb</span>
              <span>Solution Walkthrough</span>
            </button>
          </div>

          {/* Instructions Content */}
          <div className={styles.instructionsScroll} data-lenis-prevent="true">
            {activeTab === 'instructions' ? (
              <>
                <div className={styles.sectionHeader}>
                  <div className={styles.labNumber}>Interactive Terminal Lab · {courseId}</div>
                  <h2 className={styles.labTitle}>{currentLab.title}</h2>
                  <div className={styles.metaRow}>
                    <span>Track: <strong>{currentLab.category}</strong></span>
                    <span>·</span>
                    <span>Grading: <strong>{autoCheck ? 'Automatic' : currentLab.verifier ? 'Manual (sandbox unavailable)' : 'Manual'}</strong></span>
                  </div>
                </div>

                {checkMessage && !isLabSolved && (
                  <p role="alert" style={{ color: '#ff8a80', fontSize: 13, margin: '0 0 16px' }}>{checkMessage}</p>
                )}

                {/* Legacy Markdown lesson (no lesson_content yet) */}
                {!currentLab.structured && (
                  <div className={styles.scenarioCard}>
                    {currentLab.contentMd
                      ? <Markdown>{currentLab.contentMd}</Markdown>
                      : <p className={styles.scenarioText}>This lesson has no written instructions yet.</p>}
                    {currentLab.objectives.length > 0 && (
                      <ul style={{ margin: '12px 0 0', paddingLeft: 18 }}>
                        {currentLab.objectives.map((item) => <li key={item}>{formatInlineCode(item)}</li>)}
                      </ul>
                    )}
                  </div>
                )}

                {/* Scenario / Story */}
                {currentLab.scenario && (
                  <div className={styles.scenarioCard}>
                    <div className={styles.scenarioTitle}>Mission Scenario</div>
                    <p className={styles.scenarioText}>{formatInlineCode(currentLab.scenario)}</p>
                  </div>
                )}

                {/* Checklist Steps */}
                {currentLab.steps.length > 0 && (
                <h3 className={styles.subSectionTitle}>
                  <span className="material-symbols-outlined">checklist</span>
                  <span>Objective Tasks ({completedSteps.length} of {currentLab.steps.length} completed)</span>
                </h3>
                )}

                <div className={styles.stepList}>
                  {(currentLab.steps || []).map((step, idx) => {
                    const isDone = completedSteps.includes(step.id);
                    return (
                      <div
                        key={step.id}
                        className={`${styles.stepItem} ${isDone ? styles.stepItemCompleted : ''}`}
                        onClick={() => toggleStep(step.id)}
                      >
                        <span
                          className={`material-symbols-outlined ${styles.stepCheckIcon} ${
                            isDone ? styles.stepCheckIconDone : ''
                          }`}
                        >
                          {isDone ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                        <div className={styles.stepText}>
                          <strong>Step {idx + 1}:</strong> {formatInlineCode(step.text)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Command Syntax Table */}
                {currentLab.commandSyntax.length > 0 && (<>
                <h3 className={styles.subSectionTitle}>
                  <span className="material-symbols-outlined">code</span>
                  <span>Command Syntax &amp; Usage</span>
                </h3>

                <table className={styles.syntaxTable}>
                  <tbody>
                    {(currentLab.commandSyntax || []).map((item, i) => (
                      <tr key={i}>
                        <td className={styles.syntaxCmd}>
                          <code>{item.cmd}</code>
                        </td>
                        <td className={styles.syntaxDesc}>{formatInlineCode(item.desc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </>)}

                {/* Examples */}
                {currentLab.examples.length > 0 && (
                <h3 className={styles.subSectionTitle}>
                  <span className="material-symbols-outlined">terminal</span>
                  <span>Example Walkthrough</span>
                </h3>
                )}

                {(currentLab.examples || []).map((ex, i) => (
                  <div key={i} className={styles.codeCard}>
                    <div className={styles.codeCardHeader}>
                      <span>{ex.title}</span>
                      <button
                        type="button"
                        className={styles.copyCodeBtn}
                        onClick={() => handleCopy(ex.code, i)}
                        title="Copy command to clipboard"
                      >
                        <span className="material-symbols-outlined text-xs">
                          {copiedCode === i ? 'check' : 'content_copy'}
                        </span>
                        <span>{copiedCode === i ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className={styles.codeCardBody}>
                      <code>$ {ex.code}</code>
                    </div>
                    <div className={styles.codeExplanation}>{formatInlineCode(ex.explanation)}</div>
                  </div>
                ))}

                {/* Interactive Hint Option */}
                {currentLab.hint && (
                  <div className={`${styles.hintBox} ${showHint ? styles.hintBoxOpen : ''}`}>
                    <button
                      type="button"
                      className={styles.hintToggleBtn}
                      onClick={() => setShowHint((prev) => !prev)}
                      aria-expanded={showHint}
                    >
                      <div className={styles.hintToggleLeft}>
                        <span className={`material-symbols-outlined ${styles.hintIcon}`}>lightbulb</span>
                        <span className={styles.hintTitle}>Need a Hint?</span>
                        <span className={styles.hintBadge}>
                          {showHint ? 'Hide Hint' : 'Click to reveal'}
                        </span>
                      </div>
                      <span
                        className={`material-symbols-outlined ${styles.hintChevron} ${
                          showHint ? styles.hintChevronOpen : ''
                        }`}
                      >
                        expand_more
                      </span>
                    </button>

                    {showHint && (
                      <div className={styles.hintContent}>
                        <p className={styles.hintText}>{formatInlineCode(currentLab.hint)}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Completion Celebration Banner */}
                {isLabSolved && (
                  <div className={styles.successBanner}>
                    <div className={styles.successLeft}>
                      <span className={`material-symbols-outlined ${styles.successIcon}`}>
                        verified
                      </span>
                      <div>
                        <h4 className={styles.successTitle}>Lab Objectives Completed!</h4>
                        <p className={styles.successDesc}>
                          Great job! You have mastered the core concepts of this challenge.
                        </p>
                      </div>
                    </div>
                    {nextLab && (
                      <Link href={lessonHref(courseId, nextLab.slug)} className={styles.nextLabBtn}>
                        <span>Next Lab</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </Link>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Solution Walkthrough Tab */
              <div>
                <div className={styles.sectionHeader}>
                  <div className={styles.labNumber}>Solution Guide</div>
                  <h2 className={styles.labTitle}>Detailed Solution &amp; Deep Dive</h2>
                </div>

                <div className={styles.scenarioCard}>
                  <div className={styles.scenarioTitle}>POSIX Architecture Notes</div>
                  <p className={styles.scenarioText}>
                    {currentLab.solutionExplanation ? formatInlineCode(currentLab.solutionExplanation) : 'No solution walkthrough has been written for this lab yet.'}
                  </p>
                </div>

                {currentLab.steps.some((step) => step.targetCmd) && (
                  <h3 className={styles.subSectionTitle}>
                    <span className="material-symbols-outlined">check_circle</span>
                    <span>Reference Command Sequence</span>
                  </h3>
                )}

                {currentLab.steps.filter((step) => step.targetCmd).map((step) => (
                  <div key={step.id} className={styles.codeCard}>
                    <div className={styles.codeCardHeader}>
                      <span>Step {currentLab.steps.indexOf(step) + 1} Solution</span>
                    </div>
                    <div className={styles.codeCardBody}>
                      <code>$ {step.targetCmd}</code>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT HALF: Terminal Sandbox */}
        <section
          className={`${styles.rightPane} ${isMaximized ? styles.rightPaneMaximized : ''}`}
          data-lenis-prevent="true"
          onClick={focusTerminal}
          aria-label="Interactive terminal shell"
        >
          {/* Terminal Window Header */}
          <div className={styles.termHeader}>
            <div className={styles.termDots} role="group" aria-label="Terminal instance controls">
              {/* Red Dot: Stop Instance */}
              <button
                type="button"
                className={styles.termCtl}
                title={instanceStatus === 'stopped' ? 'Start Instance' : 'Stop / Turn off Instance'}
                aria-label={instanceStatus === 'stopped' ? 'Start Instance' : 'Stop Instance'}
                onClick={handleToggleStopInstance}
              >
                <span className={styles.termDot} style={{ background: '#ff5f56' }}>
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M3 3l6 6M9 3l-6 6" />
                  </svg>
                </span>
              </button>

              {/* Yellow Dot: Restart Instance */}
              <button
                type="button"
                className={styles.termCtl}
                title="Restart Instance"
                aria-label="Restart Instance"
                onClick={handleRestartInstance}
              >
                <span className={styles.termDot} style={{ background: '#ffbd2e' }}>
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M2.5 6h7" />
                  </svg>
                </span>
              </button>

              {/* Green Dot: Maximize / Minimize Instance */}
              <button
                type="button"
                className={styles.termCtl}
                title={isMaximized ? 'Restore Split View (Esc)' : 'Maximize Terminal'}
                aria-label={isMaximized ? 'Restore Split View' : 'Maximize Terminal'}
                onClick={handleToggleMaximize}
              >
                <span className={styles.termDot} style={{ background: '#27c93f' }}>
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    {isMaximized ? (
                      <path d="M4 1.5v3H1M8 1.5v3h3M4 10.5v-3H1M8 10.5v-3h3" />
                    ) : (
                      <path d="M7.3 2H10v2.7M10 7.3V10H7.3M4.7 10H2V7.3M2 4.7V2h2.7" />
                    )}
                  </svg>
                </span>
              </button>
            </div>

            <div className={styles.termCenter}>
              <span className={styles.termHost}>
                {isMaximized ? 'bashlab-sandbox: bash (full screen)' : 'bashlab-sandbox: bash (80x24)'}
              </span>
              {instanceStatus === 'running' ? (
                <span className={styles.termStatusPill}>
                  <span className={styles.termStatusDot} />
                  Sandbox Ready
                </span>
              ) : instanceStatus === 'restarting' ? (
                <span className={styles.termStatusPillRestarting}>
                  <span className={styles.termStatusDotRestarting} />
                  Restarting...
                </span>
              ) : (
                <span className={styles.termStatusPillStopped}>
                  <span className={styles.termStatusDotStopped} />
                  Stopped
                </span>
              )}
            </div>

            <div className={styles.termActions}>
              {isMaximized && (
                <button
                  type="button"
                  className={styles.termActionBtn}
                  onClick={handleToggleMaximize}
                  title="Restore split view (Esc)"
                >
                  <span className="material-symbols-outlined">close_fullscreen</span>
                  <span>Restore</span>
                </button>
              )}

              <button
                type="button"
                className={styles.termActionBtn}
                onClick={handleRestartInstance}
                title="Restart Sandbox environment"
              >
                <span className="material-symbols-outlined">restart_alt</span>
                <span>Reset</span>
              </button>

              <button
                type="button"
                className={styles.termActionBtn}
                onClick={terminal.clear}
                title="Clear screen (Ctrl+L)"
              >
                <span className="material-symbols-outlined">mop</span>
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Terminal Screen Output Area */}
          <div className={styles.termScreen} data-lenis-prevent="true">
            {terminalLogs.map((log, logIndex) => (
              <div key={logIndex} className={styles.termRow}>
                {log.type === 'cmd' ? (
                  <div className={styles.termCmdLine}>
                    <span className={styles.termPrompt}>{log.prompt}</span>
                    <span className={styles.termCmdText}>{log.text}</span>
                  </div>
                ) : (
                  <div className={styles.termOutput}>{log.text}</div>
                )}
              </div>
            ))}

            {/* Terminal Input Line or Stopped Barrier */}
            {terminal.status === 'disabled' ? (
              <div className={styles.stoppedBanner}>
                <div className={styles.stoppedInfo}>
                  <span className="material-symbols-outlined text-base">power_off</span>
                  <span>The practice sandbox is not configured on this server. Read the lab and mark it complete when you are done.</span>
                </div>
              </div>
            ) : instanceStatus === 'stopped' ? (
              <div className={styles.stoppedBanner}>
                <div className={styles.stoppedInfo}>
                  <span className="material-symbols-outlined text-base">power_off</span>
                  <span>{terminal.status === 'offline' ? 'The sandbox could not be reached.' : 'Instance is stopped.'} Start the instance to run commands.</span>
                </div>
                <button
                  type="button"
                  className={styles.startInstanceBtn}
                  onClick={terminal.retry}
                >
                  <span className="material-symbols-outlined text-xs">play_arrow</span>
                  <span>Start Instance</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleCommandSubmit} className={styles.termInputForm}>
                <span className={styles.termPrompt}>
                  learner@bashlab:{shortCwd(currentDir)}$
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  className={styles.termRealInput}
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={instanceStatus === 'restarting' ? 'Instance booting...' : 'type a bash command...'}
                  disabled={instanceStatus === 'restarting'}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                />
              </form>
            )}

            <div ref={terminalEndRef} />
          </div>

          {/* Terminal Bottom Toolbar */}
          <div className={styles.termFooter}>
            <div className={styles.quickChips}>
              <span className={styles.quickLabel}>Quick Run:</span>
              {currentLab.commands.map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  className={styles.chipBtn}
                  onClick={() => handleQuickCommand(cmd)}
                  title={`Run command: ${cmd}`}
                >
                  {cmd}
                </button>
              ))}
            </div>

            <div className={styles.termShortcuts}>
              <span><kbd className={styles.shortcutTag}>Enter</kbd> execute</span>
              <span><kbd className={styles.shortcutTag}>Ctrl+L</kbd> clear</span>
              <span><kbd className={styles.shortcutTag}>↑ / ↓</kbd> history</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const STATUS_TEXT = {
  disabled: 'Sandbox not configured',
  connecting: 'Starting sandbox…',
  ready: 'Sandbox ready',
  offline: 'Sandbox offline',
};

// Owns the real sandbox session for this lab: creates it, runs commands,
// keeps practice_sessions (My Learning / Activity) in sync, cleans up on leave.
function useSandbox(user, lab) {
  const [status, setStatus] = useState('connecting');
  const [sessionId, setSessionId] = useState(null);
  const [cwd, setCwd] = useState(HOME);
  const [log, setLog] = useState([
    { type: 'output', text: STATUS_TEXT.connecting },
  ]);
  const [busy, setBusy] = useState(false);
  const openSession = useCallback(async () => {
    setStatus('connecting');
    try {
      const session = await createSession(lab.id); // the API records the practice session
      setSessionId(session.sessionId);
      setCwd(session.cwd || HOME);
      setStatus('ready');
      return { sessionId: session.sessionId };
    } catch (error) {
      const failed = error.code === 'SANDBOX_DISABLED' ? 'disabled' : 'offline';
      setStatus(failed);
      setLog((prev) => [...prev, { type: 'output', text: STATUS_TEXT[failed] }]);
      return null;
    }
  }, [lab.id]);

  useEffect(() => {
    // If the page unmounts before the session finishes opening (fast
    // navigation, React dev double-mount), end that session too instead of
    // leaking a sandbox and an "active" row.
    let cancelled = false;
    let opened = null;
    openSession().then((value) => {
      if (cancelled && value) {
        endSession(value.sessionId);
      } else {
        opened = value;
      }
    });
    return () => {
      cancelled = true;
      if (opened) endSession(opened.sessionId);
    };
  }, [openSession]);

  const run = async (command) => {
    const prompt = `learner@bashlab:${shortCwd(cwd)}$`;
    setLog((prev) => [...prev, { type: 'cmd', prompt, text: command }]);
    if (!sessionId) {
      setLog((prev) => [...prev, { type: 'output', text: 'Sandbox is not connected.' }]);
      return;
    }
    setBusy(true);
    try {
      let result;
      try {
        result = await runCommand(sessionId, command);
      } catch (error) {
        if (error.code !== 'SESSION_NOT_FOUND') throw error;
        const fresh = await openSession();
        if (!fresh) throw error;
        setLog((prev) => [...prev, { type: 'output', text: 'Session expired — started a new sandbox (files were reset).' }]);
        result = await runCommand(fresh.sessionId, command);
      }
      const lines = [];
      if (result.stdout) lines.push({ type: 'output', text: result.stdout.replace(/\n$/, '') });
      if (result.stderr) lines.push({ type: 'output', text: result.stderr.replace(/\n$/, '') });
      if (result.termination === 'timeout') lines.push({ type: 'output', text: 'Command timed out.' });
      if (result.quotaExceeded) lines.push({ type: 'output', text: result.quotaError });
      setLog((prev) => [...prev, ...lines]);
      if (result.cwdUpdated && result.cwd) setCwd(result.cwd);
    } catch (error) {
      setLog((prev) => [...prev, { type: 'output', text: error.message }]);
    } finally {
      setBusy(false);
    }
  };

  return {
    status, sessionId, cwd, log, busy, run,
    clear: () => setLog([]),
    reset: async () => {
      if (!sessionId) return;
      await resetSession(sessionId).catch(() => {});
      setCwd(HOME);
      setLog([{ type: 'output', text: 'Workspace reset.' }]);
    },
    stop: () => {
      if (sessionId) endSession(sessionId); // the API also closes the practice record
      setSessionId(null);
      // 'stopped' (by the learner), not 'offline': the sandbox is still reachable.
      setStatus('stopped');
      setLog((prev) => [...prev, { type: 'output', text: 'Instance stopped.' }]);
    },
    retry: openSession,
  };
}
