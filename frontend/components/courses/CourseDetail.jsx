'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { initialLabs } from '@/data/labsData';
import styles from './CourseDetail.module.css';

const categoryTabs = [
  { id: 'All', label: 'All Topics', icon: 'grid_view' },
  { id: 'Core Commands', label: 'Core Commands', icon: 'terminal' },
  { id: 'Streams & Redirection', label: 'Pipes & Streams', icon: 'alt_route' },
  { id: 'Text Processing', label: 'Text Manipulation', icon: 'manage_search' },
  { id: 'Security & Permissions', label: 'Security & Permissions', icon: 'lock' },
  { id: 'Automation & Scripting', label: 'Shell Scripting', icon: 'code' },
];

export default function CourseDetail({ courseId = 'shell-101' }) {
  const router = useRouter();
  const [labs, setLabs] = useState(initialLabs);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeTag, setActiveTag] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeNav, setActiveNav] = useState('Library');

  // Derived calculations
  const solvedCount = useMemo(() => labs.filter((l) => l.status === 'solved').length, [labs]);
  const progressPercent = Math.round((solvedCount / labs.length) * 100);

  // Filtered labs
  const filteredLabs = useMemo(() => {
    return labs.filter((lab) => {
      // Category tab filter
      if (activeCategory !== 'All' && lab.category !== activeCategory) return false;
      // Tag filter
      if (activeTag !== 'All' && lab.tag !== activeTag) return false;
      // Difficulty filter
      if (difficultyFilter !== 'All' && lab.difficulty !== difficultyFilter) return false;
      // Status filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Solved' && lab.status !== 'solved') return false;
        if (statusFilter === 'In Progress' && lab.status !== 'in_progress') return false;
        if (statusFilter === 'Not Started' && lab.status !== 'todo') return false;
      }
      // Search query filter (matches title or commands)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = lab.title.toLowerCase().includes(q);
        const matchesCommands = (lab.commands || []).some((c) => c.toLowerCase().includes(q));
        const matchesCategory = lab.category.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCommands && !matchesCategory) return false;
      }
      return true;
    });
  }, [labs, activeCategory, activeTag, difficultyFilter, statusFilter, searchQuery]);

  // Tag list with counts
  const tagsWithCounts = useMemo(() => {
    const counts = { All: labs.length };
    labs.forEach((lab) => {
      counts[lab.tag] = (counts[lab.tag] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [labs]);

  // Handle random lab pick
  function handleRandomPick() {
    const unsolved = labs.filter((l) => l.status !== 'solved');
    const pool = unsolved.length > 0 ? unsolved : labs;
    const randomIndex = Math.floor(Math.random() * pool.length);
    router.push(`/courses/${courseId}/labs/${pool[randomIndex].id}`);
  }

  // Toggle solve status directly from table checkbox
  function toggleSolveStatus(labId) {
    setLabs((prev) =>
      prev.map((lab) => {
        if (lab.id === labId) {
          const nextStatus = lab.status === 'solved' ? 'todo' : 'solved';
          return { ...lab, status: nextStatus };
        }
        return lab;
      })
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Top Breadcrumb & Course Header */}
        <div className={styles.topNav}>
          <div className={styles.breadcrumbs}>
            <a href="/courses">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Courses
            </a>
            <span className="separator">/</span>
            <span className="current">Shell 101 — Bash Basics</span>
          </div>

          <div className={styles.courseHeaderRight}>
            <span className={styles.trackBadge}>
              <span className={styles.trackBadgeDot} />
              Core Track · Interactive Mode
            </span>
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className={styles.layout}>
          {/* Left Sidebar */}
          <aside className={styles.leftSidebar} aria-label="Course navigation">
            <div className={styles.courseSummaryCard}>
              <div className={styles.summaryCode}>SHELL / 101</div>
              <h2 className={styles.summaryTitle}>Shell 101 — Bash Basics</h2>
              <div className={styles.summaryProgress}>
                <div className={styles.summaryProgressBar}>
                  <div className={styles.summaryProgressFill} style={{ width: `${progressPercent}%` }} />
                </div>
                <div className={styles.summaryProgressText}>
                  <span>Progress</span>
                  <strong>{solvedCount} / {labs.length} ({progressPercent}%)</strong>
                </div>
              </div>
            </div>

            <div className={styles.navGroup}>
              <div className={styles.navGroupTitle}>Learning Views</div>
              {['Library', 'Quests', 'Explore Tracks', 'Study Plan'].map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`${styles.navItem} ${activeNav === item ? styles.navItemActive : ''}`}
                  onClick={() => setActiveNav(item)}
                >
                  <div className={styles.navItemContent}>
                    <span className="material-symbols-outlined">
                      {item === 'Library' ? 'menu_book' : item === 'Quests' ? 'flag' : item === 'Explore Tracks' ? 'explore' : 'route'}
                    </span>
                    <span>{item}</span>
                  </div>
                  {item === 'Library' && <span className={styles.navBadge}>{labs.length}</span>}
                </button>
              ))}
            </div>

            <div className={styles.navGroup}>
              <div className={styles.navGroupTitle}>My Lists</div>
              <button
                type="button"
                className={`${styles.navItem} ${statusFilter === 'Solved' ? styles.navItemActive : ''}`}
                onClick={() => setStatusFilter(statusFilter === 'Solved' ? 'All' : 'Solved')}
              >
                <div className={styles.navItemContent}>
                  <span className="material-symbols-outlined" style={{ color: '#68dfa0' }}>check_circle</span>
                  <span>Completed Labs</span>
                </div>
                <span className={styles.navBadge}>{solvedCount}</span>
              </button>

              <button
                type="button"
                className={`${styles.navItem} ${statusFilter === 'In Progress' ? styles.navItemActive : ''}`}
                onClick={() => setStatusFilter(statusFilter === 'In Progress' ? 'All' : 'In Progress')}
              >
                <div className={styles.navItemContent}>
                  <span className="material-symbols-outlined" style={{ color: '#78cbd4' }}>timelapse</span>
                  <span>In Progress</span>
                </div>
                <span className={styles.navBadge}>{labs.filter((l) => l.status === 'in_progress').length}</span>
              </button>
            </div>
          </aside>

          {/* Central Main Content */}
          <main className={styles.mainContent}>
            {/* Tag Pills */}
            <div className={styles.tagPills} role="tablist" aria-label="Topic filters">
              {tagsWithCounts.map(({ name, count }) => (
                <button
                  key={name}
                  type="button"
                  className={`${styles.tagPill} ${activeTag === name ? styles.tagPillActive : ''}`}
                  onClick={() => setActiveTag(name)}
                >
                  <span>{name}</span>
                  <span className={styles.tagPillCount}>{count}</span>
                </button>
              ))}
            </div>

            {/* Category Tabs */}
            <div className={styles.categoryTabs} role="tablist" aria-label="Categories">
              {categoryTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`${styles.categoryTab} ${activeCategory === tab.id ? styles.categoryTabActive : ''}`}
                  onClick={() => setActiveCategory(tab.id)}
                >
                  <span className="material-symbols-outlined">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Toolbar: Search, Filters & Random Shuffle */}
            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <span className="material-symbols-outlined">search</span>
                <input
                  type="text"
                  placeholder="Search labs, commands (e.g. grep, chmod, cut)..."
                  className={styles.searchInput}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className={styles.toolbarActions}>
                <select
                  className={styles.filterSelect}
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  aria-label="Filter by difficulty"
                >
                  <option value="All">All Difficulties</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>

                <select
                  className={styles.filterSelect}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by status"
                >
                  <option value="All">All Statuses</option>
                  <option value="Solved">Completed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Not Started">Not Started</option>
                </select>

                <button
                  type="button"
                  className={styles.shuffleBtn}
                  onClick={handleRandomPick}
                  title="Randomly pick a lab to practice"
                >
                  <span className="material-symbols-outlined">shuffle</span>
                  <span>Pick One</span>
                </button>

                <div className={styles.solvedCounter}>
                  <span className="material-symbols-outlined text-sm">task_alt</span>
                  <span><strong>{solvedCount}</strong> / {labs.length} Solved</span>
                </div>
              </div>
            </div>

            {/* Problems / Sub-course Labs Table */}
            <div className={styles.tableContainer}>
              <table className={styles.problemsTable}>
                <thead>
                  <tr>
                    <th className={styles.statusCell}>Status</th>
                    <th className={styles.indexCell}>#</th>
                    <th className={styles.titleCell}>Lab Title &amp; Command Focus</th>
                    <th className={styles.rateCell}>Acceptance</th>
                    <th className={styles.difficultyCell}>Difficulty</th>
                    <th className={styles.actionCell}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLabs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={styles.emptyNotice}>
                        No labs match your active filter criteria. Try clearing the search or category filters.
                      </td>
                    </tr>
                  ) : (
                    filteredLabs.map((lab) => (
                      <tr
                        key={lab.id}
                        className={styles.problemRow}
                        onClick={() => router.push(`/courses/${courseId}/labs/${lab.id}`)}
                      >
                        <td
                          className={styles.statusCell}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSolveStatus(lab.id);
                          }}
                        >
                          {lab.status === 'solved' ? (
                            <span
                              className={`material-symbols-outlined ${styles.statusIconSolved}`}
                              title="Completed (click to toggle)"
                            >
                              check_circle
                            </span>
                          ) : lab.status === 'in_progress' ? (
                            <span
                              className={`material-symbols-outlined ${styles.statusIconProgress}`}
                              title="In Progress"
                            >
                              timelapse
                            </span>
                          ) : (
                            <span
                              className={`material-symbols-outlined ${styles.statusIconEmpty}`}
                              title="Not Started"
                            >
                              radio_button_unchecked
                            </span>
                          )}
                        </td>

                        <td className={styles.indexCell}>
                          {String(lab.id).padStart(2, '0')}
                        </td>

                        <td className={styles.titleCell}>
                          <div className={styles.titleRow}>
                            <span className={styles.labTitle}>{lab.title}</span>
                          </div>
                          <div className={styles.cmdChips}>
                            {(lab.commands || []).map((cmd) => (
                              <code key={cmd} className={styles.cmdChip}>{cmd}</code>
                            ))}
                          </div>
                        </td>

                        <td className={styles.rateCell}>
                          {lab.acceptance}
                        </td>

                        <td className={styles.difficultyCell}>
                          <span
                            className={`${styles.diffBadge} ${
                              lab.difficulty === 'Easy'
                                ? styles.diffEasy
                                : lab.difficulty === 'Medium'
                                ? styles.diffMedium
                                : styles.diffHard
                            }`}
                          >
                            {lab.difficulty}
                          </span>
                        </td>

                        <td
                          className={styles.actionCell}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/courses/${courseId}/labs/${lab.id}`);
                          }}
                        >
                          <a
                            href={`/courses/${courseId}/labs/${lab.id}`}
                            className={`${styles.startLabBtn} ${lab.status === 'solved' ? styles.reviewBtn : ''}`}
                            aria-label={`${lab.status === 'solved' ? 'Review' : 'Start'} lab ${lab.title}`}
                          >
                            <span className="material-symbols-outlined">terminal</span>
                            <span>{lab.status === 'solved' ? 'Review' : 'Start'}</span>
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </main>

          {/* Right Sidebar */}
          <aside className={styles.rightSidebar} aria-label="Learning streak and activities">
            {/* Streak & Calendar Widget */}
            <div className={styles.widget}>
              <div className={styles.widgetHeader}>
                <div className={styles.widgetTitle}>
                  <span className="material-symbols-outlined">calendar_month</span>
                  <span>Daily Streak</span>
                </div>
                <span className={styles.streakPill}>
                  🔥 28 Days
                </span>
              </div>

              <div className={styles.calendarGrid}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <div key={idx} className={styles.calDayHeader}>{day}</div>
                ))}
                {/* 30 days grid mock */}
                {Array.from({ length: 30 }, (_, i) => {
                  const day = i + 1;
                  const isActive = [2, 3, 5, 8, 9, 11, 14, 15, 17, 18, 20, 22, 23, 24, 26, 27, 28].includes(day);
                  const isToday = day === 29;
                  return (
                    <div
                      key={day}
                      className={`${styles.calDay} ${isActive ? styles.calDayActive : ''} ${isToday ? styles.calDayToday : ''}`}
                      title={`Day ${day}: ${isToday ? 'Today (Active)' : isActive ? 'Practiced' : 'Rest'}`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>

              <div className={styles.weeklyCard}>
                <div className={styles.weeklyHeader}>
                  <strong>Weekly Milestone</strong>
                  <span className="text-primary font-code">4 / 5 Labs</span>
                </div>
                <div className={styles.weeklyBar}>
                  <div className={styles.weeklyFill} style={{ width: '80%' }} />
                </div>
              </div>
            </div>

            {/* Daily Challenge Widget */}
            <div className={`${styles.widget} ${styles.challengeCard}`}>
              <div className={styles.challengeTag}>Daily Terminal Mission</div>
              <h4 className={styles.challengeTitle}>
                Filter unique IP addresses and sort by frequency using cut &amp; uniq
              </h4>
              <a
                href={`/courses/${courseId}/labs/7`}
                className={styles.challengeBtn}
              >
                <span className="material-symbols-outlined text-sm">play_arrow</span>
                <span>Launch Challenge</span>
              </a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
