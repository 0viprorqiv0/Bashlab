'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
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

const bashTips = [
  {
    id: 1,
    title: 'Toggle Previous Directory',
    command: 'cd -',
    explanation: 'Jump back to your previous working directory without typing out full paths.',
    category: 'Navigation',
    tag: 'Pro Tip'
  },
  {
    id: 2,
    title: 'Re-run Last Command with Sudo',
    command: 'sudo !!',
    explanation: 'Forgot root privileges on a command? Automatically re-runs it with sudo prepended.',
    category: 'Privileges',
    tag: 'Shortcut'
  },
  {
    id: 3,
    title: 'Reverse History Search',
    command: 'Ctrl + R',
    explanation: 'Search interactively backwards through your entire command history by keyword.',
    category: 'History',
    tag: 'Speed'
  },
  {
    id: 4,
    title: 'Reuse Last Command Argument',
    command: '!$',
    explanation: 'Expands to the last argument of previous command (e.g. mkdir project && cd !$).',
    category: 'Expansion',
    tag: 'Productivity'
  },
  {
    id: 5,
    title: 'Clear Screen Without Losing Context',
    command: 'Ctrl + L',
    explanation: 'Redraws and clears the terminal viewport while keeping your active command line intact.',
    category: 'View',
    tag: 'Quick Key'
  },
  {
    id: 6,
    title: 'Jump to Beginning / End of Line',
    command: 'Ctrl + A / Ctrl + E',
    explanation: 'Jump cursor to line beginning with Ctrl+A, or line end with Ctrl+E instantly.',
    category: 'Editing',
    tag: 'Navigation'
  },
  {
    id: 7,
    title: 'Delete Word Backward',
    command: 'Ctrl + W',
    explanation: 'Deletes the previous word before cursor instead of pressing Backspace repeatedly.',
    category: 'Editing',
    tag: 'Speed'
  }
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
  const [tipIndex, setTipIndex] = useState(0);
  const [copiedTip, setCopiedTip] = useState(false);
  const [isTipPaused, setIsTipPaused] = useState(false);

  const currentTip = bashTips[tipIndex];

  function handleNextTip() {
    setTipIndex((prev) => (prev + 1) % bashTips.length);
  }

  function handleCopyTip(cmd) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(cmd);
      setCopiedTip(true);
      setTimeout(() => setCopiedTip(false), 1800);
    }
  }

  // Auto-cycle tips every 10 seconds
  useEffect(() => {
    if (isTipPaused) return;
    const timer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % bashTips.length);
    }, 10000);

    return () => clearInterval(timer);
  }, [isTipPaused, tipIndex]);

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
            <Link href="/courses">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Courses
            </Link>
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
                          <Link
                            href={`/courses/${courseId}/labs/${lab.id}`}
                            className={`${styles.startLabBtn} ${lab.status === 'solved' ? styles.reviewBtn : ''}`}
                            aria-label={`${lab.status === 'solved' ? 'Review' : 'Start'} lab ${lab.title}`}
                          >
                            <span className="material-symbols-outlined">terminal</span>
                            <span>{lab.status === 'solved' ? 'Review' : 'Start'}</span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </main>

          {/* Right Sidebar */}
          <aside className={styles.rightSidebar} aria-label="Learning tips and activities">
            {/* Tip & Trick Widget */}
            <div
              className={styles.widget}
              onMouseEnter={() => setIsTipPaused(true)}
              onMouseLeave={() => setIsTipPaused(false)}
            >
              <div className={styles.widgetHeader}>
                <div className={styles.widgetTitle}>
                  <span className="material-symbols-outlined text-accent">lightbulb</span>
                  <span>Tip &amp; Trick</span>
                </div>
                <button
                  type="button"
                  className={styles.tipShuffleBtn}
                  onClick={handleNextTip}
                  title="Cycle to next tip (auto-cycles every 10s)"
                >
                  <span className="material-symbols-outlined text-xs">autorenew</span>
                  <span>Next Tip</span>
                </button>
              </div>

              {/* 10-second Animated Countdown Progress Bar */}
              <div className={styles.tipProgressBar}>
                <div
                  key={`${currentTip.id}-${isTipPaused}`}
                  className={`${styles.tipProgressFill} ${isTipPaused ? styles.tipProgressPaused : ''}`}
                />
              </div>

              {/* Animated Tip Content Card */}
              <div key={currentTip.id} className={styles.tipCard}>
                <div className={styles.tipMetaRow}>
                  <span className={styles.tipCategoryBadge}>{currentTip.category}</span>
                  <span className={styles.tipIndexIndicator}>
                    #{tipIndex + 1} of {bashTips.length}
                    {isTipPaused && ' · Paused'}
                  </span>
                </div>

                <h4 className={styles.tipTitle}>{currentTip.title}</h4>

                {/* Command Snippet */}
                <div className={styles.tipCodeBox}>
                  <code>{currentTip.command}</code>
                  <button
                    type="button"
                    className={styles.tipCopyBtn}
                    onClick={() => handleCopyTip(currentTip.command)}
                    title="Copy command"
                  >
                    <span className="material-symbols-outlined text-xs">
                      {copiedTip ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedTip ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <p className={styles.tipExplanation}>{currentTip.explanation}</p>
              </div>

              {/* Quick Shell Shortcuts Cheat-sheet */}
              <div className={styles.shortcutsBox}>
                <div className={styles.shortcutsTitle}>
                  <span className="material-symbols-outlined text-xs">keyboard</span>
                  <span>Essential Bash Keybindings</span>
                </div>
                <div className={styles.shortcutsList}>
                  <div className={styles.shortcutItem}>
                    <kbd className={styles.kbd}>Ctrl + R</kbd>
                    <span>Search history</span>
                  </div>
                  <div className={styles.shortcutItem}>
                    <kbd className={styles.kbd}>Ctrl + L</kbd>
                    <span>Clear viewport</span>
                  </div>
                  <div className={styles.shortcutItem}>
                    <kbd className={styles.kbd}>Ctrl + C</kbd>
                    <span>Halt / Cancel process</span>
                  </div>
                  <div className={styles.shortcutItem}>
                    <kbd className={styles.kbd}>Tab</kbd>
                    <span>Auto-complete path</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Challenge Widget */}
            <div className={`${styles.widget} ${styles.challengeCard}`}>
              <div className={styles.challengeTag}>Daily Terminal Mission</div>
              <h4 className={styles.challengeTitle}>
                Filter unique IP addresses and sort by frequency using cut &amp; uniq
              </h4>
              <Link
                href={`/courses/${courseId}/labs/7`}
                className={styles.challengeBtn}
              >
                <span className="material-symbols-outlined text-sm">play_arrow</span>
                <span>Launch Challenge</span>
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
