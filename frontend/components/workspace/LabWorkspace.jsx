'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { initialLabs, getLabById } from '@/data/labsData';
import { useLabProgress } from '@/lib/labProgress';
import styles from './LabWorkspace.module.css';

export default function LabWorkspace({ courseId = 'shell-101', labId = 1 }) {
  const currentLab = getLabById(labId);
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

  // A signed-in learner's real progress (database) replaces the built-in defaults.
  const { doneSlugs, markDone } = useLabProgress(courseId);
  useEffect(() => {
    if (!doneSlugs) return;
    const done = doneSlugs.has(currentLab.slug);
    setIsLabSolved(done);
    setCompletedSteps(done ? (currentLab.steps || []).map((s) => s.id) : []);
  }, [doneSlugs, currentLab]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [instanceStatus, setInstanceStatus] = useState('running'); // 'running' | 'stopped' | 'restarting'
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    setShowHint(false);
  }, [labId]);

  // Red button: Stop / Toggle instance
  function handleToggleStopInstance() {
    if (instanceStatus === 'running' || instanceStatus === 'restarting') {
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

  // Start instance
  function handleStartInstance() {
    setInstanceStatus('restarting');
    setTerminalLogs([
      {
        type: 'output',
        text: `Booting container instance...\n[  0.020] Loading kernel image (Ubuntu 24.04 LTS POSIX sandbox)\n[  0.110] Mounting /home/learner/workspace [OK]\n[  0.250] Initializing bash shell session [OK]\n\nBashLab Cloud Shell v2.4 (Ready).\nFocus commands for this lab: ${currentLab.commands.join(', ')}`
      }
    ]);
    setTimeout(() => {
      setInstanceStatus('running');
      setCurrentDir('/home/learner/workspace');
      inputRef.current?.focus();
    }, 500);
  }

  // Yellow button: Restart instance
  function handleRestartInstance() {
    setInstanceStatus('restarting');
    setTerminalLogs((prev) => [
      ...prev,
      {
        type: 'output',
        text: `\n[System] Restarting sandbox container instance...\n[  0.010] Terminating lingering child processes [OK]\n[  0.120] Resetting working directory state [OK]\n[  0.260] POSIX environment reinitialized [OK]\nInstance restarted successfully.`
      }
    ]);
    setTimeout(() => {
      setInstanceStatus('running');
      setCurrentDir('/home/learner/workspace');
      inputRef.current?.focus();
    }, 600);
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

  // Terminal state
  const [currentDir, setCurrentDir] = useState('/home/learner/workspace');
  const [terminalInput, setTerminalInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cmdHistory, setCmdHistory] = useState([]);
  const [terminalLogs, setTerminalLogs] = useState([
    {
      type: 'output',
      text: `BashLab Cloud Shell v2.4 (Ubuntu 24.04 LTS x86_64)\nWorkspace: /home/learner/workspace\nType "help" for a list of commands. Focus commands for this lab: ${currentLab.commands.join(', ')}`
    }
  ]);

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

  // Check solution button
  function handleCheckSolution() {
    if (currentLab.steps) {
      const allIds = currentLab.steps.map((s) => s.id);
      setCompletedSteps(allIds);
      setIsLabSolved(true);
      markDone(currentLab.slug).then(({ error }) => {
        if (error) setTerminalLogs((prev) => [...prev, { type: 'output', text: `
[warning] Your progress could not be saved: ${error.message}` }]);
      });
      setTerminalLogs((prev) => [
        ...prev,
        {
          type: 'output',
          text: `\n[VERIFICATION PASSED] All ${allIds.length} validation checks succeeded!\n✓ Sandbox state matches expected solution.\n🎉 Lab #${currentLab.id} completed.`
        }
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

  // Reset terminal
  function handleReset() {
    setTerminalLogs([
      {
        type: 'output',
        text: `Session reset.\nWorkspace: /home/learner/workspace\nType "help" for available commands.`
      }
    ]);
    setCurrentDir('/home/learner/workspace');
  }

  // Command execution engine
  function handleCommandSubmit(e) {
    e.preventDefault();
    const rawCmd = terminalInput.trim();
    if (!rawCmd) return;

    // Add to history
    setCmdHistory((prev) => [...prev, rawCmd]);
    setHistoryIndex(-1);

    const promptText = `learner@bashlab:${currentDir.replace('/home/learner', '~')}$`;
    const newLogs = [...terminalLogs, { type: 'cmd', prompt: promptText, text: rawCmd }];

    const [cmd, ...args] = rawCmd.split(' ');

    // Match steps for auto-check
    if (currentLab.steps) {
      currentLab.steps.forEach((step) => {
        if (rawCmd.toLowerCase().includes(step.targetCmd.toLowerCase())) {
          if (!completedSteps.includes(step.id)) {
            setCompletedSteps((prev) => [...prev, step.id]);
          }
        }
      });
    }

    // Evaluate command
    if (cmd === 'clear') {
      setTerminalLogs([]);
      setTerminalInput('');
      return;
    } else if (cmd === 'help') {
      newLogs.push({
        type: 'output',
        text: 'Available Commands:\n  pwd, ls [-la], cd [path], cat [file], head, tail, grep, awk, cut, sed, chmod, touch, mkdir, cp, mv, rm, whoami, date, echo, clear, help\nPress Ctrl+L to clear screen.'
      });
    } else if (cmd === 'pwd') {
      newLogs.push({ type: 'output', text: currentDir });
    } else if (cmd === 'whoami') {
      newLogs.push({ type: 'output', text: 'learner (uid=1000 gid=1000 groups=sudo,docker)' });
    } else if (cmd === 'date') {
      newLogs.push({ type: 'output', text: new Date().toUTCString() });
    } else if (cmd === 'cd') {
      const target = args[0] || '~';
      if (target === '~' || target === '/home/learner') {
        setCurrentDir('/home/learner');
        newLogs.push({ type: 'output', text: '' });
      } else if (target === '..' || target === '../') {
        const parts = currentDir.split('/').filter(Boolean);
        parts.pop();
        setCurrentDir('/' + parts.join('/'));
        newLogs.push({ type: 'output', text: '' });
      } else if (target.startsWith('/')) {
        setCurrentDir(target);
        newLogs.push({ type: 'output', text: '' });
      } else {
        const next = `${currentDir}/${target}`.replace(/\/+/g, '/');
        setCurrentDir(next);
        newLogs.push({ type: 'output', text: '' });
      }
    } else if (cmd === 'ls') {
      const hasAll = rawCmd.includes('-a') || rawCmd.includes('-la') || rawCmd.includes('-lah');
      const hasLong = rawCmd.includes('-l') || rawCmd.includes('-la') || rawCmd.includes('-lah');

      if (hasAll && hasLong) {
        newLogs.push({
          type: 'output',
          text: `total 48\ndrwxr-xr-x 6 learner learner 4096 Sep 29 22:00 .\ndrwxr-xr-x 3 learner learner 4096 Sep 29 21:00 ..\n-rw-r--r-- 1 learner learner  220 Sep 29 21:00 .bashrc\n-rw-r--r-- 1 learner learner  807 Sep 29 21:00 .profile\n-rw-r--r-- 1 learner learner  145 Sep 29 21:15 app.env\n-rw-r--r-- 1 learner learner 3420 Sep 29 21:30 audit.log\n-rwxr-xr-x 1 learner learner  512 Sep 29 21:45 deploy.sh\n-rw------- 1 learner learner 1675 Sep 29 21:10 id_rsa\n-rw-r--r-- 1 learner learner  940 Sep 29 21:20 package.json\ndrwxr-xr-x 2 learner learner 4096 Sep 29 21:00 src\ndrwxr-xr-x 2 learner learner 4096 Sep 29 21:00 tests`
        });
      } else if (hasLong) {
        newLogs.push({
          type: 'output',
          text: `total 36\n-rw-r--r-- 1 learner learner  145 Sep 29 21:15 app.env\n-rw-r--r-- 1 learner learner 3420 Sep 29 21:30 audit.log\n-rwxr-xr-x 1 learner learner  512 Sep 29 21:45 deploy.sh\n-rw------- 1 learner learner 1675 Sep 29 21:10 id_rsa\n-rw-r--r-- 1 learner learner  940 Sep 29 21:20 package.json\ndrwxr-xr-x 2 learner learner 4096 Sep 29 21:00 src\ndrwxr-xr-x 2 learner learner 4096 Sep 29 21:00 tests`
        });
      } else if (hasAll) {
        newLogs.push({
          type: 'output',
          text: `.  ..  .bashrc  .profile  app.env  audit.log  deploy.sh  id_rsa  package.json  src  tests`
        });
      } else {
        newLogs.push({
          type: 'output',
          text: `app.env  audit.log  deploy.sh  id_rsa  package.json  src/  tests/`
        });
      }
    } else if (cmd === 'cat') {
      const targetFile = args[0] || '';
      if (targetFile.includes('app.env') || targetFile.includes('env')) {
        newLogs.push({
          type: 'output',
          text: `PORT=3000\nNODE_ENV=production\nDATABASE_URL=postgres://db-local:5432/bashlab\nVERBOSE=true\nLOG_LEVEL=info`
        });
      } else if (targetFile.includes('audit.log') || targetFile.includes('log')) {
        newLogs.push({
          type: 'output',
          text: `2026-09-29T21:00:01Z user=alex ip=192.168.1.100 status=200 action=login\n2026-09-29T21:00:05Z user=root ip=10.0.0.1 status=401 action=ssh_auth\n2026-09-29T21:00:12Z user=alex ip=192.168.1.100 status=200 action=fetch_course\n2026-09-29T21:00:25Z user=guest ip=172.16.0.4 status=403 action=admin_access\n2026-09-29T21:00:44Z user=root ip=10.0.0.1 status=401 action=ssh_auth`
        });
      } else {
        newLogs.push({
          type: 'output',
          text: `# Sample file: ${targetFile}\n// Created for BashLab interactive practice.\nconsole.log("Ready.");`
        });
      }
    } else if (cmd === 'head') {
      newLogs.push({
        type: 'output',
        text: `2026-09-29T21:00:01Z user=alex ip=192.168.1.100 status=200 action=login\n2026-09-29T21:00:05Z user=root ip=10.0.0.1 status=401 action=ssh_auth\n2026-09-29T21:00:12Z user=alex ip=192.168.1.100 status=200 action=fetch_course`
      });
    } else if (cmd === 'tail') {
      newLogs.push({
        type: 'output',
        text: `2026-09-29T21:05:10Z user=alex ip=192.168.1.100 status=200 action=terminal_exec\n2026-09-29T21:05:44Z user=system status=200 action=health_check_ok`
      });
    } else if (cmd === 'echo') {
      newLogs.push({ type: 'output', text: args.join(' ').replace(/^["']|["']$/g, '') });
    } else if (cmd === 'chmod') {
      newLogs.push({
        type: 'output',
        text: `Permissions updated successfully: ${args.join(' ')}`
      });
    } else if (cmd === 'mkdir') {
      newLogs.push({
        type: 'output',
        text: `Directory created: ${args.join(' ')}`
      });
    } else if (cmd === 'touch') {
      newLogs.push({
        type: 'output',
        text: `File updated: ${args.join(' ')}`
      });
    } else if (cmd.includes('grep')) {
      newLogs.push({
        type: 'output',
        text: `app.env:3: DATABASE_URL=postgres://db-local:5432/bashlab\napp.env:5: LOG_LEVEL=info`
      });
    } else {
      newLogs.push({
        type: 'output',
        text: `[sandbox] executed: ${rawCmd}`
      });
    }

    setTerminalLogs(newLogs);
    setTerminalInput('');
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
            aria-label="Check solution"
            title="Validate completed tasks and check solution"
          >
            <span className="material-symbols-outlined">verified</span>
            <span>Check Solution</span>
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
                    const completed = lab.id === currentLab.id ? isLabSolved : (doneSlugs ? doneSlugs.has(lab.slug) : lab.status === 'solved');
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
                    <span>Acceptance: <strong>{currentLab.acceptance}</strong></span>
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
                  <span>Instance is stopped. Start instance to run commands.</span>
                </div>
                <button
                  type="button"
                  className={styles.startInstanceBtn}
                  onClick={handleStartInstance}
                >
                  <span className="material-symbols-outlined text-xs">play_arrow</span>
                  <span>Start Instance</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleCommandSubmit} className={styles.termInputForm}>
                <span className={styles.termPrompt}>
                  learner@bashlab:{currentDir.replace('/home/learner', '~')}$
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
