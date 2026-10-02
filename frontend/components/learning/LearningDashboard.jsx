'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './LearningDashboard.module.css';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/auth/AuthProvider';
import { authClient } from '@/lib/authClient';
import { PageError, PageLoading } from '@/components/shared/Loading';
import {
  courseStats, fetchProgressMap, fetchPublishedCourses, lessonHref,
} from '@/lib/learning';

const dateLabel = (date, options) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });
const fullDate = (date) => dateLabel(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
function Icon({ name }) { return <span className="material-symbols-outlined" aria-hidden="true">{name}</span>; }

// One entry per day for the last 365 days, built from real practice sessions
// (minutes) and completed lessons. A day counts as active if either happened.
function buildDays(sessions, progressRows) {
  const byDate = new Map();
  const entry = (date) => {
    if (!byDate.has(date)) byDate.set(date, { minutes: 0, sessions: 0, lessons: 0 });
    return byDate.get(date);
  };
  for (const session of sessions) {
    const minutes = Math.max(1, Math.round((new Date(session.last_active_at) - new Date(session.started_at)) / 60000));
    const day = entry(session.started_at.slice(0, 10));
    day.minutes += minutes;
    day.sessions += 1;
  }
  for (const row of progressRows) {
    if (row.status === 'done' && row.completed_at) entry(row.completed_at.slice(0, 10)).lessons += 1;
  }

  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: 365 }, (_, index) => {
    const date = new Date(today - (364 - index) * 86400000).toISOString().slice(0, 10);
    const { minutes, sessions: count, lessons } = byDate.get(date) || { minutes: 0, sessions: 0, lessons: 0 };
    let level = 0;
    if (minutes >= 60) level = 4;
    else if (minutes >= 30) level = 3;
    else if (minutes >= 15) level = 2;
    else if (minutes > 0 || lessons > 0) level = 1;
    return { date, level, minutes, sessions: count, lessons };
  });
}

async function loadDashboard(userId) {
  const [courses, progressMap, sessionsResult] = await Promise.all([
    fetchPublishedCourses(),
    fetchProgressMap(userId),
    supabase.from('practice_sessions').select('started_at, last_active_at').eq('user_id', userId),
  ]);
  const withStats = courses.map((course) => ({ course, ...courseStats(course, progressMap) }));
  const lastTouched = (course) => Math.max(0, ...course.lessons.map((lesson) => {
    const row = progressMap.get(lesson.id);
    return row ? new Date(row.updated_at).getTime() : 0;
  }));
  const current = withStats
    .filter((item) => item.done < item.total)
    .sort((a, b) => lastTouched(b.course) - lastTouched(a.course))[0] || withStats[0] || null;

  return {
    current,
    completedCourses: withStats.filter((item) => item.total > 0 && item.done === item.total).length,
    totalCourses: withStats.length,
    // Counted against published lessons only, the same list the course pages show.
    lessonsDone: withStats.reduce((sum, item) => sum + item.done, 0),
    days: buildDays(sessionsResult.data || [], [...progressMap.values()]),
  };
}

export default function LearningDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);

  // Start loading as soon as there is a stored session; the API's identity
  // check (useAuth) runs in parallel and can still bounce us to /login.
  useEffect(() => {
    const userId = authClient.peekUserId();
    if (!userId) {
      router.replace('/login?next=%2Fmy-learning');
      return undefined;
    }
    let cancelled = false;
    loadDashboard(userId)
      .then((loaded) => { if (!cancelled) setData(loaded); })
      .catch(() => { if (!cancelled) setLoadError('We could not load your learning data.'); });
    return () => { cancelled = true; };
  }, [router, attempt]);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login?next=%2Fmy-learning');
  }, [authLoading, user, router]);

  if (loadError) return <PageError message={loadError} onRetry={() => { setLoadError(''); setAttempt((n) => n + 1); }} />;
  if (!data) return <PageLoading label="Loading your progress…" />;
  return <Dashboard {...data} />;
}

