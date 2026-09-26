'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import dynamic from 'next/dynamic';
import styles from './Lookbook.module.css';
import CuriosityWord from './CuriosityWord';
import CourseBento from './CourseBento';

/* Cyber backdrop loads independently from main content */
const CyberBackdrop = dynamic(() => import('./CyberBackdrop'), { ssr: false });

/* Thuật toán Lookbook Snap — không dùng CSS scroll-snap */
const SNAP_DEBOUNCE = 260;
const SNAP_MAX_PULL = 130;
const FOOTER_FREE_GAP = 200;
const DESKTOP_MIN = 901;
const STORE_KEY = 'bashlab:lookbook-snap';

/* Đúng 5 phần cấu trúc cũ */
const PAGES = [
  { id: 'start', label: 'Start' },
  { id: 'try', label: 'Try' },
  { id: 'learn', label: 'Learn' },
  { id: 'course', label: 'Course' },
  { id: 'questions', label: 'Questions' },
];

const RESPONSES = {
  pwd: { out: '/bashlab', desc: 'pwd prints your current directory. This path belongs to the demo.' },
  ls: { out: 'about.txt   courses/   getting-started.txt', desc: 'ls lists entries in the demo root.' },
  whoami: { out: 'guest', desc: 'You are a curious learner. BashLab helps you turn that curiosity into command-line skills.' },
  help: { out: 'Available demo commands: pwd, ls, whoami, cat about.txt, courses, help, clear', desc: 'Simulated commands to explore how Bash interaction works.' },
  'cat about.txt': { out: 'BashLab provides short guided lessons, real browser practice, and requirement feedback.', desc: 'Displaying text file contents with cat.' },
  'cat getting-started.txt': { out: 'Browse courses -> open a course -> choose a lesson -> start practicing.', desc: 'Getting started guide loaded.' },
  courses: { out: 'Shell 101 — Bash Basics [Available now at /courses/shell-101]', desc: 'Explore the full course syllabus in the course section below.' },
};

const FAQS = [
  {
    q: 'Do I need to install anything?',
    a: 'No. BashLab runs a genuine containerized Linux environment directly in your browser. All you need is an updated modern web browser.',
  },
  {
    q: 'Is my progress saved?',
    a: 'Yes. Your course completion, lesson milestones, and exercise checks are permanently tied to your learner account.',
  },
  {
    q: 'What happens when a practice session ends?',
    a: 'Practice sandboxes are ephemeral and automatically recycle after 10–15 minutes of inactivity to keep resources clean. Your learning progress remains permanently saved.',
  },
];

const PIPELINE_STEPS = [
  {
    num: '01',
    color: '#00FF66',
    glow: 'rgba(0, 255, 102, 0.4)',
    tag: 'VISUAL CONCEPT',
    title: 'Understand the map',
    desc: 'See how folders and paths connect before running any command.',
    subtext: 'Visual directory tree · Clear mental model',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" />
        <line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" />
        <line x1="15" y1="20" x2="15" y2="23" />
        <line x1="20" y1="9" x2="23" y2="9" />
        <line x1="20" y1="14" x2="23" y2="14" />
        <line x1="1" y1="9" x2="4" y2="9" />
        <line x1="1" y1="14" x2="4" y2="14" />
      </svg>
    ),
  },
  {
    num: '02',
    color: '#00E5FF',
    glow: 'rgba(0, 229, 255, 0.4)',
    tag: 'REAL TERMINAL',
    title: 'Practice in real Linux',
    desc: 'Type and run real Bash commands right in your browser. Zero setup.',
    subtext: 'Instant sandbox · No install needed',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
  },
  {
    num: '03',
    color: '#FFB800',
    glow: 'rgba(255, 184, 0, 0.4)',
    tag: 'INSTANT CHECKS',
    title: 'Get instant feedback',
    desc: 'Automated checks tell you right away what worked and what to fix.',
    subtext: 'Pass/fail verification · Learn by doing',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
];

function isDesktop() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= DESKTOP_MIN;
}

function reducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function Lookbook() {
  const sectionRefs = useRef([]);
  const scrollTimer = useRef(null);
  const snappingUntil = useRef(0);
  const toastTimer = useRef(null);
  const rafTick = useRef(false);
  const logRef = useRef(null);
  const termRef = useRef(null);
  const termInputRef = useRef(null);
  const termGreenRef = useRef(null);
  const termReopenRef = useRef(null);
  const placeholderRef = useRef(null);
  const backdropRef = useRef(null);
  const inlineHeightRef = useRef(320);
  const isAnimatingRef = useRef(false);



  /* Cyber Glow & Status LED */
  const [sysStatus, setSysStatus] = useState('SYS_READY');
  const statusTimerRef = useRef(null);
  const sandboxSessionRef = useRef(null);

  const [active, setActive] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [toast, setToast] = useState(null);
  const [openAcc, setOpenAcc] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [cmdHistory, setCmdHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  /* Kích thước terminal: default | minimized | expanded | closed */
  const [termSize, setTermSize] = useState('default');
  const [logEntries, setLogEntries] = useState([
    { type: 'info', content: '// Suggested command ready. Click below or press Enter to run:' },
    { type: 'prompt', cmd: 'pwd' },
    { type: 'output', content: '/bashlab' },
    { type: 'desc', content: 'pwd prints your current directory. This path belongs to the demo.' },
  ]);

  const activeRef = useRef(0);
  const enabledRef = useRef(true);
  activeRef.current = active;
  enabledRef.current = enabled;

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(STORE_KEY);
      if (v === '0') setEnabled(false);
    } catch {
      /* giữ mặc định ON */
    }
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  const goTo = useCallback((index) => {
    const el = sectionRefs.current[index];
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    snappingUntil.current = Date.now() + 750;
    setActive(index);
    window.scrollTo({ top, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, []);

  useEffect(() => {
    function updateActive() {
      rafTick.current = false;
      const sections = sectionRefs.current.filter(Boolean);
      if (!sections.length) return;
      const mid = window.innerHeight / 2;
      for (let i = 0; i < sections.length; i += 1) {
        const r = sections[i].getBoundingClientRect();
        if (r.top <= mid && r.bottom >= mid) {
          if (activeRef.current !== i) setActive(i);
          return;
        }
      }
      const last = sections[sections.length - 1].getBoundingClientRect();
      if (last.bottom < mid && activeRef.current !== sections.length - 1) {
        setActive(sections.length - 1);
      }
    }

    function onScrollStop() {
      if (!enabledRef.current) return;
      if (!isDesktop()) return;
      if (Date.now() < snappingUntil.current) return;
      const sections = sectionRefs.current.filter(Boolean);
      if (sections.length < PAGES.length) return;
      const y = window.scrollY;
      const s5 = sections[PAGES.length - 1];
      const s5Top = s5.getBoundingClientRect().top + y;

      if (y - s5Top >= FOOTER_FREE_GAP) return;
      if (y > s5Top && y - s5Top < FOOTER_FREE_GAP) {
        snappingUntil.current = Date.now() + 750;
        window.scrollTo({ top: s5Top, behavior: reducedMotion() ? 'auto' : 'smooth' });
        return;
      }

      let best = -1;
      let bestAbs = Infinity;
      for (let i = 0; i < sections.length; i += 1) {
        const diff = sections[i].getBoundingClientRect().top;
        const abs = Math.abs(diff);
        if (abs < bestAbs) {
          bestAbs = abs;
          best = i;
        }
      }
      if (best >= 0 && bestAbs <= SNAP_MAX_PULL && bestAbs > 2) {
        const target = sections[best].getBoundingClientRect().top + window.scrollY;
        snappingUntil.current = Date.now() + 750;
        setActive(best);
        window.scrollTo({ top: target, behavior: reducedMotion() ? 'auto' : 'smooth' });
      }
    }

    function onScroll() {
      if (!rafTick.current) {
        rafTick.current = true;
        window.requestAnimationFrame(updateActive);
      }
      if (scrollTimer.current) window.clearTimeout(scrollTimer.current);
      scrollTimer.current = window.setTimeout(onScrollStop, SNAP_DEBOUNCE);
    }

    function onKey(e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (!isDesktop()) return;
      e.preventDefault();
      const cur = activeRef.current;
      if (e.key === 'ArrowDown' && cur < PAGES.length - 1) goTo(cur + 1);
      if (e.key === 'ArrowUp' && cur > 0) goTo(cur - 1);
    }

    updateActive();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('keydown', onKey);
      if (scrollTimer.current) window.clearTimeout(scrollTimer.current);
    };
  }, [goTo]);

  useEffect(() => {
    const els = sectionRefs.current.filter(Boolean);
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add(styles.isVisible));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) en.target.classList.add(styles.isVisible);
        });
      },
      { threshold: 0.25 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logEntries]);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  const expandTerminal = useCallback(() => {
    const el = termRef.current;
    if (!el || isAnimatingRef.current) return;
    if (reducedMotion()) {
      setTermSize('expanded');
      return;
    }
    isAnimatingRef.current = true;
    if (el) el.style.transform = 'none';

    const first = el.getBoundingClientRect();
    inlineHeightRef.current = first.height;

    flushSync(() => {
      setTermSize('expanded');
    });

    const last = el.getBoundingClientRect();
    const deltaX = first.left - last.left;
    const deltaY = first.top - last.top;
    const scaleX = first.width / (last.width || 1);
    const scaleY = first.height / (last.height || 1);

    if (backdropRef.current) {
      backdropRef.current.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 260, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
      );
    }

    const anim = el.animate(
      [
        {
          transformOrigin: 'top left',
          transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})`,
        },
        {
          transformOrigin: 'top left',
          transform: 'none',
        },
      ],
      {
        duration: 270,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'both',
      }
    );

    anim.onfinish = () => {
      anim.cancel();
      isAnimatingRef.current = false;
      termInputRef.current?.focus();
    };
  }, []);

  const restoreTerminal = useCallback(() => {
    const el = termRef.current;
    const placeholder = placeholderRef.current;
    if (!el || isAnimatingRef.current) return;
    if (reducedMotion() || !placeholder) {
      setTermSize('default');
      return;
    }

    isAnimatingRef.current = true;
    const first = el.getBoundingClientRect();
    const last = placeholder.getBoundingClientRect();

    const deltaX = last.left - first.left;
    const deltaY = last.top - first.top;
    const scaleX = last.width / (first.width || 1);
    const scaleY = last.height / (first.height || 1);

    if (backdropRef.current) {
      backdropRef.current.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 240, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
      );
    }

    const anim = el.animate(
      [
        {
          transformOrigin: 'top left',
          transform: 'none',
        },
        {
          transformOrigin: 'top left',
          transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})`,
        },
      ],
      {
        duration: 250,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'forwards',
      }
    );

    anim.onfinish = () => {
      flushSync(() => {
        setTermSize('default');
      });
      anim.cancel();
      isAnimatingRef.current = false;
      termGreenRef.current?.focus();
    };
  }, []);

  /* Escape: terminal phóng to thu nhỏ trở về mặc định (không can thiệp body padding gây giật layout) */
  useEffect(() => {
    if (termSize !== 'expanded') return undefined;
    function onEsc(e) {
      if (e.key === 'Escape') {
        restoreTerminal();
      }
    }
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('keydown', onEsc);
    };
  }, [termSize, restoreTerminal]);

  function toggleSnap() {
    setEnabled((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORE_KEY, next ? '1' : '0');
      } catch {
        /* bỏ qua */
      }
      showToast(`Lookbook snap — ${next ? 'ON' : 'OFF'}`);
      return next;
    });
  }



  /* Dọn dẹp timer trạng thái LED */
  useEffect(() => () => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
  }, []);

  async function executeCommand(raw) {
    const cmd = (raw || '').trim();
    if (!cmd) return;
    setCmdHistory((prev) => [...prev, cmd]);
    setHistoryIdx(-1);

    // Cập nhật đèn LED trạng thái
    setSysStatus('EXEC_RUN');

    if (cmd.toLowerCase() === 'clear') {
      setLogEntries([{ type: 'info', content: '// Terminal cleared. Type any command:' }]);
      setInputValue('');
      setSysStatus('SYS_READY');
      return;
    }
    const next = [...logEntries, { type: 'prompt', cmd }];
    setLogEntries(next);
    setInputValue('');

    // Gửi lệnh thật đến Sandbox Backend
    try {
      let sid = sandboxSessionRef.current;
      if (!sid) {
        const sRes = await fetch('http://127.0.0.1:3001/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (sRes.ok) {
          const sData = await sRes.json();
          sid = sData.sessionId;
          sandboxSessionRef.current = sid;
        }
      }

      if (sid) {
        const res = await fetch(`http://127.0.0.1:3001/api/sessions/${sid}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd }),
        });

        if (res.ok) {
          const data = await res.json();
          const items = [];
          if (data.stdout) {
            items.push({ type: 'output', content: data.stdout.trimEnd() });
          }
          if (data.stderr) {
            items.push({ type: 'error', content: data.stderr.trimEnd() });
          }
          if (data.exitCode !== 0 && !data.stdout && !data.stderr) {
            items.push({ type: 'desc', content: `[Process exited with code ${data.exitCode}]` });
          }
          if (data.cwdUpdated && data.cwd) {
            items.push({ type: 'desc', content: `CWD: ${data.cwd}` });
          }

          setLogEntries((prev) => [...prev, ...items]);
          setSysStatus(data.exitCode === 0 ? 'EXEC_OK' : 'EXEC_ERR');
          if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
          statusTimerRef.current = setTimeout(() => setSysStatus('SYS_READY'), 1400);
          return;
        }
      }
    } catch {
      // Backend offline fallback
    }

    const hit = RESPONSES[cmd.toLowerCase()];
    if (hit) {
      setLogEntries((prev) => [
        ...prev,
        { type: 'output', content: hit.out },
        { type: 'desc', content: hit.desc },
      ]);
      setSysStatus('EXEC_OK');
    } else {
      setLogEntries((prev) => [
        ...prev,
        { type: 'error', content: 'Sandbox backend offline (http://127.0.0.1:3001). Check backend status.' },
      ]);
      setSysStatus('SYS_ERR');
    }
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setSysStatus('SYS_READY'), 1400);
  }

  function handleTermKeyDown(e) {
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
  }

  const setSection = (i) => (el) => {
    sectionRefs.current[i] = el;
  };

  return (
    <div className={styles.lookbook}>
      {/* ===== 01 / START — Hero giữa (cấu trúc cũ) ===== */}
      <section ref={setSection(0)} id="start" aria-labelledby="hero-heading" className={`${styles.section} ${styles.sHero}`}>
        <CyberBackdrop />
        <div className={styles.wrap}>
          <div className={`${styles.heroCenter} ${styles.reveal}`}>
            <span className={styles.pill}><i aria-hidden="true" />{'// 01 / START'}</span>
            <button
              type="button"
              className={styles.meteorTrigger}
              aria-label="BashLab — Play meteor shower"
              title="Play meteor shower"
              onClick={(event) => {
                const button = event.currentTarget;
                if (button.getAnimations().some((animation) => animation.playState === 'running')) return;
                button.closest('section').dispatchEvent(new CustomEvent('bashlab:meteors'));
                if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                  button.animate([{ color: '#249dff' }, { color: '#00ff66' }], { duration: 300 });
                } else {
                  button.animate([
                    { color: '#00ff66' },
                    { color: '#249dff', offset: 0.04 },
                    { color: '#249dff', offset: 0.94 },
                    { color: '#00ff66' },
                  ], { duration: 6500, easing: 'ease-in-out' });
                }
              }}
            >
              <svg width="137.5" height="100" viewBox="0 0 88 64" fill="none" aria-hidden="true">
                <path d="M12 12L36 32L12 52M48 52H76" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h1 id="hero-heading" className={styles.h1}>
              Every command starts<br />
              with <CuriosityWord />.
            </h1>
            <p className={styles.body} style={{ maxWidth: 600, textAlign: 'center', marginTop: 14 }}>
              Learn Bash one small step at a time. Try a command, understand what it does, and build confidence through guided practice.
            </p>
            <div className={styles.heroCtas}>
              <a href="/courses" className={styles.btnPrimary}>
                <span>Start learning</span>
                <span aria-hidden="true">→</span>
              </a>
              <button type="button" className={styles.btnSecondary} onClick={() => goTo(1)}>
                <span>Try your first command</span>
                <span aria-hidden="true">↓</span>
              </button>
            </div>
            <p className={styles.heroPwd}>
              <b>$ pwd</b>
              <span>— Start with a simple question: where am I?</span>
            </p>
          </div>
        </div>
      </section>

      {/* ===== 02 / TRY — trái text 40 / phải terminal 60 ===== */}
      <section ref={setSection(1)} id="try" aria-labelledby="try-heading" className={`${styles.section} ${styles.sTry}`}>
        <div aria-hidden="true" className={styles.tick} style={{ backgroundColor: '#00FF66' }} />
        <div className={styles.wrap}>
          <div className={styles.tryGrid}>
            <div className={`${styles.tryCol} ${styles.reveal} ${styles.tryIntro}`}>
              <span className={`${styles.label} ${styles.labelCyan}`}>{'// 02 / TRY'}</span>
              <h2 id="try-heading" className={styles.h2}>Ask the terminal where you are.</h2>
              <div className={styles.bottomNote}>
                <p className={styles.smallNote}>You have seen a command. Next, learn when and why to use it.</p>
              </div>
            </div>
            <div className={`${styles.tryCol} ${styles.reveal}`}>
              {termSize === 'closed' ? (
                <div className={styles.termClosed}>
                  <span>Terminal closed — session preserved.</span>
                  <button
                    ref={termReopenRef}
                    type="button"
                    className={styles.termReopen}
                    onClick={() => setTermSize('default')}
                  >
                    <i aria-hidden="true" />
                    Reopen terminal
                  </button>
                </div>
              ) : (
              <>
              {termSize === 'expanded' && (
                <>
                  <div
                    ref={backdropRef}
                    aria-hidden="true"
                    className={styles.termBackdrop}
                    onClick={restoreTerminal}
                  />
                  <div
                    ref={placeholderRef}
                    className={styles.termPlaceholder}
                    style={{ height: inlineHeightRef.current }}
                    aria-hidden="true"
                  />
                </>
              )}
              <div className={styles.termStage}>
                {termSize === 'default' && (
                  <div className={styles.termAura} aria-hidden="true" />
                )}

                <div
                  ref={termRef}
                  className={`${styles.term} ${termSize === 'minimized' ? styles.termMin : ''} ${termSize === 'expanded' ? styles.termMax : ''}`}
                  aria-label="Interactive terminal demo"
                >

                  <div
                    className={styles.termHead}
                    onClick={(e) => {
                      if (termSize === 'minimized' && !e.target.closest('button')) {
                        setTermSize('default');
                      }
                    }}
                  >
                    <span className={styles.termDots} role="group" aria-label="Terminal window controls">
                      <button
                        type="button"
                        className={styles.termCtl}
                        title="Close terminal"
                        aria-label="Close terminal (keep session)"
                        onClick={() => {
                          setTermSize('closed');
                          window.requestAnimationFrame(() => termReopenRef.current?.focus());
                        }}
                      >
                        <span className={styles.termDot} style={{ background: '#ff5f56' }} aria-hidden="true">
                          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M3 3l6 6M9 3l-6 6" />
                          </svg>
                        </span>
                      </button>
                      <button
                        type="button"
                        className={styles.termCtl}
                        title="Minimize"
                        aria-label="Shrink terminal one step (press again to collapse fully)"
                        aria-pressed={termSize === 'minimized'}
                        data-active={termSize === 'minimized'}
                        onClick={() => {
                          /* Thu từng nấc: expanded → default → minimized; minimized → default */
                          if (termSize === 'expanded') {
                            restoreTerminal();
                          } else {
                            setTermSize((prev) => (prev === 'default' ? 'minimized' : 'default'));
                          }
                        }}
                      >
                        <span className={styles.termDot} style={{ background: '#ffbd2e' }} aria-hidden="true">
                          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M2.5 6h7" />
                          </svg>
                        </span>
                      </button>
                      <button
                        ref={termGreenRef}
                        type="button"
                        className={styles.termCtl}
                        title={termSize === 'expanded' ? 'Restore terminal' : 'Expand terminal'}
                        aria-label={termSize === 'expanded' ? 'Restore terminal' : 'Expand terminal'}
                        aria-pressed={termSize === 'expanded'}
                        data-active={termSize === 'expanded'}
                        onClick={() => {
                          if (termSize === 'expanded') {
                            restoreTerminal();
                          } else {
                            expandTerminal();
                          }
                        }}
                      >
                        <span className={styles.termDot} style={{ background: '#27c93f' }} aria-hidden="true">
                          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7.3 2H10v2.7M10 7.3V10H7.3M4.7 10H2V7.3M2 4.7V2h2.7" />
                          </svg>
                        </span>
                      </button>
                      <span style={{ marginLeft: 8 }}>guest@bashlab:~$</span>
                    </span>
                    <div className={styles.termHeadRight}>
                      <div className={styles.termStatusBadge}>
                        <span
                          className={`${styles.statusLed} ${sysStatus === 'EXEC_OK' ? styles.statusLedActive : ''}`}
                          aria-hidden="true"
                        />
                        <span className={styles.statusText}>{sysStatus}</span>
                      </div>
                      <span className={styles.termDemoHint}>Interactive demo</span>
                    </div>
                  </div>
                  <div className={styles.termBody}>
                    <div className={styles.termBodyInner}>
                  <div ref={logRef} className={styles.termLog} role="log" aria-live="polite" aria-label="Terminal output">
                    {logEntries.map((e, i) => {
                      if (e.type === 'prompt') {
                        return (
                          <div key={i}>
                            <span className={styles.termPrompt}>guest@bashlab:~$ </span>
                            <span className={styles.termCmd}>{e.cmd}</span>
                          </div>
                        );
                      }
                      if (e.type === 'output') return <div key={i} className={styles.termOut} style={{ whiteSpace: 'pre-wrap' }}>{e.content}</div>;
                      if (e.type === 'error') return <div key={i} style={{ color: '#ff5f56', paddingLeft: 16, whiteSpace: 'pre-wrap' }}>{e.content}</div>;
                      if (e.type === 'desc') return <div key={i} className={styles.termDesc}>{e.content}</div>;
                      return <div key={i} style={{ color: 'var(--lb-faint)' }}>{e.content}</div>;
                    })}
                  </div>
                  <div className={styles.termInputRow}>
                    <span className={styles.termPrompt}>guest@bashlab:~$</span>
                    <input
                      ref={termInputRef}
                      className={styles.termInput}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleTermKeyDown}
                      placeholder="Type pwd, ls, whoami, help..."
                      spellCheck={false}
                      autoComplete="off"
                      aria-label="Command input"
                    />
                    <button className={styles.runBtn} type="button" onClick={() => executeCommand(inputValue)}>RUN</button>
                  </div>
                  <div className={styles.termChips}>
                    <div className={styles.chipGroup} role="group" aria-label="Suggested commands">
                      {['pwd', 'ls', 'whoami', 'help'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => executeCommand(c)}
                          className={`${styles.chip} ${c === 'pwd' ? styles.chipPrimary : ''}`}
                          aria-label={`Run ${c} command`}
                        >
                          {c === 'pwd' ? '▶ Run demo command: pwd' : c}
                        </button>
                      ))}
                    </div>
                    <button className={styles.clearBtn} type="button" onClick={() => executeCommand('clear')}>CLEAR</button>
                  </div>
                    </div>
                  </div>
                </div>
              </div>
              </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== 03 / LEARN — trái 3 rows 58 / phải heading 42 ===== */}
      <section ref={setSection(2)} id="learn" aria-labelledby="learn-heading" className={`${styles.section} ${styles.sLearn}`}>
        <div aria-hidden="true" className={styles.tick} style={{ backgroundColor: '#00E5FF' }} />
        <div className={styles.wrap}>
          <div className={styles.learnGrid}>
            <div className={`${styles.learnSteps} ${styles.reveal}`}>
              <div className={styles.pipelineWrap}>
                {/* 3 Cyber Pipeline Glass Cards */}
                <div className={styles.pipeList}>
                  {PIPELINE_STEPS.map((step, idx) => (
                    <div
                      key={step.num}
                      className={styles.pipeItem}
                      style={{
                        '--node-color': step.color,
                        '--node-glow': step.glow,
                        '--card-accent': step.color,
                        '--card-glow': step.glow,
                        '--tag-color': step.color,
                        '--tag-border': `${step.color}45`,
                        '--tag-bg': `${step.color}10`,
                        '--tag-bg-hover': `${step.color}22`,
                        '--tag-glow': step.glow,
                        '--icon-bg': `${step.color}18`,
                      }}
                    >
                      {/* Neon Node + Connector Segment */}
                      <div className={styles.pipeCol} aria-hidden="true">
                        <div className={styles.pipeNode}>
                          <span>{step.num}</span>
                        </div>
                        {idx === 0 && <div className={`${styles.pipeSegment} ${styles.pipeSegment1}`} />}
                        {idx === 1 && <div className={`${styles.pipeSegment} ${styles.pipeSegment2}`} />}
                      </div>

                      {/* Glassmorphism Card */}
                      <div className={styles.pipeCard}>
                        <div className={styles.pipeCardHead}>
                          <div className={styles.pipeTitleGroup}>
                            <div className={styles.pipeIcon} style={{ color: step.color }}>
                              {step.icon}
                            </div>
                            <h3 className={styles.pipeCardTitle}>{step.title}</h3>
                          </div>
                          <span className={styles.pipeTag}>{step.tag}</span>
                        </div>

                        <p className={styles.pipeDesc}>{step.desc}</p>

                        <div className={styles.pipeFoot}>
                          <span className={styles.pipeFootDot} />
                          <span>{step.subtext}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className={`${styles.learnSide} ${styles.reveal}`}>
              <span className={`${styles.label} ${styles.labelGreen}`}>{'// 03 / LEARN'}</span>
              <h2 id="learn-heading" className={styles.h2}>
                Understand it. Try it.<br />
                <span style={{ color: 'var(--lb-accent)' }}>Make it stick.</span>
              </h2>
              <p className={styles.body}>
                Learn Bash through hands-on practice. Read a quick visual guide, run real commands in your browser, and get instant feedback.
              </p>
              <div className={styles.learnFeatures}>
                <div className={styles.learnFeatureItem} style={{ '--feat-color': '#00FF66', '--feat-bg': 'rgba(0, 255, 102, 0.08)', '--feat-border': 'rgba(0, 255, 102, 0.25)' }}>
                  <span className={styles.learnFeatureNum}>01</span>
                  <span>Visual guides, no memorization</span>
                </div>
                <div className={styles.learnFeatureItem} style={{ '--feat-color': '#00E5FF', '--feat-bg': 'rgba(0, 229, 255, 0.08)', '--feat-border': 'rgba(0, 229, 255, 0.25)' }}>
                  <span className={styles.learnFeatureNum}>02</span>
                  <span>Real Linux terminal in your browser</span>
                </div>
                <div className={styles.learnFeatureItem} style={{ '--feat-color': '#FFB800', '--feat-bg': 'rgba(255, 184, 0, 0.08)', '--feat-border': 'rgba(255, 184, 0, 0.25)' }}>
                  <span className={styles.learnFeatureNum}>03</span>
                  <span>Instant pass/fail checks on every lesson</span>
                </div>
              </div>
              <div className={styles.bottomNote}>
                <p className={styles.smallNote}>Shell 101 turns these simple steps into lasting muscle memory.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 04 / COURSE — spotlight Shell 101 Bento Grid ===== */}
      <section ref={setSection(3)} id="course" aria-labelledby="course-heading" className={`${styles.section} ${styles.sCourse}`}>
        <div aria-hidden="true" className={styles.tick} style={{ backgroundColor: '#00FF66' }} />
        <div className={styles.wrap}>
          <div className={`${styles.courseHead} ${styles.reveal}`}>
            <div className={styles.courseHeadRow}>
              <div>
                <span className={`${styles.label} ${styles.labelGreen}`}>{'// 04 / COURSE'}</span>
                <h2 id="course-heading" className={styles.h2}>Your next command starts in Shell 101.</h2>
              </div>
              <div className={styles.philosophyTag} aria-hidden="true">
                <span>PRACTICE</span>
                <span className={styles.tagArrow}>&gt;</span>
                <span>LEARN</span>
                <span className={styles.tagArrow}>&gt;</span>
                <span>BUILD</span>
                <span className={styles.tagArrow}>&gt;</span>
                <span>BELONG</span>
              </div>
            </div>
          </div>

          <CourseBento onPractice={() => goTo(1)} />
        </div>
      </section>

      {/* ===== 05 / QUESTIONS — trái intro 40 / phải accordion 60 ===== */}
      <section ref={setSection(4)} id="questions" aria-labelledby="faq-heading" className={`${styles.section} ${styles.sFaq}`}>
        <div aria-hidden="true" className={styles.tick} style={{ backgroundColor: '#00E5FF' }} />
        <div className={styles.wrap}>
          <div className={styles.faqGrid}>
            <div className={styles.reveal}>
              <span className={`${styles.label} ${styles.labelMuted}`}>{'// 05 / QUESTIONS'}</span>
              <h2 id="faq-heading" className={styles.h2}>Ready when you are.</h2>
              <p className={styles.body}>
                Zero local configuration, risk-free sandboxes, and tracked completion. Jump into an exercise whenever you are ready to experiment.
              </p>
              <a href="/courses" className={styles.exploreLink}>
                <span>Explore courses</span>
                <span aria-hidden="true">→</span>
              </a>
            </div>
            <div className={`${styles.faqList} ${styles.reveal}`}>
              {FAQS.map((f, i) => (
                <div key={f.q} className={styles.faqItem} data-open={openAcc === i}>
                  <button
                    type="button"
                    className={styles.faqBtn}
                    aria-expanded={openAcc === i}
                    onClick={() => setOpenAcc(openAcc === i ? null : i)}
                  >
                    <span>{f.q}</span>
                    <span className={styles.faqIcon} aria-hidden="true">{openAcc === i ? '−' : '+'}</span>
                  </button>
                  <div className={styles.faqPanel}>
                    <div className={styles.faqInner}><p>{f.a}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Right-Rail 28px: dot + divider + toggle một trục ===== */}
      <nav className={styles.rail} aria-label="Lookbook pages">
        <div className={styles.railStack}>
          {PAGES.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={styles.dotWrap}
              aria-label={`Go to ${p.label}`}
              aria-current={active === i}
              onClick={() => goTo(i)}
            >
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.tooltip} aria-hidden="true">{`0${i + 1} · ${p.label}`}</span>
            </button>
          ))}
        </div>
        <div className={styles.railDivider} aria-hidden="true" />
        <div className={styles.toggleWrap}>
          <button
            type="button"
            className={styles.toggle}
            aria-pressed={enabled}
            aria-label={`Lookbook snap ${enabled ? 'on' : 'off'}. Activate to toggle.`}
            title="Toggle Lookbook snap"
            onClick={toggleSnap}
          >
            LB
          </button>
          <span className={styles.toggleTip} aria-hidden="true">
            Lookbook: {enabled ? 'ON' : 'OFF'}
          </span>
        </div>
      </nav>

      <div className={`${styles.toast} ${toast ? styles.toastShow : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}
