'use client';

import { useEffect, useState } from 'react';
import styles from './CourseCatalog.module.css';
import { supabase } from '@/lib/supabaseClient';

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

function toCourse(row) {
  const chapters = row.chapters || [];
  const lessons = chapters.reduce((sum, ch) => sum + (ch.lessons?.length || 0), 0);
  return {
    id: row.slug,
    code: courseCode(row.slug),
    title: row.title,
    level: row.level ? row.level[0].toUpperCase() + row.level.slice(1) : '',
    category: row.category || '',
    chapters: chapters.length,
    lessons,
    duration: formatDuration(row.duration_minutes),
    description: row.description || '',
    status: row.status,
  };
}

export default function CourseCatalog() {
  const [filter, setFilter] = useState('All');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('courses')
      .select('slug, title, description, level, category, duration_minutes, status, chapters(id, lessons(id))')
      .order('sort_order')
      .then(({ data }) => {
        setCourses((data || []).map(toCourse));
        setLoading(false);
      });
  }, []);

  const visibleCourses = courses.filter((course) => filter === 'All'
    || (filter === 'Core Tracks' && course.category === 'Core Track')
    || course.category === filter);
  const availableCourses = visibleCourses.filter((course) => course.status === 'published');
  const upcomingCourses = visibleCourses.filter((course) => course.status === 'upcoming');

  if (loading) return null;

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

        {availableCourses.map((course) => (
          <article id={`course-${course.id}`} className={styles.featured} key={course.id}>
            <div className={styles.featureCopy}>
              <div className={styles.featureTopline}><span className={styles.availableDot} /> Available now <span className={styles.toplineDivider} /> {course.category}</div>
              <h2>{course.title}</h2>
              <p className={styles.featureDescription}>{course.description}</p>
              <div className={styles.featureMeta} aria-label="Course details">
                <span>{course.level}</span><span>{course.chapters} chapters</span><span>{course.lessons} lessons</span><span>{course.duration}</span>
              </div>
              <a className={styles.primaryAction} href={`/courses/${course.id}`}>Start learning <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></a>
            </div>
            <div className={styles.courseMark} aria-hidden="true"><span>shell / bash</span><strong>{course.code}</strong><span>Learn by doing.</span></div>
          </article>
        ))}

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
