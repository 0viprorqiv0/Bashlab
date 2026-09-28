'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './LessonWorkspace.module.css';
import Markdown from '@/components/shared/Markdown';
import { supabase } from '@/lib/supabaseClient';
import {
  fetchCourse, fetchProgressMap, getCurrentUser, lessonHref, lessonStates, markLessonDone,
} from '@/lib/learning';
import {
  checkSolution, createSession, endSession, resetSession, runCommand, sandboxEnabled,
} from '@/lib/sandbox';

function Icon({ name }) { return <span className="material-symbols-outlined" aria-hidden="true">{name}</span>; }

const QUICK_COMMANDS = ['pwd', 'ls -la', 'cat README.md', 'clear'];
const HOME = '/home/student';
const shortCwd = (cwd) => (cwd === HOME ? '~' : cwd.startsWith(`${HOME}/`) ? `~${cwd.slice(HOME.length)}` : cwd);

export default function LessonWorkspace({ courseSlug, lessonSlug }) {
  const router = useRouter();
  const [page, setPage] = useState({ loading: true });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const course = await fetchCourse(courseSlug);
      const summary = course?.lessons.find((item) => item.slug === lessonSlug);
      if (!course || !summary) {
        if (!cancelled) setPage({ loading: false, notFound: true });
        return;
      }
      const progressMap = await fetchProgressMap(user.id);
      const states = lessonStates(course, progressMap);
      if (states.get(summary.id) === 'locked') {
        router.replace(`/courses/${courseSlug}`);
        return;
      }
      const { data: lesson } = await supabase
        .from('lessons')
        .select('id, slug, title, content_md, objectives, test_template, chapter_id')
        .eq('id', summary.id)
        .single();
      // Record that the learner opened this lesson (never downgrades "done").
      await supabase.from('progress').upsert(
        { user_id: user.id, lesson_id: lesson.id, status: 'in_progress', updated_at: new Date().toISOString() },
        { onConflict: 'user_id,lesson_id', ignoreDuplicates: true },
      );
      if (!cancelled) {
        setPage({ loading: false, user, course, lesson, done: states.get(summary.id) === 'done' });
      }
    })();
    return () => { cancelled = true; };
  }, [courseSlug, lessonSlug, router]);

  if (page.loading) return null;
  if (page.notFound) {
    return (
      <div className={styles.notFound}>
        <h1>Lesson not found.</h1>
        <p>This lesson does not exist or is not published.</p>
        <a href={`/courses/${courseSlug}`}>Back to course</a>
      </div>
    );
  }
  return <Workspace key={page.lesson.id} {...page} />;
}

