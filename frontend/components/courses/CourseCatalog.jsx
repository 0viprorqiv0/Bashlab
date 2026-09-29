'use client';

import { useState } from 'react';
import styles from './CourseCatalog.module.css';

const courses = [
  {
    id: 'shell-101', code: '101', title: 'Shell 101 — Bash Basics', level: 'Beginner', category: 'Core Track',
    chapters: 3, lessons: 12, duration: '2.5 hours',
    description: 'Master command line fundamentals from navigation and directory inspection to file manipulation, redirection, and text filters.',
    status: 'available',
  },
  {
    id: 'shell-201', code: '201', title: 'Shell 201 — Pipelines & Streams', level: 'Intermediate', category: 'Core Track',
    chapters: 2, lessons: 8, duration: '2 hours',
    description: 'Dive into standard streams (stdin, stdout, stderr), command chaining, exit codes, and building robust multi-stage data filters.',
    status: 'locked',
  },
  {
    id: 'linux-security', code: 'SEC', title: 'Linux Permissions & Security', level: 'Intermediate', category: 'Security',
    chapters: 2, lessons: 6, duration: '1.5 hours',
    description: 'Understand octal and symbolic permissions, sudo privilege boundaries, process inspection, and secure workspace hygiene.',
    status: 'locked',
  },
];

const filters = ['All', 'Core Tracks', 'Security'];

export default function CourseCatalog() {
  const [filter, setFilter] = useState('All');
  const visibleCourses = courses.filter((course) => filter === 'All'
    || (filter === 'Core Tracks' && course.category === 'Core Track')
    || course.category === filter);
  const availableCourses = visibleCourses.filter((course) => course.status === 'available');
  const upcomingCourses = visibleCourses.filter((course) => course.status === 'locked');

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
