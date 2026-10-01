'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, notFound } from 'next/navigation';
import { useCourseLabs } from '@/lib/courseLabs';
import { PageError, PageLoading } from '@/components/shared/Loading';
import { checkSolution, createSession, endSession, resetSession, runCommand, sandboxEnabled } from '@/lib/sandbox';
import { useAuth } from '@/components/auth/AuthProvider';
import { authClient } from '@/lib/authClient';
import styles from './LabWorkspace.module.css';

const HOME = '/home/student';
const shortCwd = (path) => (!path ? '~' : path === HOME ? '~' : path.startsWith(`${HOME}/`) ? `~${path.slice(HOME.length)}` : path);

// Loads the course's labs from the database (see lib/courseLabs.js) and hands
// them to the workspace below. /labs/<n> is the lab's position; a lab slug in
// the URL is redirected to its number.
export default function LabWorkspace({ courseId = 'shell-101', labId = '1' }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const nextParam = encodeURIComponent(`/courses/${courseId}/labs/${labId}`);
  const { loading, missing, error, labs, markDone, retry } = useCourseLabs(courseId);
  const lab = labs.find((item) => String(item.id) === String(labId) || item.slug === labId);

  // Guests must log in before opening a lab — the instant local check avoids
  // a flash of real content while the authoritative useAuth() call is still
  // in flight.
  useEffect(() => {
    if (!authClient.peekUserId()) router.replace(`/login?next=${nextParam}`);
  }, [router, nextParam]);

  useEffect(() => {
    if (!authLoading && !user) router.replace(`/login?next=${nextParam}`);
  }, [authLoading, user, router, nextParam]);

  useEffect(() => {
    if (lab && String(lab.id) !== String(labId)) router.replace(`/courses/${courseId}/labs/${lab.id}`);
  }, [lab, labId, courseId, router]);

  if (authLoading || !user) return <PageLoading label="Loading lab…" />;
  if (loading) return <PageLoading label="Loading lab…" />;
  if (error) return <PageError message={`Could not load this lab: ${error}`} onRetry={retry} />;
  if (missing || !lab) notFound();
  if (String(lab.id) !== String(labId)) return <PageLoading label="Loading lab…" />;
  return <Workspace key={lab.lessonId} courseId={courseId} labId={lab.id} labs={labs} markDone={markDone} />;
}

