'use client';

import { useMemo, useState } from 'react';
import styles from './CourseCatalog.module.css';

const courses = [
  {
    id: 'shell-101',
    title: 'Shell 101 — Bash Basics',
    level: 'Beginner',
    category: 'Core Track',
    chapters: 3,
    lessons: 12,
    duration: '2.5 hrs',
    description: 'Master command line fundamentals from navigation and directory inspection to file manipulation, redirection, and text filters.',
    progress: 4,
    status: 'available',
  },
  {
    id: 'shell-201',
    title: 'Shell 201 — Pipelines & Streams',
    level: 'Intermediate',
    category: 'Core Track',
    chapters: 2,
    lessons: 8,
    duration: '2.0 hrs',
    description: 'Dive into standard streams (stdin, stdout, stderr), command chaining, exit codes, and building robust multi-stage data filters.',
    status: 'locked',
  },
  {
    id: 'linux-security',
    title: 'Linux Permissions & Security',
    level: 'Intermediate',
    category: 'Security',
    chapters: 2,
    lessons: 6,
    duration: '1.5 hrs',
    description: 'Understand octal and symbolic permissions, sudo privilege boundaries, process inspection, and secure workspace hygiene.',
    status: 'locked',
  },
];

const filters = ['All', 'Core Tracks', 'Security'];

export default function CourseCatalog() {
  const [filter, setFilter] = useState('All');

  const visibleCourses = useMemo(() => {
    return courses.filter((course) => filter === 'All'
      || (filter === 'Core Tracks' && course.category === 'Core Track')
      || course.category === filter);
  }, [filter]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <section className={styles.catalog} aria-label="Course catalog">
          <div className={styles.catalogHeader}>
            <header className={styles.heading}>
              <p className={styles.eyebrow}>BASHLAB / LEARNING PATHS</p>
              <h1>Courses</h1>
              <p>Build practical Bash skills through guided lessons and hands-on practice.</p>
            </header>
            <div className={styles.filters} aria-label="Filter courses">
              {filters.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={filter === item ? styles.activeFilter : ''}
                  aria-pressed={filter === item}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.courseList}>
            {visibleCourses.map((course) => (
              <article id={`course-${course.id}`} className={`${styles.card} ${course.status === 'locked' ? styles.lockedCard : ''}`} key={course.id}>
                <div className={styles.cardContent}>
                  <div className={styles.metadata}>
                    <span className={`${styles.level} ${course.level === 'Beginner' ? styles.beginner : styles.intermediate}`}>
                      {course.level}
                    </span>
                    <span className={styles.category}>{course.category}</span>
                    {course.status === 'locked' && <span className={styles.comingBadge}>Coming soon</span>}
                    <span className={styles.stat}>{course.chapters} Chapters</span>
                    <span className={styles.stat}>{course.lessons} Lessons</span>
                    <span className={styles.stat}>Est. ~{course.duration}</span>
                  </div>
                  <h2>{course.title}</h2>
                  <p className={styles.description}>{course.description}</p>

                  {course.status === 'available' ? (
                    <div className={styles.progressBlock}>
                      <div className={styles.progressLabels}>
                        <span>Progress</span>
                        <strong>{course.progress} of {course.lessons} lessons ({Math.round(course.progress / course.lessons * 100)}%)</strong>
                      </div>
                      <div
                        className={styles.progressTrack}
                        role="progressbar"
                        aria-label={`${course.title} progress`}
                        aria-valuemin="0"
                        aria-valuemax={course.lessons}
                        aria-valuenow={course.progress}
                      >
                        <span style={{ width: `${course.progress / course.lessons * 100}%` }} />
                      </div>
                    </div>
                  ) : (
                    <p className={styles.comingNote}>
                      <span className="material-symbols-outlined" aria-hidden="true">schedule</span>
                      Curriculum in progress — this course will unlock in a future update.
                    </p>
                  )}
                </div>

                {course.status === 'available' ? (
                  <a className={styles.viewButton} href="/login">
                    View course <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                  </a>
                ) : (
                  <button className={styles.lockedButton} type="button" disabled aria-label={`${course.title}, coming soon`}>
                    <span className="material-symbols-outlined" aria-hidden="true">lock</span>
                    Coming soon
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