function Dashboard({ current, completedCourses, totalCourses, lessonsDone, days }) {
  const [range, setRange] = useState(365);
  const [selectedDate, setSelectedDate] = useState(days[days.length - 1].date);
  const calendarRef = useRef(null);
  const visibleDays = days.slice(-range);
  const startOffset = new Date(`${visibleDays[0].date}T00:00:00Z`).getUTCDay();
  const cells = [...Array(startOffset).fill(null), ...visibleDays];
  const weeks = Math.ceil(cells.length / 7);
  const activeDays = visibleDays.filter((day) => day.level > 0).length;
  const totalMinutes = days.reduce((sum, day) => sum + day.minutes, 0);
  let streak = 0;
  for (let index = days.length - 1; index >= 0 && days[index].level > 0; index--) streak++;
  const percent = current && current.total ? Math.round((current.done / current.total) * 100) : 0;
  const courseState = !current || current.done === 0 ? 'Not started' : current.done === current.total ? 'Completed' : 'In progress';
  const startHref = current?.next
    ? lessonHref(current.course.slug, current.next.slug)
    : current ? `/courses/${current.course.slug}` : '/courses';

  useEffect(() => {
    if (calendarRef.current) calendarRef.current.scrollLeft = calendarRef.current.scrollWidth;
  }, [range]);

  function changeRange(event) {
    const nextRange = Number(event.target.value);
    setRange(nextRange);
    if (selectedDate < days[days.length - nextRange].date) setSelectedDate(days[days.length - 1].date);
  }

  function navigateDays(event) {
    const movement = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
    if (!(event.key in movement) || !event.target.dataset.date) return;
    event.preventDefault();
    const index = visibleDays.findIndex((day) => day.date === event.target.dataset.date);
    const next = visibleDays[Math.max(0, Math.min(visibleDays.length - 1, index + movement[event.key]))];
    setSelectedDate(next.date);
    const scroller = calendarRef.current;
    const button = scroller.querySelector(`[data-date="${next.date}"]`);
    button?.focus({ preventScroll: true });
    if (button) {
      const bounds = button.getBoundingClientRect();
      const viewport = scroller.getBoundingClientRect();
      if (bounds.left < viewport.left) scroller.scrollLeft -= viewport.left - bounds.left + 12;
      if (bounds.right > viewport.right) scroller.scrollLeft += bounds.right - viewport.right + 12;
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><h1>My Learning<span>.</span></h1><p>Build a little every day. See how far you go.</p></div>
        <Link className={styles.browseLink} href="/courses" aria-label="Browse courses">Browse courses <Icon name="arrow_outward" /></Link>
      </header>

      {current ? (
        <section className={styles.journey} aria-label="Your current course">
          <div className={styles.courseMark} aria-hidden="true"><img src="/auth/binary-hacker-bashlab.png" alt="" /></div>
          <div className={styles.courseCopy}>
            <div className={styles.courseMeta}><span>{courseState}</span><span>{current.course.category}</span></div>
            <h2>{current.course.title}</h2>
            <p>{current.done} of {current.total} lessons completed</p>
          </div>
          <div className={styles.courseAction}>
            <Link href={startHref}>
              {current.done === 0 ? 'Start learning' : 'Continue learning'} <Icon name="arrow_forward" />
            </Link>
            <div className={styles.courseProgress} role="progressbar" aria-label={`${current.course.title} progress`} aria-valuenow={current.done} aria-valuemin={0} aria-valuemax={current.total}><span style={{ width: `${percent}%` }} /></div>
          </div>
        </section>
      ) : (
        <section className={styles.journey} aria-label="No courses yet">
          <div className={styles.courseCopy}><h2>No courses available yet.</h2><p>Check back soon.</p></div>
        </section>
      )}

      <section className={styles.overview} aria-label="Learning overview">
        <dl className={styles.stats}>
          <div><dt>Completed courses</dt><dd>{completedCourses} <small>/ {totalCourses}</small></dd></div>
          <div><dt>Lessons mastered</dt><dd>{lessonsDone}</dd></div>
          <div><dt>Practice hours</dt><dd>{(totalMinutes / 60).toFixed(1)} <small>hrs</small></dd></div>
          <div className={styles.streakStat}><dt><Icon name="local_fire_department" /> Day streak</dt><dd>{streak} <small>days</small></dd></div>
        </dl>
      </section>

      <section className={styles.activity} aria-labelledby="practice-title">
        <header className={styles.activityHeader}>
          <div><h2 id="practice-title">{activeDays ? 'Consistency looks good on you.' : 'Your streak starts with one command.'}</h2><p>Practice activity <span>·</span> <strong>{activeDays}</strong> active days in this period</p></div>
          <div className={styles.activityControls}>
            <label className={styles.rangeControl}>
              <span className={styles.srOnly}>Activity period</span>
              <select value={range} onChange={changeRange}>
                <option value={365}>Last 12 months</option><option value={90}>Last 90 days</option><option value={30}>Last 30 days</option>
              </select><Icon name="expand_more" />
            </label>
          </div>
        </header>

        <div className={styles.calendarArea}>
          <div className={styles.calendarScroll} ref={calendarRef} data-lenis-prevent onKeyDown={navigateDays}>
            <div className={`${styles.calendar} ${range !== 365 ? styles.shortCalendar : ''}`} style={{ '--weeks': weeks }}>
              <div className={styles.months} aria-hidden="true">
                {Array.from({ length: weeks }, (_, index) => {
                  const week = cells.slice(index * 7, index * 7 + 7).filter(Boolean);
                  const firstOfMonth = week.find((day) => day.date.endsWith('-01'));
                  const labelDay = firstOfMonth || (index === 0 ? week[0] : null);
                  return <span key={index}>{labelDay ? dateLabel(labelDay.date, { month: 'short' }) : ''}</span>;
                })}
              </div>
              <div className={styles.weekdays} aria-hidden="true">{['', 'Mon', '', 'Wed', '', 'Fri', ''].map((day, index) => <span key={index}>{day}</span>)}</div>
              <div className={styles.cells} role="group" aria-label="Practice calendar. Use arrow keys to move between days.">
                {cells.map((day, index) => day ? (
                  <button key={day.date} type="button" data-date={day.date} data-level={day.level}
                    className={styles.day} aria-pressed={selectedDate === day.date}
                    tabIndex={selectedDate === day.date ? 0 : -1}
                    aria-label={`${fullDate(day.date)}: ${day.minutes} minutes, ${day.sessions} practice sessions, ${day.lessons} lessons completed`}
                    title={`${dateLabel(day.date, { month: 'short', day: 'numeric' })} · ${day.level ? `${day.minutes} min practiced, ${day.lessons} lessons done` : 'No practice'}`}
                    onClick={() => setSelectedDate(day.date)} />
                ) : <span key={`empty-${index}`} />)}
              </div>
            </div>
          </div>
          <div className={styles.calendarFooter}>
            <p><Icon name="touch_app" /> Hover over a square to view practice time.</p>
            <div className={styles.legend} aria-label="Practice intensity, from less to more"><span>Less</span>{[0, 1, 2, 3, 4].map((level) => <i key={level} data-level={level} />)}<span>More</span></div>
          </div>
        </div>

      </section>
    </div>
  );
}
