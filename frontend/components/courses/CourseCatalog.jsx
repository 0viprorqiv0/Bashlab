'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './CourseCatalog.module.css';
import { supabase } from '@/lib/supabaseClient';
import { authClient } from '@/lib/authClient';
import { useAuth } from '@/components/auth/AuthProvider';
import { PageError, PageLoading } from '@/components/shared/Loading';
import { fetchProgressMap } from '@/lib/learning';

const filters = ['All', 'Core Tracks', 'Security'];

function courseCode(slug) {
  const digits = slug.match(/\d+/)?.[0];
  if (digits) return digits;
  return slug.slice(0, 3).toUpperCase();
}

function formatDuration(minutes) {
  if (!minutes) return '';
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hours`;
}

const bySort = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0);

// Counts only published lessons (and chapters that have one), matching what
// the course page lists — admins can read drafts, learners can't.
function toCourse(row) {
  const sortedChapters = (row.chapters || []).slice().sort(bySort);
  const publishedLessons = sortedChapters.flatMap((ch) =>
    (ch.lessons || [])
      .filter((lesson) => lesson.status === 'published')
      .sort(bySort)
  );
  const publishedPerChapter = sortedChapters
    .map((ch) => (ch.lessons || []).filter((lesson) => lesson.status === 'published').length)
    .filter((count) => count > 0);
  return {
    id: row.slug,
    code: courseCode(row.slug),
    title: row.title,
    level: row.level ? row.level[0].toUpperCase() + row.level.slice(1) : '',
    category: row.category || '',
    chapters: publishedPerChapter.length,
    lessons: publishedLessons.length,
    lessonItems: publishedLessons,
    duration: formatDuration(row.duration_minutes),
    description: row.description || '',
    status: row.status,
  };
}

export default function CourseCatalog() {
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState('All');
  const [courses, setCourses] = useState([]);
  const [progressMap, setProgressMap] = useState(() => new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const getCourseTargetLab = useCallback((course) => {
    if (!course || !course.lessonItems || course.lessonItems.length === 0) {
      return 1;
    }

    // 1. Check database progress: look for lesson with 'in_progress' status
    if (progressMap && progressMap.size > 0) {
      const inProgress = [];
      course.lessonItems.forEach((lesson, index) => {
        const p = progressMap.get(lesson.id);
        if (p && p.status === 'in_progress') {
          inProgress.push({
            labId: index + 1,
            updatedAt: p.updated_at ? new Date(p.updated_at).getTime() : 0,
          });
        }
      });

      if (inProgress.length > 0) {
        inProgress.sort((a, b) => b.updatedAt - a.updatedAt);
        return inProgress[0].labId;
      }

      // 2. If no in_progress lesson, but user has done some lessons:
      // Redirect to the first uncompleted lesson
      const hasDone = course.lessonItems.some((l) => progressMap.get(l.id)?.status === 'done');
      if (hasDone) {
        const nextIndex = course.lessonItems.findIndex((l) => progressMap.get(l.id)?.status !== 'done');
        if (nextIndex !== -1) {
          return nextIndex + 1;
        }
        // All completed -> back to first lab as fallback
        return 1;
      }
    }

    // 3. Check localStorage for last visited lab in this course
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`bashlab:last_lab:${course.id}`);
        const num = parseInt(stored, 10);
        if (!isNaN(num) && num >= 1 && num <= course.lessonItems.length) {
          return num;
        }
      } catch {}
    }

    // 4. Default: first lab of the course
    return 1;
  }, [progressMap]);

  // Navigate to target lab (or to login with target lab return URL for guests)
  const goToLab = (course) => (event) => {
    if (user || authClient.peekUserId()) {
      return; // signed in: follow the link directly
    }
    const targetLabId = getCourseTargetLab(course);
    const targetUrl = `/courses/${course.id}/labs/${targetLabId}`;
    event.preventDefault();
    router.push(`/login?next=${encodeURIComponent(targetUrl)}`);
  };

  useEffect(() => {
    let active = true;
    const userId = user?.id || authClient.peekUserId();
    const coursesReq = supabase
      .from('courses')
      .select('slug, title, description, level, category, duration_minutes, status, chapters(id, sort_order, lessons(id, slug, sort_order, status))')
      .in('status', ['published', 'upcoming'])
      .order('sort_order');
    const progressReq = userId ? fetchProgressMap(userId) : Promise.resolve(new Map());

    Promise.all([coursesReq, progressReq])
      .then(([{ data, error: loadError }, progMap]) => {
        if (!active) return;
        if (loadError) {
          setError(loadError.message);
        } else {
          setCourses((data || []).map(toCourse));
          if (progMap) setProgressMap(progMap);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load courses');
        setLoading(false);
      });

    return () => { active = false; };
  }, [attempt, user]);

  const visibleCourses = courses.filter((course) => filter === 'All'
    || (filter === 'Core Tracks' && course.category === 'Core Track')
    || course.category === filter);
  const availableCourses = visibleCourses.filter((course) => course.status === 'published');
  const upcomingCourses = visibleCourses.filter((course) => course.status === 'upcoming');

  if (loading) return <PageLoading label="Loading courses…" />;
  if (error) return <PageError message={`Could not load courses: ${error}`} onRetry={() => { setError(''); setLoading(true); setAttempt((n) => n + 1); }} />;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Courses<span>.</span></h1>
          <p>Learn the shell by using it. Start with the basics, then build toward the tools you use every day.</p>
        </header>

        <nav className={styles.filters} aria-label="Filter courses">
          {filters.map((item) => (
            <button key={item} type="button" aria-pressed={filter === item} className={filter === item ? styles.activeFilter : ''} onClick={() => setFilter(item)}>{item}</button>
          ))}
        </nav>

        {availableCourses.map((course) => {
          const targetLabId = getCourseTargetLab(course);
          const targetLabUrl = `/courses/${course.id}/labs/${targetLabId}`;
          return (
            <article id={`course-${course.id}`} className={styles.featured} key={course.id}>
              <div className={styles.featureCopy}>
                <div className={styles.featureTopline}><span className={styles.availableDot} /> Available now <span className={styles.toplineDivider} /> {course.category}</div>
                <h2>{course.title}</h2>
                <p className={styles.featureDescription}>{course.description}</p>
                <div className={styles.featureMeta} aria-label="Course details">
                  <span>{course.level}</span><span>{course.chapters} chapters</span><span>{course.lessons} lessons</span><span>{course.duration}</span>
                </div>
                <Link
                  className={styles.primaryAction}
                  href={targetLabUrl}
                  onClick={goToLab(course)}
                >
                  <span>Go to Lab</span>
                  <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                </Link>
              </div>
              <div className={styles.courseMark} aria-hidden="true"><span>shell / bash</span><strong>{course.code}</strong><span>Learn by doing.</span></div>
            </article>
          );
        })}

        {upcomingCourses.length > 0 && (
          <section className={styles.upcoming} aria-labelledby="upcoming-heading">
            <div className={styles.upcomingIntro}><h2 id="upcoming-heading">Coming next</h2><p>More ways to work confidently in the terminal.</p></div>
            <div className={styles.upcomingList}>
              {upcomingCourses.map((course) => (
                <article id={`course-${course.id}`} className={styles.upcomingRow} key={course.id}>
                  <span className={styles.rowCode} aria-hidden="true">{course.code}</span>
                  <div className={styles.rowCopy}>
                    <div className={styles.rowHeading}><h3>{course.title}</h3><span className={styles.comingSoon}>Coming soon</span></div>
                    <p>{course.description}</p>
                    <div className={styles.rowMeta}><span>{course.category}</span><span>{course.level}</span><span>{course.chapters} chapters</span><span>{course.lessons} lessons</span><span>{course.duration}</span></div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
