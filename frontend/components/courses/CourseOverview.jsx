'use client';

import { useEffect, useState } from 'react';
import styles from './CourseOverview.module.css';
import {
  courseCode, courseStats, fetchCourse, fetchProgressMap, getCurrentUser, lessonHref, lessonStates,
} from '@/lib/learning';

function Icon({ name }) { return <span className="material-symbols-outlined" aria-hidden="true">{name}</span>; }

const STATE_ICON = { done: 'check_circle', current: 'play_circle', locked: 'lock' };
const STATE_LABEL = { done: 'Completed', current: 'Up next', locked: 'Locked' };

function formatDuration(minutes) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hours`;
}

export default function CourseOverview({ slug }) {
  const [state, setState] = useState({ loading: true });
  const [openChapters, setOpenChapters] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [course, user] = await Promise.all([fetchCourse(slug), getCurrentUser()]);
      const progressMap = user && course ? await fetchProgressMap(user.id) : new Map();
      if (!cancelled) setState({ loading: false, course, user, progressMap });
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const { loading, course, user, progressMap } = state;
  if (loading) return null;

  if (!course) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <p className={styles.eyebrow}><a href="/courses">Courses</a></p>
            <h1>Course not found<span>.</span></h1>
            <p className={styles.lead}>This course does not exist or is not published yet.</p>
            <a className={styles.primaryAction} href="/courses">Browse courses <Icon name="arrow_forward" /></a>
          </header>
        </div>
      </div>
    );
  }

  const { total, done, next } = courseStats(course, progressMap);
  const states = user ? lessonStates(course, progressMap) : new Map();
  const percent = total ? Math.round((done / total) * 100) : 0;
  const outcomes = [...new Set(course.lessons.map((lesson) => lesson.objectives?.[0]).filter(Boolean))].slice(0, 8);
  const expanded = openChapters ?? new Set(course.chapters.map((chapter) => chapter.id));
  const toggleChapter = (id) => {
    const nextSet = new Set(expanded);
    if (nextSet.has(id)) nextSet.delete(id);
    else nextSet.add(id);
    setOpenChapters(nextSet);
  };

  const cta = !user
    ? { href: '/login', label: 'Log in to start' }
    : next && done < total
      ? { href: lessonHref(course.slug, next.slug), label: done ? 'Continue learning' : 'Start course' }
      : { href: course.lessons[0] ? lessonHref(course.slug, course.lessons[0].slug) : '/courses', label: 'Review course' };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <p className={styles.eyebrow}><a href="/courses">Courses</a> <span>/</span> {course.title}</p>

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.meta}>
              {course.level && <span>{course.level[0].toUpperCase() + course.level.slice(1)}</span>}
              {course.category && <span>{course.category}</span>}
              <span>{course.chapters.length} chapters</span>
              <span>{total} lessons</span>
              {formatDuration(course.duration_minutes) && <span>{formatDuration(course.duration_minutes)}</span>}
            </div>
            <h1>{course.title}</h1>
            <p className={styles.lead}>{course.description}</p>
            <a className={styles.primaryAction} href={cta.href}>{cta.label} <Icon name="arrow_forward" /></a>
          </div>

          <aside className={styles.progressCard} aria-label="Your progress">
            <span className={styles.code}>{courseCode(course.slug)}</span>
            {user ? (
              <>
                <p className={styles.progressLabel}>Your progress</p>
                <p className={styles.progressValue}>{percent}%</p>
                <div className={styles.progressBar} role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}>
                  <span style={{ width: `${percent}%` }} />
                </div>
                <p className={styles.progressHint}>{done} of {total} lessons completed</p>
                {next && done < total && <p className={styles.nextLesson}>Next: <strong>{next.title}</strong></p>}
              </>
            ) : (
              <p className={styles.progressHint}>Log in to track your progress through this course.</p>
            )}
          </aside>
        </section>

        {outcomes.length > 0 && (
          <section className={styles.outcomes} aria-labelledby="outcomes-title">
            <h2 id="outcomes-title">What you&apos;ll learn</h2>
            <ul>{outcomes.map((item) => <li key={item}><Icon name="check" />{item}</li>)}</ul>
            <p className={styles.prereq}><strong>Prerequisites:</strong> none — just a browser.</p>
          </section>
        )}

        <section className={styles.syllabus} aria-labelledby="syllabus-title">
          <h2 id="syllabus-title">Syllabus</h2>
          {course.chapters.map((chapter, chapterIndex) => {
            const chapterDone = chapter.lessons.length > 0 && chapter.lessons.every((lesson) => states.get(lesson.id) === 'done');
            const isOpen = expanded.has(chapter.id);
            return (
              <div className={styles.chapter} key={chapter.id}>
                <button type="button" className={styles.chapterHeader} aria-expanded={isOpen} onClick={() => toggleChapter(chapter.id)}>
                  <span className={styles.chapterIndex}>{String(chapterIndex + 1).padStart(2, '0')}</span>
                  <span className={styles.chapterTitle}>{chapter.title}</span>
                  <span className={styles.chapterCount}>{chapterDone ? 'Completed' : `${chapter.lessons.length} lessons`}</span>
                  <Icon name={isOpen ? 'expand_less' : 'expand_more'} />
                </button>
                {isOpen && (
                  <ol className={styles.lessons}>
                    {chapter.lessons.map((lesson) => {
                      const lessonState = states.get(lesson.id) || 'locked';
                      const content = (
                        <>
                          <span className={`${styles.lessonIcon} ${styles[lessonState]}`}><Icon name={STATE_ICON[lessonState]} /></span>
                          <span className={styles.lessonTitle}>{lesson.title}</span>
                          <span className={styles.lessonState}>{STATE_LABEL[lessonState]}</span>
                        </>
                      );
                      return (
                        <li key={lesson.id}>
                          {lessonState === 'locked'
                            ? <span className={`${styles.lessonRow} ${styles.lockedRow}`} aria-disabled="true">{content}</span>
                            : <a className={styles.lessonRow} href={lessonHref(course.slug, lesson.slug)}>{content}</a>}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