function Workspace({ user, course, lesson, done: initiallyDone }) {
  const [done, setDone] = useState(initiallyDone);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState(null); // { passed, checks, message }
  const [checking, setChecking] = useState(false);

  const verifier = lesson.test_template?.verifier || null;
  const hint = lesson.test_template?.hint || null;
  const objectives = lesson.objectives || [];
  const index = course.lessons.findIndex((item) => item.id === lesson.id);
  const prev = course.lessons[index - 1] || null;
  const next = course.lessons[index + 1] || null;
  const chapter = course.chapters.find((item) => item.id === lesson.chapter_id);

  const terminal = useSandbox(user, lesson);

  const complete = useCallback(async () => {
    const { error } = await markLessonDone(user.id, lesson.id);
    if (error) {
      setFeedback({ passed: false, message: error.message });
      return;
    }
    setDone(true);
  }, [user.id, lesson.id]);

  const handleCheck = useCallback(async () => {
    if (checking) return;
    if (!verifier) {
      await complete();
      setFeedback({ passed: true, message: 'Lesson marked as complete.' });
      return;
    }
    if (!terminal.sessionId) {
      setFeedback({ passed: false, message: 'The sandbox is not connected, so your work cannot be checked.' });
      return;
    }
    setChecking(true);
    try {
      const result = await checkSolution(terminal.sessionId, verifier);
      setFeedback({ passed: result.passed, checks: result.checks });
      if (result.passed) await complete();
    } catch (error) {
      setFeedback({ passed: false, message: error.message });
    } finally {
      setChecking(false);
    }
  }, [checking, verifier, terminal.sessionId, complete]);

  useEffect(() => {
    function onKey(event) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        handleCheck();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCheck]);

  const canCheck = verifier ? Boolean(terminal.sessionId) : !done;

  return (
    <div className={styles.page}>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <a href="/courses">Courses</a><span>/</span>
        <a href={`/courses/${course.slug}`}>{course.title}</a><span>/</span>
        <span>{chapter?.title}</span>
      </nav>

      <div className={styles.layout}>
        <article className={styles.lesson}>
          <div className={styles.lessonTop}>
            <span className={styles.counter}>Lesson {index + 1} of {course.lessons.length}</span>
            {done && <span className={styles.doneBadge}><Icon name="check_circle" /> Completed</span>}
          </div>
          <Markdown>{lesson.content_md}</Markdown>

          {objectives.length > 0 && (
            <section className={styles.objectives} aria-labelledby="objectives-title">
              <h2 id="objectives-title">Objectives</h2>
              <ul>
                {objectives.map((item, i) => {
                  const check = feedback?.checks?.[i];
                  const passed = done || check?.passed;
                  return (
                    <li key={item} className={passed ? styles.objectiveDone : ''}>
                      <Icon name={passed ? 'check_circle' : check && !check.passed ? 'cancel' : 'radio_button_unchecked'} />
                      {item}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {hint && (
            <div className={styles.hint}>
              <button type="button" onClick={() => setShowHint((value) => !value)} aria-expanded={showHint}>
                <Icon name="lightbulb" /> {showHint ? 'Hide hint' : 'Show hint'}
              </button>
              {showHint && <p>{hint}</p>}
            </div>
          )}

          <div className={styles.lessonNav}>
            {prev ? <a href={lessonHref(course.slug, prev.slug)}><Icon name="arrow_back" /> {prev.title}</a> : <span />}
            {next && (done
              ? <a href={lessonHref(course.slug, next.slug)}>{next.title} <Icon name="arrow_forward" /></a>
              : <span className={styles.navLocked} title="Complete this lesson to unlock the next one">{next.title} <Icon name="lock" /></span>)}
          </div>
        </article>

        <section className={styles.practice} aria-label="Practice terminal">
          <Terminal {...terminal} />

          <div className={styles.checkBar}>
            {feedback && (
              <div className={`${styles.feedback} ${feedback.passed ? styles.pass : styles.fail}`} role="status">
                <strong>{feedback.passed ? 'Nice work!' : 'Not quite yet'}</strong>
                {feedback.message && <p>{feedback.message}</p>}
                {feedback.checks && (
                  <ul>{feedback.checks.map((item) => <li key={item.name}><Icon name={item.passed ? 'check' : 'close'} />{item.name}</li>)}</ul>
                )}
                {feedback.passed && next && <a href={lessonHref(course.slug, next.slug)}>Next lesson: {next.title} <Icon name="arrow_forward" /></a>}
                {feedback.passed && !next && <a href={`/courses/${course.slug}`}>Course complete — back to overview <Icon name="arrow_forward" /></a>}
              </div>
            )}
            <div className={styles.checkActions}>
              <button type="button" className={styles.checkButton} onClick={handleCheck} disabled={checking || !canCheck}>
                {checking ? 'Checking…' : verifier ? 'Check Solution' : done ? 'Completed' : 'Mark as complete'}
                <kbd>Ctrl+Enter</kbd>
              </button>
              {verifier && !terminal.sessionId && !done && (
                <button type="button" className={styles.skipButton} onClick={async () => { await complete(); setFeedback({ passed: true, message: 'Marked complete without an automatic check (sandbox offline).' }); }}>
                  Mark complete anyway
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// Owns the sandbox session for this lesson: creates it, runs commands, keeps
// practice_sessions (used by My Learning / Activity) in sync, cleans up on leave.
function useSandbox(user, lesson) {
  const [status, setStatus] = useState(sandboxEnabled ? 'connecting' : 'disabled');
  const [sessionId, setSessionId] = useState(null);
  const [cwd, setCwd] = useState(HOME);
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const recordRef = useRef(null);

  const openSession = useCallback(async () => {
    setStatus('connecting');
    try {
      const session = await createSession();
      setSessionId(session.sessionId);
      setCwd(session.cwd || HOME);
      setStatus('ready');
      const { data } = await supabase.from('practice_sessions').insert({
        user_id: user.id, lesson_id: lesson.id, sandbox_session_id: session.sessionId, status: 'active',
      }).select('id').single();
      recordRef.current = data?.id || null;
      return session.sessionId;
    } catch {
      setStatus('offline');
      return null;
    }
  }, [user.id, lesson.id]);

  useEffect(() => {
    if (!sandboxEnabled) return undefined;
    let id = null;
    openSession().then((value) => { id = value; });
    return () => {
      if (id) endSession(id);
      if (recordRef.current) {
        supabase.from('practice_sessions').update({ status: 'stopped', last_active_at: new Date().toISOString() })
          .eq('id', recordRef.current).then(() => {});
      }
    };
  }, [openSession]);

  const touch = () => {
    if (recordRef.current) {
      supabase.from('practice_sessions').update({ last_active_at: new Date().toISOString() })
        .eq('id', recordRef.current).then(() => {});
    }
  };

  const run = async (raw) => {
    const command = raw.trim();
    if (!command || busy) return;
    if (command === 'clear') {
      setLog([]);
      return;
    }
    setLog((prev) => [...prev, { type: 'prompt', cwd, text: command }]);
    if (!sessionId) {
      setLog((prev) => [...prev, { type: 'error', text: 'Sandbox is not connected.' }]);
      return;
    }
    setBusy(true);
    try {
      let result;
      try {
        result = await runCommand(sessionId, command);
      } catch (error) {
        if (error.code !== 'SESSION_NOT_FOUND') throw error;
        // Idle sessions are reaped by the backend; start a fresh one and retry.
        const fresh = await openSession();
        if (!fresh) throw error;
        setLog((prev) => [...prev, { type: 'info', text: 'Session expired — started a new sandbox (files were reset).' }]);
        result = await runCommand(fresh, command);
      }
      const lines = [];
      if (result.stdout) lines.push({ type: 'out', text: result.stdout.replace(/\n$/, '') });
      if (result.stderr) lines.push({ type: 'error', text: result.stderr.replace(/\n$/, '') });
      if (result.termination === 'timeout') lines.push({ type: 'error', text: 'Command timed out.' });
      if (result.quotaExceeded) lines.push({ type: 'error', text: result.quotaError });
      setLog((prev) => [...prev, ...lines]);
      if (result.cwdUpdated && result.cwd) setCwd(result.cwd);
      touch();
    } catch (error) {
      setLog((prev) => [...prev, { type: 'error', text: error.message }]);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!sessionId) return;
    await resetSession(sessionId).catch(() => {});
    setCwd(HOME);
    setLog([{ type: 'info', text: 'Workspace reset.' }]);
  };

  return { status, sessionId, cwd, log, busy, run, reset, clear: () => setLog([]), retry: openSession };
}

const STATUS_TEXT = {
  disabled: 'Sandbox not configured',
  connecting: 'Starting sandbox…',
  ready: 'Sandbox ready',
  offline: 'Sandbox offline',
};

function Terminal({ status, cwd, log, busy, run, reset, clear, retry }) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef(null);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [log]);

  function submit(command) {
    if (!command.trim()) return;
    setHistory((prev) => [...prev, command]);
    setHistoryIndex(-1);
    setInput('');
    run(command);
  }

  function onKeyDown(event) {
    if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      submit(input);
    } else if (event.key === 'ArrowUp' && history.length) {
      event.preventDefault();
      const nextIndex = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInput(history[nextIndex]);
    } else if (event.key === 'ArrowDown' && historyIndex >= 0) {
      event.preventDefault();
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex >= history.length ? -1 : nextIndex);
      setInput(nextIndex >= history.length ? '' : history[nextIndex]);
    }
  }

  function copyOutput() {
    const text = log.map((line) => (line.type === 'prompt' ? `$ ${line.text}` : line.text)).join('\n');
    navigator.clipboard?.writeText(text);
  }

  return (
    <div className={styles.terminal}>
      <div className={styles.termBar}>
        <span className={`${styles.statusDot} ${styles[status]}`} />
        <span className={styles.statusText}>{STATUS_TEXT[status]}</span>
        <div className={styles.termActions}>
          {status === 'offline' && <button type="button" onClick={retry}>Retry</button>}
          <button type="button" onClick={copyOutput} aria-label="Copy output"><Icon name="content_copy" /></button>
          <button type="button" onClick={clear} aria-label="Clear output"><Icon name="delete_sweep" /></button>
          <button type="button" onClick={reset} disabled={status !== 'ready'} aria-label="Reset workspace files"><Icon name="restart_alt" /></button>
        </div>
      </div>

      <div className={styles.output} ref={outputRef} data-lenis-prevent aria-live="polite">
        {status === 'disabled' && <p className={styles.info}>Set NEXT_PUBLIC_SANDBOX_API_URL and run the backend sandbox to practice here.</p>}
        {status === 'offline' && <p className={styles.error}>Cannot reach the sandbox backend. Start it with `npm start` in backend/ and press Retry.</p>}
        {log.map((line, i) => (
          line.type === 'prompt'
            ? <p key={i}><span className={styles.prompt}>student@bashlab:{shortCwd(line.cwd)}$</span> {line.text}</p>
            : <pre key={i} className={styles[line.type]}>{line.text}</pre>
        ))}
        {busy && <p className={styles.info}>Running…</p>}
      </div>

      <div className={styles.inputRow}>
        <span className={styles.prompt}>student@bashlab:{shortCwd(cwd)}$</span>
        <input
          aria-label="Command input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={status !== 'ready'}
          placeholder={status === 'ready' ? 'Type a command and press Enter' : ''}
          spellCheck={false}
          autoComplete="off"
        />
      </div>
      <div className={styles.chips}>
        {QUICK_COMMANDS.map((command) => (
          <button type="button" key={command} onClick={() => submit(command)} disabled={status !== 'ready'}>{command}</button>
        ))}
      </div>
    </div>
  );
}