function Workspace({ courseId, labId, labs, markDone }) {
  const initialLabs = labs;
  const currentLab = initialLabs.find((item) => item.id === labId);
  const totalLabs = initialLabs.length;

  // Active tab on left pane
  const [activeTab, setActiveTab] = useState('instructions');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [panelWidth, setPanelWidth] = useState(50);
  const [mobileView, setMobileView] = useState('lesson');
  const splitRef = useRef(null);
  const contentRef = useRef(null);
  const copyTimerRef = useRef(null);
  const [copyError, setCopyError] = useState('');

  useEffect(() => {
    try {
      const savedSidebar = localStorage.getItem('shell101.sidebar');
      setSidebarCollapsed(savedSidebar ? savedSidebar === 'collapsed' : window.matchMedia('(max-width: 600px)').matches);
      const savedWidth = Number(localStorage.getItem('shell101.panel'));
      if (savedWidth >= 36 && savedWidth <= 64) setPanelWidth(savedWidth);
    } catch { /* The workspace also works without browser storage. */ }
  }, []);

  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

  function selectPanel(tab) {
    setActiveTab(tab);
    setMobileView('lesson');
    if (window.matchMedia('(max-width: 600px)').matches) {
      setSidebarCollapsed(true);
      try { localStorage.setItem('shell101.sidebar', 'collapsed'); } catch {}
    }
    contentRef.current?.scrollTo({ top: 0 });
  }

  function toggleSidebar() {
    const collapsed = !sidebarCollapsed;
    setSidebarCollapsed(collapsed);
    try { localStorage.setItem('shell101.sidebar', collapsed ? 'collapsed' : 'expanded'); } catch {}
  }

  function resizePanel(value) {
    const width = Math.min(64, Math.max(36, value));
    setPanelWidth(width);
    try { localStorage.setItem('shell101.panel', String(width)); } catch {}
  }

  function handleDividerMove(event) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const bounds = splitRef.current.getBoundingClientRect();
    resizePanel(((event.clientX - bounds.left) / bounds.width) * 100);
  }

  // Completed steps checklist
  const [completedSteps, setCompletedSteps] = useState(() => {
    // If lab was already marked solved, start with all steps checked
    if (currentLab.status === 'solved') {
      return (currentLab.steps || []).map((s) => s.id);
    }
    return [];
  });

  const [isLabSolved, setIsLabSolved] = useState(currentLab.status === 'solved');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [instanceStatus, setInstanceStatus] = useState(sandboxEnabled ? 'restarting' : 'stopped'); // 'running' | 'stopped' | 'restarting'
  const [isMaximized, setIsMaximized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const sessionIdRef = useRef(null);

  useEffect(() => {
    setShowHint(false);
  }, [labId]);

  // Start instance: opens a real sandbox session via the backend API.
  async function handleStartInstance() {
    if (!sandboxEnabled) {
      setInstanceStatus('stopped');
      return;
    }
    setInstanceStatus('restarting');
    setTerminalLogs([{ type: 'output', text: 'Booting container instance...' }]);
    try {
      const session = await createSession(currentLab.lessonId);
      sessionIdRef.current = session.sessionId;
      setCwd(session.cwd);
      setInstanceStatus('running');
      setTerminalLogs((prev) => [
        ...prev,
        { type: 'output', text: `BashLab Cloud Shell (Ready).\nWorkspace: ${session.cwd}\nFocus commands for this lab: ${currentLab.commands.join(', ')}` }
      ]);
      inputRef.current?.focus();
    } catch (error) {
      setInstanceStatus('stopped');
      setTerminalLogs((prev) => [...prev, { type: 'output', text: `[error] Could not start the sandbox: ${error.message}` }]);
    }
  }

  // Red button: Stop / Toggle instance
  function handleToggleStopInstance() {
    if (instanceStatus === 'running' || instanceStatus === 'restarting') {
      if (sessionIdRef.current) endSession(sessionIdRef.current);
      sessionIdRef.current = null;
      setInstanceStatus('stopped');
      setTerminalLogs((prev) => [
        ...prev,
        {
          type: 'output',
          text: `\n[Broadcast] Signal SIGTERM received. Instance container halted.\nTo boot the environment again, click the red dot or "Start Instance".`
        }
      ]);
    } else {
      handleStartInstance();
    }
  }

  // Yellow button: Restart instance (resets the sandbox's filesystem/cwd, same session).
  async function handleRestartInstance() {
    if (!sessionIdRef.current) return handleStartInstance();
    setInstanceStatus('restarting');
    setTerminalLogs((prev) => [...prev, { type: 'output', text: '\n[System] Restarting sandbox container instance...' }]);
    try {
      const session = await resetSession(sessionIdRef.current);
      setCwd(session.cwd);
      setInstanceStatus('running');
      setTerminalLogs((prev) => [...prev, { type: 'output', text: 'Instance restarted successfully.' }]);
      inputRef.current?.focus();
    } catch (error) {
      setInstanceStatus('stopped');
      setTerminalLogs((prev) => [...prev, { type: 'output', text: `[error] Restart failed: ${error.message}` }]);
    }
  }

  // Open a sandbox session as soon as the lab loads; close it on the way out
  // (lab change or navigating away) so containers do not leak.
  useEffect(() => {
    handleStartInstance();
    return () => { if (sessionIdRef.current) endSession(sessionIdRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Terminal state
  const [cwd, setCwd] = useState(HOME);
  const [terminalInput, setTerminalInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cmdHistory, setCmdHistory] = useState([]);
  const [terminalLogs, setTerminalLogs] = useState([]);

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

  // Toggle step completion manually
  function toggleStep(stepId) {
    setCompletedSteps((prev) => {
      const next = prev.includes(stepId)
        ? prev.filter((id) => id !== stepId)
        : [...prev, stepId];

      if (currentLab.steps && next.length === currentLab.steps.length) {
        setIsLabSolved(true);
      }
      return next;
    });
  }

  // Confirms the lab as done in progress, celebrating in the terminal log.
  function celebrate(allIds) {
    if (allIds) setCompletedSteps(allIds);
    setIsLabSolved(true);
    markDone(currentLab).then(({ error }) => {
      if (error) setTerminalLogs((prev) => [...prev, { type: 'output', text: `[warning] Your progress could not be saved: ${error.message}` }]);
    });
  }

  // Check solution button: runs the server-owned verifier against the real
  // sandbox when this lab has one; otherwise falls back to the learner's own
  // checklist (manual completion — there is nothing server-side to verify).
  async function handleCheckSolution() {
    if (currentLab.verifier && sessionIdRef.current) {
      setChecking(true);
      try {
        const result = await checkSolution(sessionIdRef.current, currentLab.verifier);
        if (result.passed) {
          celebrate(currentLab.steps?.map((s) => s.id));
          setTerminalLogs((prev) => [
            ...prev,
            { type: 'output', text: `\n[VERIFICATION PASSED] All ${result.checks.length} validation checks succeeded!\n✓ Sandbox state matches expected solution.\n🎉 Lab #${currentLab.id} completed.` }
          ]);
        } else {
          const failed = result.checks.filter((c) => !c.passed).map((c) => `✗ ${c.name}`).join('\n');
          setTerminalLogs((prev) => [...prev, { type: 'output', text: `\n[VERIFICATION FAILED] Not solved yet:\n${failed}` }]);
        }
      } catch (error) {
        setTerminalLogs((prev) => [...prev, { type: 'output', text: `[error] Check failed: ${error.message}` }]);
      } finally {
        setChecking(false);
      }
      return;
    }
    if (currentLab.steps) {
      const allIds = currentLab.steps.map((s) => s.id);
      celebrate(allIds);
      setTerminalLogs((prev) => [
        ...prev,
        { type: 'output', text: `\n[VERIFICATION PASSED] All ${allIds.length} checklist items marked complete.\n🎉 Lab #${currentLab.id} completed.` }
      ]);
    }
  }

  // Copy code snippet helper
  async function handleCopy(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyError('');
      setCopiedCode(text);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      setCopyError('Could not copy. Select the command and copy it manually.');
    }
  }

  // Command execution engine — every line goes to the real sandbox (Docker +
  // Bubblewrap on the backend); nothing is interpreted client-side except the
  // terminal-local `clear` shortcut.
  async function handleCommandSubmit(e) {
    e.preventDefault();
    const rawCmd = terminalInput.trim();
    if (!rawCmd || busy) return;

    setCmdHistory((prev) => [...prev, rawCmd]);
    setHistoryIndex(-1);
    setTerminalInput('');

    if (rawCmd === 'clear') {
      setTerminalLogs([]);
      return;
    }

    const promptText = `student@bashlab:${shortCwd(cwd)}$`;
    setTerminalLogs((prev) => [...prev, { type: 'cmd', prompt: promptText, text: rawCmd }]);

    // Lets the checklist track along with real commands when this lab has no
    // server verifier (manual-grading labs still deserve live feedback).
    if (currentLab.steps) {
      currentLab.steps.forEach((step) => {
        if (step.targetCmd && rawCmd.toLowerCase().includes(step.targetCmd.toLowerCase()) && !completedSteps.includes(step.id)) {
          setCompletedSteps((prev) => [...prev, step.id]);
        }
      });
    }

    if (!sessionIdRef.current) {
      setTerminalLogs((prev) => [...prev, { type: 'output', text: '[error] No active sandbox session. Click the red dot or "Start Instance" first.' }]);
      return;
    }

    setBusy(true);
    try {
      const result = await runCommand(sessionIdRef.current, rawCmd);
      if (result.cwdUpdated) setCwd(result.cwd);
      const text = [result.stdout, result.stderr].filter(Boolean).join('\n');
      const warning = result.quotaExceeded ? `\n[warning] ${result.quotaError}` : '';
      setTerminalLogs((prev) => [...prev, { type: 'output', text: `${text}${warning}` }]);
    } catch (error) {
      setTerminalLogs((prev) => [...prev, { type: 'output', text: `[error] ${error.message}` }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
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
      setTerminalLogs([]);
    }
  }

  // Fill terminal input with quick chip command
  function handleQuickCommand(cmdText) {
    setTerminalInput(cmdText);
    inputRef.current?.focus();
  }

  const prevLabId = currentLab.id > 1 ? currentLab.id - 1 : null;
  const nextLabId = currentLab.id < totalLabs ? currentLab.id + 1 : null;

  return (
    <div className={`${styles.workspacePage} ${styles.unified} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`} data-lenis-prevent="true">
        <aside className={styles.workspaceSidebar} aria-label="Course workspace">
          <Link href="/" className={styles.sidebarItem} aria-label="Home" data-tooltip="Home">
            <span className="material-symbols-outlined" aria-hidden="true">home</span>
            <span className={styles.sidebarLabel}>Home</span>
          </Link>
          <div className={styles.sidebarRule} />
          <nav aria-label="Learning panels">
            {[
              ['lessons', 'format_list_bulleted', 'Lessons'],
              ['instructions', 'menu_book', 'Instructions'],
              ['solution', 'lightbulb', 'Solution'],
            ].map(([id, icon, label]) => (
              <button key={id} type="button" className={`${styles.sidebarItem} ${activeTab === id ? styles.sidebarItemActive : ''}`}
                aria-label={label} aria-pressed={activeTab === id} aria-controls="learning-panel" data-tooltip={label}
                onClick={() => selectPanel(id)}>
                <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
                <span className={styles.sidebarLabel}>{label}</span>
              </button>
            ))}
          </nav>
          <a href="https://github.com/0viprorqiv0/Bashlab/issues/new" target="_blank" rel="noopener noreferrer"
            className={`${styles.sidebarItem} ${styles.sidebarReport}`} aria-label="Report a bug (opens in a new tab)" data-tooltip="Report a bug">
            <span className="material-symbols-outlined" aria-hidden="true">bug_report</span>
            <span className={styles.sidebarLabel}>Report a bug</span>
          </a>
          <button type="button" className={`${styles.sidebarItem} ${styles.sidebarToggle}`} onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!sidebarCollapsed}
            data-tooltip={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <span className="material-symbols-outlined" aria-hidden="true">{sidebarCollapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'}</span>
            <span className={styles.sidebarLabel}>Collapse sidebar</span>
          </button>
        </aside>
      {/* Top Workspace Header Bar */}
      <header className={styles.topBar}>
        <div className={styles.topLeft}>
          <button type="button" className={styles.courseLabel} onClick={() => selectPanel('lessons')}>Shell 101</button>

          <div className={styles.courseDivider} />

          <div className={styles.labNavGroup}>
            <Link
              href={prevLabId ? `/courses/${courseId}/labs/${prevLabId}` : '#'}
              onClick={(event) => { if (!prevLabId) event.preventDefault(); }}
              tabIndex={prevLabId ? undefined : -1}
              aria-label="Previous lesson"
              className={styles.navArrowBtn}
              aria-disabled={!prevLabId}
              title={prevLabId ? `Previous Lab #${prevLabId}` : 'First Lab'}
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </Link>

            <span className="font-code text-xs text-on-surface-variant font-medium">
              {currentLab.id} / {totalLabs}
            </span>

            <Link
              href={nextLabId ? `/courses/${courseId}/labs/${nextLabId}` : '#'}
              onClick={(event) => { if (!nextLabId) event.preventDefault(); }}
              tabIndex={nextLabId ? undefined : -1}
              aria-label="Next lesson"
              className={styles.navArrowBtn}
              aria-disabled={!nextLabId}
              title={nextLabId ? `Next Lab #${nextLabId}` : 'Last Lab'}
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </Link>
          </div>

          <h1 className={styles.labTitleHeader}>
            Lab #{currentLab.id}: {currentLab.title}
          </h1>

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
            disabled={checking}
            aria-label="Check solution"
            title="Validate completed tasks and check solution"
          >
            <span className="material-symbols-outlined">verified</span>
            <span>{checking ? 'Checking…' : 'Check Solution'}</span>
          </button>
        </div>
      </header>

      {/* 50 / 50 Split Layout */}
      <div className={styles.mobileSwitcher} aria-label="Workspace view">
        <button type="button" aria-pressed={mobileView === 'lesson'} onClick={() => setMobileView('lesson')}>Lesson</button>
        <button type="button" aria-pressed={mobileView === 'terminal'} onClick={() => setMobileView('terminal')}>Terminal</button>
      </div>
      <div ref={splitRef} className={styles.splitLayout} style={{ '--panel-width': `${panelWidth}%` }} data-mobile-view={mobileView}>
        {/* LEFT HALF: Problem Statement & Instructions */}
        <section id="learning-panel" className={styles.leftPane} data-lenis-prevent="true" aria-label={`${activeTab} panel`}>
          <div className={styles.panelHeading}>
            <span>{activeTab === 'lessons' ? 'Course lessons' : activeTab === 'solution' ? 'Solution walkthrough' : 'Instructions'}</span>
            <span>{activeTab === 'lessons' ? `${totalLabs} lessons` : `Lesson ${currentLab.id}`}</span>
          </div>

          {/* Instructions Content */}
          <div key={activeTab} ref={contentRef} className={styles.instructionsScroll} data-lenis-prevent="true">
            {copyError && <p role="status" className={styles.copyError}>{copyError}</p>}
            {activeTab === 'lessons' ? (
              <>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.labTitle}>Shell 101</h2>
                  <p className={styles.courseIntro}>Build your command line skills, one lesson at a time.</p>
                </div>
                <ol className={styles.lessonList}>
                  {initialLabs.map((lab) => {
                    const completed = lab.id === currentLab.id ? isLabSolved : lab.status === 'solved';
                    return (
                      <li key={lab.id}>
                        <Link href={`/courses/${courseId}/labs/${lab.id}`} className={`${styles.lessonRow} ${lab.id === currentLab.id ? styles.currentLesson : ''} ${completed ? styles.completedLesson : ''}`}
                          aria-current={lab.id === currentLab.id ? 'page' : undefined}
                          aria-label={completed ? `${lab.title}, completed` : undefined}
                          onClick={() => { if (lab.id === currentLab.id) selectPanel('instructions'); }}>
                          <span className={styles.lessonNumber}>{String(lab.id).padStart(2, '0')}</span>
                          <span className={styles.lessonInfo}><strong>{lab.title}</strong><span>{lab.commands.join(' · ')}</span></span>
                          <span className={styles.lessonDifficulty}>{lab.difficulty}</span>
                          <span className="material-symbols-outlined" aria-hidden="true">{completed ? 'check_circle' : lab.id === currentLab.id ? 'radio_button_checked' : 'chevron_right'}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </>
            ) : activeTab === 'instructions' ? (
              <>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.labTitle}>{currentLab.title}</h2>
                  <div className={styles.metaRow}>
                    <span>Track: <strong>{currentLab.category}</strong></span>
                    <span>·</span>
                    {currentLab.acceptance && <span>Acceptance: <strong>{currentLab.acceptance}</strong></span>}
                  </div>
                </div>

                {/* Scenario / Story */}
                <div className={styles.scenarioCard}>
                  <div className={styles.scenarioTitle}>Mission Scenario</div>
                  <p className={styles.scenarioText}>{currentLab.scenario}</p>
                </div>

                {/* Checklist Steps */}
                <h3 className={styles.subSectionTitle}>
                  <span className="material-symbols-outlined">checklist</span>
                  <span>Objective Tasks ({completedSteps.length} of {(currentLab.steps || []).length} completed)</span>
                </h3>

                <div className={styles.stepList}>
                  {(currentLab.steps || []).map((step, idx) => {
                    const isDone = completedSteps.includes(step.id);
                    return (
                      <div
                        key={step.id}
                        className={`${styles.stepItem} ${isDone ? styles.stepItemCompleted : ''}`}
                        onClick={() => toggleStep(step.id)}
                        role="checkbox" aria-checked={isDone} tabIndex={0}
                        onKeyDown={(event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); toggleStep(step.id); } }}
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
                        <td className={styles.syntaxDesc}>{item.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Examples */}
                <h3 className={styles.subSectionTitle}>
                  <span className="material-symbols-outlined">terminal</span>
                  <span>Example Walkthrough</span>
                </h3>

                {(currentLab.examples || []).map((ex, i) => (
                  <div key={i} className={styles.codeCard}>
                    <div className={styles.codeCardHeader}>
                      <span>{ex.title}</span>
                      <button
                        type="button"
                        className={styles.copyCodeBtn}
                        onClick={() => handleCopy(ex.code)}
                        title="Copy command to clipboard"
                      >
                        <span className="material-symbols-outlined text-xs">
                          {copiedCode === ex.code ? 'check' : 'content_copy'}
                        </span>
                        <span>{copiedCode === ex.code ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className={styles.codeCardBody}>
                      <code>$ {ex.code}</code>
                    </div>
                    <div className={styles.codeExplanation}>{ex.explanation}</div>
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
                    {nextLabId && (
                      <Link href={`/courses/${courseId}/labs/${nextLabId}`} className={styles.nextLabBtn}>
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
                  <h2 className={styles.labTitle}>{currentLab.title}</h2>
                </div>

                <div className={styles.scenarioCard}>
                  <div className={styles.scenarioTitle}>POSIX Architecture Notes</div>
                  <p className={styles.scenarioText}>{currentLab.solutionExplanation ? formatInlineCode(currentLab.solutionExplanation) : 'The solution is being updated.'}</p>
                </div>

                <h3 className={styles.subSectionTitle}>
                  <span className="material-symbols-outlined">check_circle</span>
                  <span>Reference Command Sequence</span>
                </h3>

                {(currentLab.steps || []).map((step, idx) => (
                  <div key={step.id} className={styles.codeCard}>
                    <div className={styles.codeCardHeader}>
                      <span>Step {idx + 1} Solution</span>
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

        <div className={styles.splitHandle} role="separator" aria-label="Resize learning panel" aria-orientation="vertical"
          aria-valuemin={36} aria-valuemax={64} aria-valuenow={Math.round(panelWidth)} aria-valuetext={`${Math.round(panelWidth)} percent`} tabIndex={0}
          onPointerDown={(event) => { if (event.button === 0) { event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); } }}
          onPointerMove={handleDividerMove}
          onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
          onDoubleClick={() => resizePanel(50)}
          onKeyDown={(event) => {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter'].includes(event.key)) {
              event.preventDefault();
              resizePanel(event.key === 'Home' ? 36 : event.key === 'End' ? 64 : event.key === 'Enter' ? 50 : panelWidth + (event.key === 'ArrowRight' ? 2 : -2));
            }
          }} />

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
                  Preview
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
                onClick={() => setTerminalLogs([])}
                title="Clear screen (Ctrl+L)"
              >
                <span className="material-symbols-outlined">mop</span>
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Terminal Screen Output Area */}
          <div className={styles.termScreen} data-lenis-prevent="true">
            {terminalLogs.map((log, index) => (
              <div key={index} className={styles.termRow}>
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
            {instanceStatus === 'stopped' ? (
              <div className={styles.stoppedBanner}>
                <div className={styles.stoppedInfo}>
                  <span className="material-symbols-outlined text-base">power_off</span>
                  <span>{sandboxEnabled ? 'Instance is stopped. Start instance to run commands.' : 'Sandbox not configured on this environment — mark steps complete manually below.'}</span>
                </div>
                {sandboxEnabled && (
                  <button
                    type="button"
                    className={styles.startInstanceBtn}
                    onClick={handleStartInstance}
                  >
                    <span className="material-symbols-outlined text-xs">play_arrow</span>
                    <span>Start Instance</span>
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleCommandSubmit} className={styles.termInputForm}>
                <span className={styles.termPrompt}>
                  student@bashlab:{shortCwd(cwd)}$
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  className={styles.termRealInput}
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={instanceStatus === 'restarting' ? 'Instance booting...' : busy ? 'running…' : 'type a bash command...'}
                  disabled={instanceStatus === 'restarting' || busy}
                  aria-label="Terminal command"
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
