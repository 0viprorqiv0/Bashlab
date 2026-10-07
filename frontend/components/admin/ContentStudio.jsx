'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';
import { adminApi } from '@/lib/writeApi';
import Markdown from '@/components/shared/Markdown';
import styles from './ContentStudio.module.css';
import AdminSelect from './AdminSelect';

// SVG Icons helper
function Icon({ name, className = '' }) {
  const icons = {
    folder: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>
    ),
    chevronDown: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    ),
    chevronRight: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    ),
    dragHandle: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
        <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
        <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
      </svg>
    ),
    fileText: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    ),
    plus: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    ),
    trash: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    ),
    bold: <span style={{ fontWeight: 800, fontSize: 13 }}>B</span>,
    italic: <span style={{ fontStyle: 'italic', fontWeight: 600, fontSize: 13 }}>I</span>,
    underline: <span style={{ textDecoration: 'underline', fontWeight: 600, fontSize: 13 }}>U</span>,
    strikethrough: <span style={{ textDecoration: 'line-through', fontWeight: 600, fontSize: 13 }}>S</span>,
    alignLeft: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line>
      </svg>
    ),
    alignCenter: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line>
      </svg>
    ),
    alignRight: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line>
      </svg>
    ),
    listBullet: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line>
        <line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>
      </svg>
    ),
    listNumber: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line>
        <path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
      </svg>
    ),
    checkSquare: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
      </svg>
    ),
    code: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>
      </svg>
    ),
    terminal: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line>
      </svg>
    ),
    quote: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
      </svg>
    ),
    link: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      </svg>
    ),
    image: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
    ),
    table: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="2"></rect>
        <line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line>
        <line x1="12" y1="3" x2="12" y2="21"></line>
      </svg>
    ),
    divider: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="2" y1="12" x2="22" y2="12"></line>
      </svg>
    ),
    undo: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
      </svg>
    ),
    redo: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"></path>
      </svg>
    ),
    eye: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>
      </svg>
    ),
    eyeOff: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      </svg>
    ),
    check: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    ),
    folderPlus: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
        <line x1="12" y1="10" x2="12" y2="16" />
        <line x1="9" y1="13" x2="15" y2="13" />
      </svg>
    ),
    filePlus: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="12" x2="12" y2="18" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
    splitHorizontal: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="12" y1="3" x2="12" y2="21" />
      </svg>
    ),
    search: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    ),
    lightbulb: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M9 18h6"></path><path d="M10 22h4"></path>
        <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .5 2 1.5 2.5.76.76 1.23 1.52 1.41 2.5"></path>
      </svg>
    ),
    target: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle>
      </svg>
    ),
    save: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
      </svg>
    ),
    sidebar: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="9" y1="3" x2="9" y2="21"></line>
      </svg>
    ),
    pencil: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
      </svg>
    ),
    checkBadge: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    ),
    arrowUp: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="19" x2="12" y2="5"></line>
        <polyline points="5 12 12 5 19 12"></polyline>
      </svg>
    ),
    arrowDown: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <polyline points="19 12 12 19 5 12"></polyline>
      </svg>
    ),
  };
  return <span className={className} style={{ display: 'inline-flex', alignItems: 'center' }}>{icons[name] || null}</span>;
}

// Fallback initial mock data if database is empty or loading
const INITIAL_DEMO_COURSES = [
  {
    id: 'course-1',
    slug: 'bash-fundamentals',
    title: 'Bash Scripting Fundamentals',
    description: 'Master the Linux command line, pipelines, shell scripting, and automated systems.',
    status: 'published',
    chapters: [
      {
        id: 'chap-1',
        title: 'Shell Navigation & Basic Commands',
        sort_order: 1,
        lessons: [
          {
            id: 'les-1',
            title: 'Navigating the File System (pwd, cd, ls)',
            slug: 'navigating-the-file-system',
            sort_order: 1,
            status: 'published',
            content_md: `### Welcome to Bashlab!

In this lesson, you will learn the core navigation commands in the Bash shell:
- \`pwd\`: Print the current working directory path.
- \`ls\`: List files and directories in the current folder.
- \`cd\`: Change the current working directory.

#### Try running these commands:

\`\`\`bash
# 1. Print current path
pwd

# 2. List all files including hidden dotfiles
ls -la

# 3. Change directory to /var/log and view contents
cd /var/log
ls
\`\`\`

> **Pro Tip**: Use \`cd ..\` to navigate up one level, and \`cd ~\` to immediately jump back to your user home directory.`,
            objectives: [
              { id: 'obj-1', text: 'Identify the current directory with pwd', checked: true },
              { id: 'obj-2', text: 'List hidden files using ls -la', checked: false },
              { id: 'obj-3', text: 'Navigate between parent and child directories with cd', checked: false },
            ],
            hints: [
              { id: 'hint-1', text: 'Remember that directories starting with a dot (.) are hidden from standard ls output.' },
              { id: 'hint-2', text: 'Use the TAB key to auto-complete directory names when typing cd commands.' },
            ],
          },
          {
            id: 'les-2',
            title: 'Inspecting File Contents (cat, less, head, tail)',
            slug: 'inspecting-file-contents',
            sort_order: 2,
            status: 'published',
            content_md: `### Viewing Files in the Terminal

Learn how to quickly inspect logs and documents without leaving your terminal environment.

#### Key Tools:
1. **\`cat\`**: Concatenates and dumps file content straight to standard output.
2. **\`head -n 10\`**: Displays the first 10 lines of a file.
3. **\`tail -f\`**: Follows live additions to a log file in real time.`,
            objectives: [
              { id: 'obj-21', text: 'View the head of a log file', checked: false },
              { id: 'obj-22', text: 'Follow live logs with tail -f', checked: false },
            ],
            hints: [
              { id: 'hint-21', text: 'Press Ctrl+C to terminate a running tail -f stream.' },
            ],
          },
        ],
      },
      {
        id: 'chap-2',
        title: 'File Manipulations & Permissions',
        sort_order: 2,
        lessons: [
          {
            id: 'les-3',
            title: 'Creating, Moving, and Removing Files (touch, cp, mv, rm)',
            slug: 'creating-moving-removing-files',
            sort_order: 1,
            status: 'draft',
            content_md: `### File Operations

Manipulate files and directories securely:
\`\`\`bash
touch sample.txt
mkdir -p projects/demo
cp sample.txt projects/demo/
mv projects/demo/sample.txt projects/demo/renamed.txt
\`\`\``,
            objectives: [
              { id: 'obj-31', text: 'Create nested directories with mkdir -p', checked: false },
              { id: 'obj-32', text: 'Copy and move files without data loss', checked: false },
            ],
            hints: [
              { id: 'hint-31', text: 'Be cautious with rm -rf. It removes recursively without asking for confirmation!' },
            ],
          },
        ],
      },
    ],
  },
];

export default function ContentStudio({ initialCourseSlug }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Courses state
  const [courses, setCourses] = useState(INITIAL_DEMO_COURSES);
  const [selectedCourseId, setSelectedCourseId] = useState(INITIAL_DEMO_COURSES[0].id);
  const selectedCourseIdRef = useRef(INITIAL_DEMO_COURSES[0].id);
  const [selectedLessonId, setSelectedLessonId] = useState(INITIAL_DEMO_COURSES[0].chapters[0].lessons[0].id);
  const [selectedChapterId, setSelectedChapterId] = useState(INITIAL_DEMO_COURSES[0].chapters[0].id);
  const [selectedItemType, setSelectedItemType] = useState('lesson'); // 'lesson' | 'chapter'
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null); // { type: 'chapter' | 'lesson', id, title, chapterId?, lessonCount? }
  const [collapsedChapters, setCollapsedChapters] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // UI Panels & Layout (VSCode Style)
  const [activeEditTab, setActiveEditTab] = useState('input'); // 'input' | 'objectives' | 'hints'
  const [showEditor, setShowEditor] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // desktop | tablet | mobile
  const [previewTab, setPreviewTab] = useState('workspace'); // workspace | terminal

  // Auto-measure screen and scale layout
  const [sidetabWidth, setSidetabWidth] = useState(285);
  const [isSidetabCollapsed, setIsSidetabCollapsed] = useState(false);
  const [isDraggingResizer, setIsDraggingResizer] = useState(false);

  // Helper to toggle panel visibility while ensuring at least one remains open
  const togglePanel = useCallback((panel) => {
    if (panel === 'explorer') {
      if (!isSidetabCollapsed && !showEditor && !showPreview) return;
      setIsSidetabCollapsed((prev) => !prev);
    } else if (panel === 'editor') {
      if (showEditor && isSidetabCollapsed && !showPreview) return;
      setShowEditor((prev) => !prev);
    } else if (panel === 'preview') {
      if (showPreview && isSidetabCollapsed && !showEditor) return;
      setShowPreview((prev) => !prev);
    }
  }, [isSidetabCollapsed, showEditor, showPreview]);

  // Responsive auto-layout for smaller viewports (collapses preview on tablet/compact screens)
  useEffect(() => {
    function handleAutoLayout() {
      if (typeof window === 'undefined') return;
      if (window.innerWidth < 1180) {
        setShowPreview(false);
      }
      if (window.innerWidth < 768) {
        setIsSidetabCollapsed(true);
      }
    }
    handleAutoLayout();
    window.addEventListener('resize', handleAutoLayout);
    return () => window.removeEventListener('resize', handleAutoLayout);
  }, []);

  // Form State for Active Lesson
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonStatus, setLessonStatus] = useState('published');
  const [lessonDifficulty, setLessonDifficulty] = useState('Beginner');
  const [lessonContent, setLessonContent] = useState('');
  const [objectives, setObjectives] = useState([]);
  const [hints, setHints] = useState([]);
  const [newObjectiveText, setNewObjectiveText] = useState('');
  const [newHintText, setNewHintText] = useState('');

  // Word Toolbar Settings
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontSize, setFontSize] = useState('15px');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Status & Notifications
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'dirty'
  const [toastMessage, setToastMessage] = useState(null);

  // Drag and Drop States
  const [draggedItem, setDraggedItem] = useState(null); // { type: 'lesson' | 'chapter', lessonId, sourceChapterId, chapterId }
  const [dragOverLessonId, setDragOverLessonId] = useState(null);
  const [dragOverPosition, setDragOverPosition] = useState(null); // 'top' | 'bottom'
  const [dragOverChapterId, setDragOverChapterId] = useState(null);

  // Inline Rename States (Folder = Chapter, File = Lesson)
  const [renamingId, setRenamingId] = useState(null);
  const [renamingType, setRenamingType] = useState(null); // 'chapter' | 'lesson'
  const [renamingTitle, setRenamingTitle] = useState('');

  // Modals for Adding Chapter / Lesson
  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  const [addLessonTargetChapterId, setAddLessonTargetChapterId] = useState(null);
  const [newLessonTitleInput, setNewLessonTitleInput] = useState('');
  const [showAddChapterModal, setShowAddChapterModal] = useState(false);
  const newChapterTitleInputRef = useRef('');
  const [newChapterTitleInput, setNewChapterTitleInput] = useState('');

  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);
  const courseDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(e.target)) {
        setCourseDropdownOpen(false);
      }
    }
    if (courseDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [courseDropdownOpen]);

  const textareaRef = useRef(null);
  const lineGutterRef = useRef(null);
  const workspaceLayoutRef = useRef(null);

  // Preview panel resizing (Boundary between Editor & Preview)
  const [previewWidth, setPreviewWidth] = useState(480);
  const [isDraggingPreviewResizer, setIsDraggingPreviewResizer] = useState(false);

  // Auto-measure screen and scale layout
  useEffect(() => {
    function measureAndScale() {
      if (typeof window === 'undefined') return;
      const w = window.innerWidth;
      if (w >= 2400) {
        setSidetabWidth(300);
        setPreviewWidth(540);
      } else if (w >= 1600) {
        setSidetabWidth(260);
        setPreviewWidth(480);
      } else if (w >= 1200) {
        setSidetabWidth(230);
        setPreviewWidth(420);
      } else {
        setSidetabWidth(200);
        setPreviewWidth(360);
      }
    }

    measureAndScale();
    window.addEventListener('resize', measureAndScale);
    return () => window.removeEventListener('resize', measureAndScale);
  }, []);

  // Resizing mouse events for Folder Tree (Col 2)
  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsDraggingResizer(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    setIsDraggingResizer(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const resize = useCallback((e) => {
    if (isDraggingResizer && workspaceLayoutRef.current) {
      const rect = workspaceLayoutRef.current.getBoundingClientRect();
      // Activity Bar is 52px fixed width
      const mouseRelativeX = Math.round(e.clientX - rect.left - 52);
      const clamped = Math.min(Math.max(mouseRelativeX, 180), 550);
      setSidetabWidth(clamped);
    }
  }, [isDraggingResizer]);

  useEffect(() => {
    if (isDraggingResizer) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingResizer, resize, stopResizing]);

  // Resizing mouse events for Preview Boundary (between Editor Col 3 and Preview Col 4)
  const startPreviewResizing = useCallback((e) => {
    e.preventDefault();
    setIsDraggingPreviewResizer(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopPreviewResizing = useCallback(() => {
    setIsDraggingPreviewResizer(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const resizePreview = useCallback((e) => {
    if (isDraggingPreviewResizer && workspaceLayoutRef.current) {
      const rect = workspaceLayoutRef.current.getBoundingClientRect();
      // Distance from mouse X to right edge of workspace layout
      const mouseDistFromRight = Math.round(rect.right - e.clientX);
      const folderW = isSidetabCollapsed ? 0 : sidetabWidth;
      // Guarantee editor has at least 320px
      const maxAllowed = Math.max(rect.width - 52 - folderW - 340, 300);
      const clamped = Math.min(Math.max(mouseDistFromRight, 280), maxAllowed);
      setPreviewWidth(clamped);
    }
  }, [isDraggingPreviewResizer, isSidetabCollapsed, sidetabWidth]);

  useEffect(() => {
    if (isDraggingPreviewResizer) {
      window.addEventListener('mousemove', resizePreview);
      window.addEventListener('mouseup', stopPreviewResizing);
    } else {
      window.removeEventListener('mousemove', resizePreview);
      window.removeEventListener('mouseup', stopPreviewResizing);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      window.removeEventListener('mousemove', resizePreview);
      window.removeEventListener('mouseup', stopPreviewResizing);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingPreviewResizer, resizePreview, stopPreviewResizing]);

  // Rename handlers (Chapter & Lesson)
  const startRenameChapter = (chap) => {
    setRenamingId(chap.id);
    setRenamingType('chapter');
    setRenamingTitle(chap.title);
  };

  const startRenameLesson = (les) => {
    setRenamingId(les.id);
    setRenamingType('lesson');
    setRenamingTitle(les.title);
  };

  const commitRename = async () => {
    if (!renamingId || !renamingTitle.trim()) {
      setRenamingId(null);
      setRenamingType(null);
      return;
    }
    const cleanTitle = renamingTitle.trim();

    if (renamingType === 'chapter') {
      setCourses((prevCourses) =>
        prevCourses.map((c) => ({
          ...c,
          chapters: c.chapters.map((ch) =>
            ch.id === renamingId ? { ...ch, title: cleanTitle } : ch
          ),
        }))
      );
      markDirty();
      try {
        if (!renamingId.startsWith('chap-')) {
          await adminApi.updateChapter(renamingId, { title: cleanTitle });
        }
        showToast('Chapter renamed');
      } catch (err) {
        console.warn('Renamed locally:', err.message);
        showToast('Renamed locally');
      }
    } else if (renamingType === 'lesson') {
      setCourses((prevCourses) =>
        prevCourses.map((c) => ({
          ...c,
          chapters: c.chapters.map((ch) => ({
            ...ch,
            lessons: ch.lessons.map((les) =>
              les.id === renamingId ? { ...les, title: cleanTitle } : les
            ),
          })),
        }))
      );
      if (selectedLessonId === renamingId) {
        setLessonTitle(cleanTitle);
      }
      markDirty();
      try {
        if (!renamingId.startsWith('les-')) {
          await adminApi.updateLesson(renamingId, { title: cleanTitle });
        }
        showToast('Lesson renamed');
      } catch (err) {
        console.warn('Renamed locally:', err.message);
        showToast('Lesson renamed');
      }
    }

    setRenamingId(null);
    setRenamingType(null);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenamingType(null);
  };

  // Reorder Learning Objectives (Up / Down)
  const moveObjective = (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= objectives.length) return;
    setObjectives((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
    markDirty();
  };

  // Active course
  const currentCourse = useMemo(() => {
    return courses.find((c) => c.id === selectedCourseId) || courses[0];
  }, [courses, selectedCourseId]);

  // Active lesson
  const currentLessonData = useMemo(() => {
    if (!currentCourse) return null;
    for (const chap of currentCourse.chapters) {
      for (const les of chap.lessons) {
        if (les.id === selectedLessonId) {
          return { chapter: chap, lesson: les };
        }
      }
    }
    return null;
  }, [currentCourse, selectedLessonId]);

  // Load courses from Supabase
  const loadFromDatabase = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          id, slug, title, description, status, sort_order,
          chapters(
            id, title, sort_order,
            lessons(id, slug, title, status, sort_order, content_md, objectives, lesson_content)
          )
        `)
        .order('sort_order');

      if (!error && data && data.length > 0) {
        const formatted = data.map((c) => ({
          ...c,
          chapters: (c.chapters || [])
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((chap) => ({
              ...chap,
              lessons: (chap.lessons || [])
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((les) => {
                  let rawObjs = les.objectives;
                  if (typeof rawObjs === 'string') {
                    try { rawObjs = JSON.parse(rawObjs); } catch (e) { rawObjs = []; }
                  }
                  if (!Array.isArray(rawObjs)) rawObjs = [];
                  const formattedObjs = rawObjs.map((obj, i) =>
                    typeof obj === 'string' ? { id: `obj-${les.id}-${i}`, text: obj, checked: false } : obj
                  );

                  let rawHints = les.lesson_content?.hints || (les.lesson_content?.hint ? [les.lesson_content.hint] : []);
                  const formattedHints = rawHints.map((h, i) =>
                    typeof h === 'string' ? { id: `hint-${les.id}-${i}`, text: h } : h
                  );

                  return {
                    ...les,
                    objectives: formattedObjs,
                    hints: formattedHints,
                  };
                }),
            })),
        }));

        setCourses(formatted);
        let activeCourse = formatted.find((c) => c.id === selectedCourseIdRef.current) || formatted[0];
        if (initialCourseSlug && !formatted.some((c) => c.id === selectedCourseIdRef.current)) {
          const matched = formatted.find((c) => c.slug === initialCourseSlug);
          if (matched) activeCourse = matched;
        }
        selectedCourseIdRef.current = activeCourse.id;
        setSelectedCourseId(activeCourse.id);
        if (activeCourse.chapters && activeCourse.chapters.length > 0) {
          const firstChap = activeCourse.chapters[0];
          setSelectedChapterId(firstChap.id);
          if (firstChap.lessons && firstChap.lessons.length > 0) {
            setSelectedLessonId(firstChap.lessons[0].id);
            setSelectedItemType('lesson');
          }
        }
      }
    } catch (err) {
      console.warn('Using offline/demo courses data:', err.message);
    }
  }, [initialCourseSlug]);

  // Handle course switcher from Command Center
  const handleCourseChange = useCallback((newCourseId) => {
    selectedCourseIdRef.current = newCourseId;
    setSelectedCourseId(newCourseId);
    const targetCourse = courses.find((c) => c.id === newCourseId);
    if (targetCourse?.chapters && targetCourse.chapters.length > 0) {
      const firstChap = targetCourse.chapters[0];
      setSelectedChapterId(firstChap.id);
      if (firstChap.lessons && firstChap.lessons.length > 0) {
        setSelectedLessonId(firstChap.lessons[0].id);
        setSelectedItemType('lesson');
      } else {
        setSelectedLessonId(null);
        setSelectedItemType('chapter');
      }
    } else {
      setSelectedChapterId(null);
      setSelectedLessonId(null);
    }
  }, [courses]);

  useEffect(() => {
    loadFromDatabase();
  }, [loadFromDatabase]);

  // When selected lesson changes, populate form state
  useEffect(() => {
    if (currentLessonData?.lesson) {
      const les = currentLessonData.lesson;
      setLessonTitle(les.title || '');
      setLessonStatus(les.status || 'draft');
      setLessonDifficulty(les.difficulty || 'Beginner');
      setLessonContent(les.content_md || '');
      setObjectives(les.objectives ? JSON.parse(JSON.stringify(les.objectives)) : []);
      setHints(les.hints ? JSON.parse(JSON.stringify(les.hints)) : []);
      setSaveStatus('saved');
    }
  }, [selectedLessonId, currentLessonData]);

  // Synchronize line numbers gutter with textarea scrolling
  const handleScroll = () => {
    if (textareaRef.current && lineGutterRef.current) {
      lineGutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Toast notification helper
  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  }, []);

  const [lastSavedBy, setLastSavedBy] = useState('manual'); // 'manual' | 'auto'

  // Mark state as dirty when form inputs change
  const markDirty = useCallback(() => {
    setSaveStatus((prev) => (prev !== 'dirty' ? 'dirty' : prev));
  }, []);

  // Ref holding latest state for safe auto-save / shortcut execution
  const latestSaveDataRef = useRef({});
  latestSaveDataRef.current = {
    selectedCourseId,
    selectedLessonId,
    currentLessonData,
    lessonTitle,
    lessonStatus,
    lessonDifficulty,
    lessonContent,
    objectives,
    hints,
  };

  // Save lesson handler (handles both auto-save and manual / shortcut save)
  const handleSaveLesson = useCallback(async ({ isAuto = false } = {}) => {
    const {
      selectedCourseId: courseId,
      selectedLessonId: lessonId,
      currentLessonData: currentData,
      lessonTitle: title,
      lessonStatus: status,
      lessonDifficulty: difficulty,
      lessonContent: content,
      objectives: curObjectives,
      hints: curHints,
    } = latestSaveDataRef.current;

    if (!currentData?.lesson || !lessonId) return;
    setSaveStatus('saving');

    // Update in-memory state first
    setCourses((prevCourses) =>
      prevCourses.map((c) => {
        if (c.id !== courseId) return c;
        return {
          ...c,
          chapters: c.chapters.map((chap) => ({
            ...chap,
            lessons: chap.lessons.map((les) => {
              if (les.id === lessonId) {
                return {
                  ...les,
                  title,
                  status,
                  difficulty,
                  content_md: content,
                  objectives: curObjectives,
                  hints: curHints,
                };
              }
              return les;
            }),
          })),
        };
      })
    );

    // Try Supabase API
    try {
      if (!lessonId.startsWith('les-')) {
        const payload = {
          title,
          status,
          content_md: content,
          objectives: curObjectives.map((o) => o.text),
        };

        const existingContent = currentData?.lesson?.lesson_content;
        if (existingContent && typeof existingContent === 'object' && existingContent.version === 1) {
          const normDiff = ['easy', 'medium', 'hard'].includes(difficulty?.toLowerCase())
            ? difficulty.toLowerCase()
            : difficulty?.toLowerCase() === 'beginner'
            ? 'easy'
            : difficulty?.toLowerCase() === 'advanced'
            ? 'hard'
            : existingContent.difficulty || 'easy';

          payload.lesson_content = {
            ...existingContent,
            version: 1,
            difficulty: normDiff,
            hint: curHints[0]?.text || existingContent.hint || '',
          };
        }

        const res = await adminApi.updateLesson(lessonId, payload);
        if (res?.error) {
          console.warn('DB lesson update notice:', res.error.message);
        }
      }
      setLastSavedBy(isAuto ? 'auto' : 'manual');
      setSaveStatus('saved');
      if (!isAuto) {
        showToast('Changes saved successfully');
      }
    } catch (err) {
      console.warn('Saved locally (DB sync optional):', err.message);
      setLastSavedBy(isAuto ? 'auto' : 'manual');
      setSaveStatus('saved');
      if (!isAuto) {
        showToast('Saved locally');
      }
    }
  }, [showToast]);

  // Auto-save effect: debounces 1500ms after user stops editing when saveStatus is dirty
  useEffect(() => {
    if (saveStatus !== 'dirty') return;
    if (!currentLessonData?.lesson) return;

    const timer = setTimeout(() => {
      handleSaveLesson({ isAuto: true });
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    saveStatus,
    lessonTitle,
    lessonStatus,
    lessonDifficulty,
    lessonContent,
    objectives,
    hints,
    handleSaveLesson,
    currentLessonData,
  ]);

  // Warn before unload if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (saveStatus === 'dirty') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  // Handle Delete Confirmation & Execution
  const handleExecuteDelete = useCallback(async () => {
    if (!deleteConfirmTarget) return;

    const { type, id, title, chapterId } = deleteConfirmTarget;

    if (type === 'chapter') {
      // 1. Remove chapter from course state
      setCourses((prevCourses) =>
        prevCourses.map((c) => {
          if (c.id !== selectedCourseId) return c;
          return {
            ...c,
            chapters: c.chapters.filter((ch) => ch.id !== id),
          };
        })
      );

      // If active lesson was inside this deleted chapter, select another available lesson
      const targetChap = currentCourse?.chapters?.find((ch) => ch.id === id);
      const isCurrentLessonInChap = targetChap?.lessons?.some((l) => l.id === selectedLessonId);
      if (isCurrentLessonInChap) {
        const remainingChapters = (currentCourse?.chapters || []).filter((ch) => ch.id !== id);
        let fallbackLessonId = null;
        for (const ch of remainingChapters) {
          if (ch.lessons && ch.lessons.length > 0) {
            fallbackLessonId = ch.lessons[0].id;
            break;
          }
        }
        setSelectedLessonId(fallbackLessonId);
      }

      if (selectedChapterId === id) {
        setSelectedChapterId(null);
        setSelectedItemType('lesson');
      }

      setDeleteConfirmTarget(null);
      showToast(`Deleted chapter "${title}"`);
      markDirty();

      // DB call if real ID
      try {
        if (!id.startsWith('chap-')) {
          await adminApi.deleteChapter?.(id);
        }
      } catch (err) {
        console.warn('DB chapter deletion deferred:', err.message);
      }
    } else if (type === 'lesson') {
      // 2. Remove lesson from chapter
      let nextLessonId = selectedLessonId;

      if (selectedLessonId === id) {
        const allLessons = (currentCourse?.chapters || []).flatMap((ch) => ch.lessons);
        const idx = allLessons.findIndex((l) => l.id === id);
        if (allLessons.length > 1) {
          nextLessonId = idx > 0 ? allLessons[idx - 1].id : allLessons[idx + 1].id;
        } else {
          nextLessonId = null;
        }
      }

      setCourses((prevCourses) =>
        prevCourses.map((c) => {
          if (c.id !== selectedCourseId) return c;
          return {
            ...c,
            chapters: c.chapters.map((ch) => {
              if (ch.id === chapterId || ch.lessons.some((l) => l.id === id)) {
                return {
                  ...ch,
                  lessons: ch.lessons.filter((l) => l.id !== id),
                };
              }
              return ch;
            }),
          };
        })
      );

      setSelectedLessonId(nextLessonId);
      setDeleteConfirmTarget(null);
      showToast(`Deleted lesson "${title}"`);
      markDirty();

      // DB call if real ID
      try {
        if (!id.startsWith('les-')) {
          await adminApi.deleteLesson?.(id);
        }
      } catch (err) {
        console.warn('DB lesson deletion deferred:', err.message);
      }
    }
  }, [deleteConfirmTarget, selectedCourseId, currentCourse, selectedLessonId, selectedChapterId, markDirty, showToast]);

  // Keyboard listener: Ctrl+S / Cmd+S for quick save, Delete / Backspace for deletion confirmation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. Shortcut: Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveLesson({ isAuto: false });
        return;
      }

      // If delete confirm modal is currently open
      if (deleteConfirmTarget) {
        if (e.key === 'Escape') {
          setDeleteConfirmTarget(null);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleExecuteDelete();
        }
        return;
      }

      if (showAddChapterModal || showAddLessonModal || renamingId) {
        return;
      }

      // Check if user is typing in form inputs / textareas / contentEditable
      const activeEl = document.activeElement;
      const tag = activeEl?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || activeEl?.isContentEditable) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedItemType === 'chapter' && selectedChapterId) {
          const chap = currentCourse?.chapters?.find((ch) => ch.id === selectedChapterId);
          if (chap) {
            e.preventDefault();
            setDeleteConfirmTarget({
              type: 'chapter',
              id: chap.id,
              title: chap.title,
              lessonCount: chap.lessons?.length || 0,
            });
          }
        } else if (selectedItemType === 'lesson' && selectedLessonId) {
          let foundLesson = null;
          let foundChapter = null;
          for (const ch of currentCourse?.chapters || []) {
            const l = ch.lessons.find((item) => item.id === selectedLessonId);
            if (l) {
              foundLesson = l;
              foundChapter = ch;
              break;
            }
          }
          if (foundLesson) {
            e.preventDefault();
            setDeleteConfirmTarget({
              type: 'lesson',
              id: foundLesson.id,
              title: foundLesson.title,
              chapterId: foundChapter?.id,
            });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    deleteConfirmTarget,
    showAddChapterModal,
    showAddLessonModal,
    renamingId,
    selectedItemType,
    selectedChapterId,
    selectedLessonId,
    currentCourse,
    handleExecuteDelete,
    handleSaveLesson,
  ]);

  // Line numbers generation
  const lineCount = useMemo(() => {
    return Math.max(lessonContent.split('\n').length, 12);
  }, [lessonContent]);

  // Toggle chapter accordion in sidetab
  const toggleChapterCollapse = (chapId) => {
    setCollapsedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapId)) next.delete(chapId);
      else next.add(chapId);
      return next;
    });
  };


  // ==============================================================
  // LEARNING OBJECTIVES MANAGEMENT
  // ==============================================================
  const toggleObjectiveCheck = (objId) => {
    setObjectives((prev) =>
      prev.map((item) => (item.id === objId ? { ...item, checked: !item.checked } : item))
    );
    markDirty();
  };

  const updateObjectiveText = (objId, newText) => {
    setObjectives((prev) =>
      prev.map((item) => (item.id === objId ? { ...item, text: newText } : item))
    );
    markDirty();
  };

  const removeObjective = (objId) => {
    setObjectives((prev) => prev.filter((item) => item.id !== objId));
    markDirty();
  };

  const addObjective = (e) => {
    if (e) e.preventDefault();
    if (!newObjectiveText.trim()) return;
    const newObj = {
      id: `obj-${Date.now()}`,
      text: newObjectiveText.trim(),
      checked: false,
    };
    setObjectives((prev) => [...prev, newObj]);
    setNewObjectiveText('');
    markDirty();
  };

  // ==============================================================
  // HINTS MANAGEMENT
  // ==============================================================
  const updateHintText = (hintId, newText) => {
    setHints((prev) =>
      prev.map((item) => (item.id === hintId ? { ...item, text: newText } : item))
    );
    markDirty();
  };

  const removeHint = (hintId) => {
    setHints((prev) => prev.filter((item) => item.id !== hintId));
    markDirty();
  };

  const addHint = (e) => {
    if (e) e.preventDefault();
    if (!newHintText.trim()) return;
    const newH = {
      id: `hint-${Date.now()}`,
      text: newHintText.trim(),
    };
    setHints((prev) => [...prev, newH]);
    setNewHintText('');
    markDirty();
  };

  // ==============================================================
  // DRAG AND DROP REORDERING & CROSS-FOLDER MOVEMENT
  // ==============================================================
  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItem(item);
  };

  const handleDragOverLesson = (e, targetLessonId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem || draggedItem.lessonId === targetLessonId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clientY = e.clientY;
    const midpoint = rect.top + rect.height / 2;
    const pos = clientY < midpoint ? 'top' : 'bottom';

    setDragOverLessonId(targetLessonId);
    setDragOverPosition(pos);
  };

  const handleDragLeaveLesson = () => {
    setDragOverLessonId(null);
    setDragOverPosition(null);
  };

  const handleDropOnLesson = (e, targetLesson, targetChapterId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem) return;

    if (draggedItem.type === 'lesson') {
      const { lessonId, sourceChapterId } = draggedItem;
      if (lessonId === targetLesson.id) {
        setDragOverLessonId(null);
        setDraggedItem(null);
        return;
      }

      // Reorder or move across chapters
      setCourses((prevCourses) => {
        return prevCourses.map((c) => {
          if (c.id !== selectedCourseId) return c;

          let lessonToMove = null;
          // Step 1: remove from source chapter
          const nextChapters = c.chapters.map((chap) => {
            if (chap.id === sourceChapterId) {
              const remaining = chap.lessons.filter((l) => {
                if (l.id === lessonId) {
                  lessonToMove = l;
                  return false;
                }
                return true;
              });
              return { ...chap, lessons: remaining };
            }
            return chap;
          });

          if (!lessonToMove) return c;

          // Step 2: insert into target chapter
          const finalChapters = nextChapters.map((chap) => {
            if (chap.id === targetChapterId) {
              const targetIdx = chap.lessons.findIndex((l) => l.id === targetLesson.id);
              const insertIdx = dragOverPosition === 'bottom' ? targetIdx + 1 : targetIdx;
              const newLessons = [...chap.lessons];
              newLessons.splice(insertIdx, 0, lessonToMove);
              // Recalculate sort_order
              const reordered = newLessons.map((les, idx) => ({ ...les, sort_order: idx + 1 }));
              return { ...chap, lessons: reordered };
            }
            return chap;
          });

          return { ...c, chapters: finalChapters };
        });
      });

      showToast('Moved lesson successfully');
      markDirty();
    }

    setDragOverLessonId(null);
    setDragOverPosition(null);
    setDraggedItem(null);
  };

  const handleDropOnChapter = (e, chapterId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem) return;

    if (draggedItem.type === 'lesson') {
      const { lessonId, sourceChapterId } = draggedItem;
      if (sourceChapterId === chapterId) {
        setDragOverChapterId(null);
        setDraggedItem(null);
        return;
      }

      // Move lesson to target chapter's bottom
      setCourses((prevCourses) => {
        return prevCourses.map((c) => {
          if (c.id !== selectedCourseId) return c;
          let movedItem = null;

          const updated = c.chapters.map((chap) => {
            if (chap.id === sourceChapterId) {
              const filtered = chap.lessons.filter((l) => {
                if (l.id === lessonId) {
                  movedItem = l;
                  return false;
                }
                return true;
              });
              return { ...chap, lessons: filtered };
            }
            return chap;
          });

          if (!movedItem) return c;

          return {
            ...c,
            chapters: updated.map((chap) => {
              if (chap.id === chapterId) {
                const newLessons = [...chap.lessons, { ...movedItem, sort_order: chap.lessons.length + 1 }];
                return { ...chap, lessons: newLessons };
              }
              return chap;
            }),
          };
        });
      });

      showToast('Moved lesson to folder');
      markDirty();
    } else if (draggedItem.type === 'chapter') {
      // Reorder chapters
      const { chapterId: srcChapId } = draggedItem;
      if (srcChapId !== chapterId) {
        setCourses((prevCourses) => {
          return prevCourses.map((c) => {
            if (c.id !== selectedCourseId) return c;
            const srcIdx = c.chapters.findIndex((ch) => ch.id === srcChapId);
            const dstIdx = c.chapters.findIndex((ch) => ch.id === chapterId);
            if (srcIdx === -1 || dstIdx === -1) return c;

            const newChapters = [...c.chapters];
            const [movedChap] = newChapters.splice(srcIdx, 1);
            newChapters.splice(dstIdx, 0, movedChap);
            const reordered = newChapters.map((ch, idx) => ({ ...ch, sort_order: idx + 1 }));
            return { ...c, chapters: reordered };
          });
        });
        showToast('Reordered chapter');
        markDirty();
      }
    }

    setDragOverChapterId(null);
    setDraggedItem(null);
  };

  // ==============================================================
  // ADD LESSON & CHAPTER ACTIONS
  // ==============================================================
  const handleOpenAddLesson = (chapterId) => {
    setAddLessonTargetChapterId(chapterId);
    setNewLessonTitleInput('');
    setShowAddLessonModal(true);
  };

  const handleConfirmAddLesson = async (e) => {
    e.preventDefault();
    const title = newLessonTitleInput.trim();
    if (!title) return;

    const newId = `les-${Date.now()}`;
    const newLessonObj = {
      id: newId,
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'new-lesson',
      sort_order: 99,
      status: 'draft',
      content_md: `### ${title}\n\nStart writing lesson instructions here...`,
      objectives: [{ id: `obj-${newId}-1`, text: 'Understand core concepts', checked: false }],
      hints: [{ id: `hint-${newId}-1`, text: 'Tip: Review command documentation' }],
    };

    setCourses((prev) => {
      return prev.map((c) => {
        if (c.id !== selectedCourseId) return c;
        return {
          ...c,
          chapters: c.chapters.map((chap) => {
            if (chap.id === addLessonTargetChapterId) {
              const updatedLessons = [...chap.lessons, { ...newLessonObj, sort_order: chap.lessons.length + 1 }];
              return { ...chap, lessons: updatedLessons };
            }
            return chap;
          }),
        };
      });
    });

    setSelectedLessonId(newId);
    setShowAddLessonModal(false);
    showToast(`Created lesson "${title}"`);
    markDirty();

    // Call Supabase adminApi if real database connected
    try {
      if (!addLessonTargetChapterId.startsWith('chap-')) {
        await adminApi.createLesson(addLessonTargetChapterId, {
          title,
          slug: newLessonObj.slug,
          status: 'draft',
          sort_order: newLessonObj.sort_order,
          content_md: newLessonObj.content_md,
          objectives: newLessonObj.objectives,
        });
      }
    } catch (err) {
      console.warn('DB creation deferred:', err.message);
    }
  };

  const handleConfirmAddChapter = async (e) => {
    e.preventDefault();
    const title = newChapterTitleInput.trim();
    if (!title) return;

    const newChapId = `chap-${Date.now()}`;
    const newChapterObj = {
      id: newChapId,
      title,
      sort_order: (currentCourse?.chapters?.length || 0) + 1,
      lessons: [],
    };

    setCourses((prev) => {
      return prev.map((c) => {
        if (c.id !== selectedCourseId) return c;
        return {
          ...c,
          chapters: [...c.chapters, newChapterObj],
        };
      });
    });

    setShowAddChapterModal(false);
    setNewChapterTitleInput('');
    showToast(`Created chapter "${title}"`);
    markDirty();

    try {
      if (!selectedCourseId.startsWith('course-')) {
        await adminApi.createChapter(selectedCourseId, {
          title,
          sort_order: newChapterObj.sort_order,
        });
      }
    } catch (err) {
      console.warn('DB creation deferred:', err.message);
    }
  };

  return (
    <div className={styles.studioWrapper}>
      {/* Toast popup */}
      {toastMessage && (
        <div className={styles.toastNotification}>
          <Icon name="check" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* PORTAL COMMAND CENTER & ACTIONS TO GLOBAL ADMIN TITLEBAR */}
      {mounted && typeof document !== 'undefined' && document.getElementById('admin-header-center') ? (
        <>
          {createPortal(
            <div className={styles.vscCommandCenter} title="Quick course and lesson navigation">
              <span className={styles.commandCenterIcon}><Icon name="search" /></span>
              {/* Custom Course Dropdown */}
              <div className={styles.commandCenterCourseDropdownWrapper} ref={courseDropdownRef}>
                <button
                  type="button"
                  className={styles.commandCenterCourseTrigger}
                  onClick={() => setCourseDropdownOpen(!courseDropdownOpen)}
                  aria-expanded={courseDropdownOpen}
                  aria-haspopup="listbox"
                  aria-label={`Select course: ${courses.find((c) => c.id === selectedCourseId)?.title || 'Select course'}`}
                  title={courses.find((c) => c.id === selectedCourseId)?.title || 'Select course'}
                >
                  <span className={styles.commandCenterCourseTriggerText}>
                    {courses.find((c) => c.id === selectedCourseId)?.title || 'Select course'}
                  </span>
                  <span className={`material-symbols-outlined ${styles.commandCenterChevron} ${courseDropdownOpen ? styles.commandCenterChevronOpen : ''}`}>
                    expand_more
                  </span>
                </button>

                {courseDropdownOpen && (
                  <div className={styles.commandCenterCourseMenu} role="listbox" aria-label="Courses">
                    <div className={styles.commandCenterMenuHeader}>Courses</div>
                    <div className={styles.commandCenterMenuList}>
                      {courses.map((course) => {
                        const isSelected = course.id === selectedCourseId;
                        return (
                          <button
                            key={course.id}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            className={`${styles.commandCenterMenuItem} ${isSelected ? styles.commandCenterMenuItemActive : ''}`}
                            onClick={() => {
                              handleCourseChange(course.id);
                              setCourseDropdownOpen(false);
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '15px', opacity: isSelected ? 1 : 0.65 }}>
                              school
                            </span>
                            <span className={styles.commandCenterItemTitle} title={course.title}>
                              {course.title}
                            </span>
                            {isSelected && (
                              <span className={`material-symbols-outlined ${styles.commandCenterItemCheck}`}>
                                check
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <span className={styles.commandCenterSep}>›</span>
              <span className={styles.commandCenterChapter} title={currentLessonData?.chapter?.title || 'Chapter'}>
                {currentLessonData?.chapter?.title || 'Chapter'}
              </span>
              <span className={styles.commandCenterSep}>›</span>
              <span className={styles.commandCenterLesson} title={lessonTitle || 'Untitled Lesson'}>
                {lessonTitle || 'Untitled Lesson'}
              </span>
            </div>,
            document.getElementById('admin-header-center')
          )}

          {document.getElementById('admin-header-right') && createPortal(
            <div className={styles.titleBarRight}>
              <div
                className={`${styles.saveStatus} ${styles[saveStatus] || ''}`}
                title={
                  saveStatus === 'saved'
                    ? lastSavedBy === 'auto'
                      ? 'All changes auto-saved'
                      : 'Saved'
                    : saveStatus === 'dirty'
                    ? 'Unsaved changes'
                    : 'Saving changes...'
                }
              >
                {saveStatus === 'saving' && <span>⟳ Saving…</span>}
                {saveStatus === 'dirty' && <span>● Unsaved</span>}
                {saveStatus === 'saved' && <span>✓ {lastSavedBy === 'auto' ? 'Auto-saved' : 'Saved'}</span>}
              </div>
            </div>,
            document.getElementById('admin-header-right')
          )}
        </>
      ) : null}

      {/* MAIN 4-COLUMN WORKSPACE (VSCODE STYLE) */}
      <div
        ref={workspaceLayoutRef}
        className={`${styles.workspaceLayout} ${!showPreview ? styles.hidePreviewLayout : ''}`}
      >
        {/* ==============================================================
            COLUMN 1: CHATGPT-STYLE ACTIVITY RAIL (FIXED 48px, NOT RESIZABLE)
            ============================================================== */}
        <aside className={styles.activityBar} aria-label="Activity Rail">
          <div className={styles.activityGroup}>
            {/* 1. Toggle Explorer: Chapters & Lessons */}
            <button
              type="button"
              className={`${styles.activityBtn} ${!isSidetabCollapsed ? styles.activityActive : ''}`}
              onClick={() => togglePanel('explorer')}
              data-tooltip="Explorer"
              title="Explorer"
              aria-label="Explorer"
            >
              <Icon name="folder" />
            </button>

            {/* 3. Toggle Editor: Lesson Editor */}
            <button
              type="button"
              className={`${styles.activityBtn} ${showEditor ? styles.activityActive : ''}`}
              onClick={() => togglePanel('editor')}
              data-tooltip="Lesson Editor"
              title="Lesson Editor"
              aria-label="Toggle Lesson Editor"
            >
              <Icon name="pencil" />
            </button>

            {/* 4. Toggle Preview: Student Preview */}
            <button
              type="button"
              className={`${styles.activityBtn} ${showPreview ? styles.activityActive : ''}`}
              onClick={() => togglePanel('preview')}
              data-tooltip="Student Preview"
              title="Student Preview"
              aria-label="Toggle Student Preview"
            >
              <Icon name="eye" />
            </button>
          </div>

          <div className={styles.activityGroupBottom} />
        </aside>

        {/* ==============================================================
            COLUMN 2: THANH FOLDER (EXPLORER - CHAPTERS & LESSONS)
            ============================================================== */}
        <aside
          className={`${styles.sidetabColumn} ${isSidetabCollapsed ? styles.sidetabCollapsed : ''}`}
          style={{
            width: isSidetabCollapsed ? 0 : `${sidetabWidth}px`,
            display: isSidetabCollapsed ? 'none' : 'flex',
          }}
          aria-label="Course content navigation"
        >
          <div className={styles.sidetabHeader}>
            <span className={styles.sidetabTitle}>Explorer</span>
            <div className={styles.sidetabHeaderActions}>
              {/* Nút add chapter: Folder có dấu cộng */}
              <button
                type="button"
                className={styles.iconBtnSmall}
                onClick={() => setShowAddChapterModal(true)}
                title="New Chapter"
                aria-label="New Chapter"
              >
                <Icon name="folderPlus" />
              </button>
            </div>
          </div>

          {/* Search filter inside sidetab */}
          <div className={styles.sidetabSearch}>
            <input
              type="text"
              placeholder="Filter lessons or chapters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          {/* Tree hierarchy */}
          <div className={styles.sidetabTree}>
            {currentCourse?.chapters?.map((chapter) => {
              const isCollapsed = collapsedChapters.has(chapter.id);
              const isChapterDropTarget = dragOverChapterId === chapter.id;

              // Filter lessons if query
              const filteredLessons = chapter.lessons.filter((l) =>
                l.title.toLowerCase().includes(searchQuery.toLowerCase())
              );

              return (
                <div
                  key={chapter.id}
                  className={`${styles.chapterBlock} ${isChapterDropTarget ? styles.chapterDropTarget : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverChapterId(chapter.id);
                  }}
                  onDragLeave={() => setDragOverChapterId(null)}
                  onDrop={(e) => handleDropOnChapter(e, chapter.id)}
                >
                  {/* Chapter header row (Folder) */}
                  <div
                    className={`${styles.chapterHeader} ${
                      selectedItemType === 'chapter' && selectedChapterId === chapter.id
                        ? styles.chapterSelected
                        : ''
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, { type: 'chapter', chapterId: chapter.id })}
                    onClick={() => {
                      setSelectedItemType('chapter');
                      setSelectedChapterId(chapter.id);
                    }}
                  >
                    <button
                      type="button"
                      className={styles.chapterToggleBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItemType('chapter');
                        setSelectedChapterId(chapter.id);
                        toggleChapterCollapse(chapter.id);
                      }}
                      onDoubleClick={(e) => { e.stopPropagation(); startRenameChapter(chapter); }}
                    >
                      <Icon name={isCollapsed ? 'chevronRight' : 'chevronDown'} />
                      <span className={styles.chapterFolderIcon}><Icon name="folder" /></span>
                      {renamingId === chapter.id && renamingType === 'chapter' ? (
                        <input
                          type="text"
                          className={styles.renameInput}
                          value={renamingTitle}
                          autoFocus
                          onChange={(e) => setRenamingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename();
                            if (e.key === 'Escape') cancelRename();
                          }}
                          onBlur={commitRename}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <strong className={styles.chapterTitleText} title="Click to select, double-click to rename">{chapter.title}</strong>
                      )}
                    </button>

                    <div className={styles.chapterActions}>
                      <button
                        type="button"
                        className={styles.chapterAddLessonBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAddLesson(chapter.id);
                        }}
                        title="Add lesson to this chapter"
                        aria-label="Add lesson to this chapter"
                      >
                        <Icon name="plus" />
                      </button>
                    </div>
                  </div>

                  {/* Lessons list inside chapter (Files) */}
                  {!isCollapsed && (
                    <div className={styles.lessonList}>
                      {filteredLessons.map((lesson) => {
                        const isSelected = lesson.id === selectedLessonId;
                        const isDragging = draggedItem?.lessonId === lesson.id;
                        const isOver = dragOverLessonId === lesson.id;
                        const overPos = isOver ? dragOverPosition : null;

                        return (
                          <div
                            key={lesson.id}
                            className={`
                              ${styles.lessonItem}
                              ${isSelected ? styles.lessonActive : ''}
                              ${selectedItemType === 'lesson' && isSelected ? styles.lessonSelected : ''}
                              ${isDragging ? styles.dragging : ''}
                              ${overPos === 'top' ? styles.dragOverTop : ''}
                              ${overPos === 'bottom' ? styles.dragOverBottom : ''}
                            `}
                            draggable
                            onDragStart={(e) =>
                              handleDragStart(e, {
                                type: 'lesson',
                                lessonId: lesson.id,
                                sourceChapterId: chapter.id,
                              })
                            }
                            onDragOver={(e) => handleDragOverLesson(e, lesson.id)}
                            onDragLeave={handleDragLeaveLesson}
                            onDrop={(e) => handleDropOnLesson(e, lesson, chapter.id)}
                            onClick={() => {
                              if (saveStatus === 'dirty' && lesson.id !== selectedLessonId) {
                                handleSaveLesson({ isAuto: true });
                              }
                              setSelectedLessonId(lesson.id);
                              setSelectedChapterId(chapter.id);
                              setSelectedItemType('lesson');
                            }}
                          >
                            <span className={styles.lessonItemIcon}><Icon name="fileText" /></span>
                            {renamingId === lesson.id && renamingType === 'lesson' ? (
                              <input
                                type="text"
                                className={styles.renameInput}
                                value={renamingTitle}
                                autoFocus
                                onChange={(e) => setRenamingTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitRename();
                                  if (e.key === 'Escape') cancelRename();
                                }}
                                onBlur={commitRename}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <span
                                className={styles.lessonItemTitle}
                                onDoubleClick={(e) => { e.stopPropagation(); startRenameLesson(lesson); }}
                                title="Click to select, double-click to rename"
                              >
                                {lesson.title}
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {filteredLessons.length === 0 && (
                        <div className={styles.emptyChapterPrompt}>
                          <span>No lessons here yet.</span>
                          <button
                            type="button"
                            className={styles.linkButtonSmall}
                            onClick={() => handleOpenAddLesson(chapter.id)}
                          >
                            + Add Lesson
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </aside>

        {/* Resizer Splitter 1: Resize Explorer width */}
        {!isSidetabCollapsed && (showEditor || showPreview) && (
          <div
            className={`${styles.columnSplitter} ${isDraggingResizer ? styles.splitterActive : ''}`}
            onMouseDown={startResizing}
            title="Drag left/right to resize Explorer"
            role="separator"
            aria-orientation="vertical"
          >
            <div className={styles.splitterHandle} />
          </div>
        )}

        {/* ==============================================================
            COLUMN 3: CENTER EDITING AREA (INPUT / OBJECTIVES / HINTS)
            ============================================================== */}
        {showEditor && (
          <main className={styles.editorColumn} aria-label="Lesson Content Editor">
            {/* VSCode Editor Tab Bar matching Example/Mẫu tab.png */}
            <div className={styles.editorTabBar} role="tablist" aria-label="Editor tabs">
              <div className={styles.editorTabList}>
                {/* Tab 1: Input / Lesson Content */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeEditTab === 'input'}
                  className={`${styles.editorTab} ${activeEditTab === 'input' ? styles.editorTabActive : ''}`}
                  onClick={() => setActiveEditTab('input')}
                  title="Lesson Content"
                >
                  <span className={styles.editorTabIcon}><Icon name="pencil" /></span>
                  <span className={styles.editorTabTitle}>Content</span>
                </button>

                {/* Tab 2: Learning Objectives */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeEditTab === 'objectives'}
                  className={`${styles.editorTab} ${activeEditTab === 'objectives' ? styles.editorTabActive : ''}`}
                  onClick={() => setActiveEditTab('objectives')}
                  title="Learning Objectives"
                >
                  <span className={styles.editorTabIcon}><Icon name="checkBadge" /></span>
                  <span className={styles.editorTabTitle}>Objectives</span>
                  {objectives.length > 0 && (
                    <span className={styles.editorTabBadge}>{objectives.length}</span>
                  )}
                </button>

                {/* Tab 3: Hints & Tips */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeEditTab === 'hints'}
                  className={`${styles.editorTab} ${activeEditTab === 'hints' ? styles.editorTabActive : ''}`}
                  onClick={() => setActiveEditTab('hints')}
                  title="Hints & Tips"
                >
                  <span className={styles.editorTabIcon}><Icon name="lightbulb" /></span>
                  <span className={styles.editorTabTitle}>Hints</span>
                  {hints.length > 0 && (
                    <span className={styles.editorTabBadgeAmber}>{hints.length}</span>
                  )}
                </button>
              </div>

              <div className={styles.editorTabActions}>
                {/* Lesson difficulty dropdown */}
                <AdminSelect
                  className={styles.difficultyPicker}
                  label="Lesson Difficulty"
                  value={lessonDifficulty}
                  onChange={(value) => {
                    setLessonDifficulty(value);
                    markDirty();
                  }}
                  options={[
                    { value: 'Beginner', label: 'Beginner' },
                    { value: 'Intermediate', label: 'Intermediate' },
                    { value: 'Advanced', label: 'Advanced' },
                  ]}
                  align="right"
                />
              </div>
            </div>

            {/* CLUSTER 1: INPUT AREA (Markdown editor) */}
            {activeEditTab === 'input' && (
            <>
              {/* Scrollable Editor Container */}
              <div className={styles.editorScrollArea}>
                {/* Markdown Textarea with Line Numbers */}
                <div className={styles.editorTextareaWrapper}>
                  <div ref={lineGutterRef} className={styles.lineNumbersGutter} aria-hidden="true">
                    {Array.from({ length: lineCount }).map((_, idx) => (
                      <div key={idx} className={styles.lineNumberItem}>
                        {idx + 1}
                      </div>
                    ))}
                  </div>
                  <textarea
                    ref={textareaRef}
                    className={styles.editorTextarea}
                    style={{ fontFamily, fontSize }}
                    value={lessonContent}
                    onChange={(e) => {
                      setLessonContent(e.target.value);
                      markDirty();
                    }}
                    onScroll={handleScroll}
                    placeholder="Compose lesson instructions, content, and explanations using Markdown format..."
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* Bottom Status bar for input view */}
              <div className={styles.inputStatusBar}>
                <div className={styles.statusBarMetrics}>
                  <span>{lessonContent.split('\n').length} lines</span>
                  <span>{lessonContent.trim() ? lessonContent.trim().split(/\s+/).length : 0} words</span>
                  <span>{lessonContent.length} chars</span>
                </div>
                <div>Editing: <strong>{lessonTitle || 'Untitled Lesson'}</strong></div>
              </div>
            </>
          )}

          {/* CLUSTER 2: LEARNING OBJECTIVES (Interactive checklist) */}
          {activeEditTab === 'objectives' && (
            <div className={styles.objectivesFullView}>
              <div className={styles.panelHeroHeader}>
                <div>
                  <div className={styles.panelHeroTitle}>
                    <Icon name="checkBadge" />
                    <h2>Learning Objectives</h2>
                  </div>
                  <p className={styles.panelHeroDesc}>
                    Define lesson completion criteria as a checklist. Students will view and check off items as they progress through the lab.
                  </p>
                  <div className={styles.progressBarTrack}>
                    <div
                      className={styles.progressBarFill}
                      style={{
                        width: `${objectives.length > 0 ? (objectives.filter((o) => o.checked).length / objectives.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <span className={styles.sectionCountBadge}>
                  {objectives.filter((o) => o.checked).length} / {objectives.length} completed
                </span>
              </div>

              {/* Checklist items */}
              <div className={styles.objectiveList}>
                {objectives.map((obj, idx) => (
                  <div key={obj.id} className={styles.objectiveRow}>
                    <input
                      type="checkbox"
                      className={styles.objectiveCheckbox}
                      checked={obj.checked}
                      onChange={() => toggleObjectiveCheck(obj.id)}
                      title="Toggle completed status"
                    />
                    <input
                      type="text"
                      className={`${styles.objectiveTextInput} ${obj.checked ? styles.objectiveCompleted : ''}`}
                      value={obj.text}
                      onChange={(e) => updateObjectiveText(obj.id, e.target.value)}
                      placeholder="Enter learning objective description..."
                    />
                    <div className={styles.orderControls}>
                      <button
                        type="button"
                        className={styles.orderBtn}
                        onClick={() => moveObjective(idx, 'up')}
                        disabled={idx === 0}
                        title="Move up"
                      >
                        <Icon name="arrowUp" />
                      </button>
                      <button
                        type="button"
                        className={styles.orderBtn}
                        onClick={() => moveObjective(idx, 'down')}
                        disabled={idx === objectives.length - 1}
                        title="Move down"
                      >
                        <Icon name="arrowDown" />
                      </button>
                    </div>
                    <button
                      type="button"
                      className={styles.objectiveDeleteBtn}
                      onClick={() => removeObjective(obj.id)}
                      title="Delete this objective"
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                ))}

                {objectives.length === 0 && (
                  <div className={styles.emptySectionText}>
                    No learning objectives yet. Add your first objective below!
                  </div>
                )}
              </div>

              {/* Add objective form */}
              <form onSubmit={addObjective} className={styles.addItemForm}>
                <input
                  type="text"
                  className={styles.addItemInput}
                  placeholder="+ Enter new objective and press Enter (e.g. Create a directory backup script)..."
                  value={newObjectiveText}
                  onChange={(e) => setNewObjectiveText(e.target.value)}
                />
                <button
                  type="submit"
                  className={styles.addItemSubmitBtn}
                  disabled={!newObjectiveText.trim()}
                >
                  Add Objective
                </button>
              </form>

              <div className={styles.proTipBanner}>
                <Icon name="target" />
                <span>
                  <strong>Tip:</strong> Start objectives with specific action verbs (e.g., <em>Execute</em>, <em>Configure</em>, <em>Verify</em>, <em>Troubleshoot</em>).
                </span>
              </div>
            </div>
          )}

          {/* CLUSTER 3: HINTS & TIPS */}
          {activeEditTab === 'hints' && (
            <div className={styles.hintsFullView}>
              <div className={styles.panelHeroHeader}>
                <div>
                  <div className={styles.panelHeroTitle}>
                    <Icon name="lightbulb" />
                    <h2>Hints &amp; Tips</h2>
                  </div>
                  <p className={styles.panelHeroDesc}>
                    Provide step-by-step hints and advice for students when they get stuck, without revealing the full solution at once.
                  </p>
                </div>
                <span className={styles.sectionCountBadge}>{hints.length} {hints.length === 1 ? 'hint' : 'hints'}</span>
              </div>

              {/* Hints cards list */}
              <div className={styles.hintsList}>
                {hints.map((hint, idx) => (
                  <div key={hint.id} className={styles.hintCardDedicated}>
                    <div className={styles.hintCardHeader}>
                      <span className={styles.hintBadgeAmber}>
                        <Icon name="lightbulb" />
                        Hint #{idx + 1}
                      </span>
                      <button
                        type="button"
                        className={styles.objectiveDeleteBtn}
                        onClick={() => removeHint(hint.id)}
                        title="Delete this hint"
                      >
                        <Icon name="trash" />
                      </button>
                    </div>
                    <textarea
                      className={styles.hintTextarea}
                      value={hint.text}
                      onChange={(e) => updateHintText(hint.id, e.target.value)}
                      placeholder="Enter hint instructions, sample syntax, or troubleshooting advice..."
                      rows={3}
                    />
                  </div>
                ))}

                {hints.length === 0 && (
                  <div className={styles.emptySectionText}>
                    No hints added for this lesson yet. Add a hint below to assist learners!
                  </div>
                )}
              </div>

              {/* Add hint form */}
              <form onSubmit={addHint} className={styles.addItemForm}>
                <input
                  type="text"
                  className={styles.addItemInput}
                  placeholder="+ Enter new hint or tip and press Enter..."
                  value={newHintText}
                  onChange={(e) => setNewHintText(e.target.value)}
                />
                <button
                  type="submit"
                  className={styles.addItemSubmitBtn}
                  disabled={!newHintText.trim()}
                >
                  Add Hint
                </button>
              </form>

              <div className={styles.proTipBanner}>
                <Icon name="lightbulb" />
                <span>
                  <strong>Pro Tip:</strong> Stage hints progressively: Hint 1 guides high-level thinking, Hint 2 mentions command syntax, Hint 3 provides a concrete example.
                </span>
              </div>
            </div>
          )}

          </main>
        )}

        {/* Resizer Splitter 2: Resize preview panel */}
        {showEditor && showPreview && (
          <div
            className={`${styles.columnSplitter} ${isDraggingPreviewResizer ? styles.splitterActive : ''}`}
            onMouseDown={startPreviewResizing}
            title="Drag left/right to resize preview panel"
            role="separator"
            aria-orientation="vertical"
          >
            <div className={styles.splitterHandle} />
          </div>
        )}

        {/* ==============================================================
            COLUMN 4: STUDENT PREVIEW (REAL-TIME UPDATE, HIDE/SHOW OPTION)
            ============================================================== */}
        {showPreview && (
          <aside
            className={styles.previewColumn}
            style={{
              width: showEditor ? `${previewWidth}px` : '100%',
              flex: showEditor ? 'none' : '1 1 0%',
            }}
            aria-label="Student Real-time Preview"
          >
            <div className={styles.previewHeader}>
              <div className={styles.previewTitleBlock}>
                <span className={styles.previewLiveDot} />
                <span className={styles.previewHeadingText}>Student Preview</span>
              </div>

              {/* Responsive viewport switcher */}
              <div className={styles.viewportSwitcher}>
                <button
                  type="button"
                  className={`${styles.viewportBtn} ${previewDevice === 'desktop' ? styles.activeViewport : ''}`}
                  onClick={() => setPreviewDevice('desktop')}
                  title="Desktop View (100%)"
                >
                  Desktop
                </button>
                <button
                  type="button"
                  className={`${styles.viewportBtn} ${previewDevice === 'tablet' ? styles.activeViewport : ''}`}
                  onClick={() => setPreviewDevice('tablet')}
                  title="Tablet View (768px)"
                >
                  Tablet
                </button>
                <button
                  type="button"
                  className={`${styles.viewportBtn} ${previewDevice === 'mobile' ? styles.activeViewport : ''}`}
                  onClick={() => setPreviewDevice('mobile')}
                  title="Mobile View (375px)"
                >
                  Mobile
                </button>
              </div>
            </div>

            {/* Subheader tabs */}
            <div className={styles.previewSubTabs}>
              <button
                type="button"
                className={`${styles.previewSubTabBtn} ${previewTab === 'workspace' ? styles.activeSubTab : ''}`}
                onClick={() => setPreviewTab('workspace')}
              >
                Interactive Lab
              </button>
              <button
                type="button"
                className={`${styles.previewSubTabBtn} ${previewTab === 'terminal' ? styles.activeSubTab : ''}`}
                onClick={() => setPreviewTab('terminal')}
              >
                Terminal Output
              </button>
            </div>

            {/* Preview Frame Wrapper */}
            <div className={`${styles.previewFrameScrollArea} ${styles[`device_${previewDevice}`]}`}>
              <div className={styles.studentWorkspaceMock}>
                
                {/* Simulated Student Workspace Header */}
                <div className={styles.mockLessonHero}>
                  <div className={styles.mockTrackBadge}>
                    {currentLessonData?.chapter?.title || 'Track'}
                  </div>
                  <h1 className={styles.mockLessonTitle}>{lessonTitle || 'Untitled Lesson'}</h1>
                  <div className={styles.mockMetaRow}>
                    <span className={styles.mockTimeEstimate}>Est. 15 mins</span>
                    <span className={styles.mockDifficultyBadge}>{lessonDifficulty || 'Beginner'}</span>
                  </div>
                </div>

                {previewTab === 'workspace' ? (
                  <div className={styles.mockContentBody}>
                    {/* Live Markdown Render */}
                    <div className={styles.markdownLiveContainer}>
                      <Markdown>{lessonContent || '*No content written yet.*'}</Markdown>
                    </div>

                    {/* Live Objectives Checklist */}
                    {objectives.length > 0 && (
                      <div className={styles.mockObjectivesBox}>
                        <div className={styles.mockObjectivesHeader}>
                          <Icon name="target" />
                          <span>Learning Objectives</span>
                        </div>
                        <div className={styles.mockObjectivesList}>
                          {objectives.map((obj) => (
                            <label key={obj.id} className={styles.mockObjectiveItem}>
                              <input
                                type="checkbox"
                                checked={obj.checked}
                                onChange={() => toggleObjectiveCheck(obj.id)}
                              />
                              <span className={obj.checked ? styles.mockCheckedText : ''}>{obj.text}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Live Hints Accordion */}
                    {hints.length > 0 && (
                      <div className={styles.mockHintsBox}>
                        <div className={styles.mockHintsHeader}>
                          <Icon name="lightbulb" />
                          <span>Hints ({hints.length})</span>
                        </div>
                        <div className={styles.mockHintsList}>
                          {hints.map((hint, idx) => (
                            <details key={hint.id} className={styles.mockHintDetails}>
                              <summary className={styles.mockHintSummary}>
                                Hint #{idx + 1}: Click to reveal advice
                              </summary>
                              <div className={styles.mockHintBody}>
                                {hint.text}
                              </div>
                            </details>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Terminal Simulator View */
                  <div className={styles.mockTerminalWrapper}>
                    <div className={styles.terminalChrome}>
                      <div className={styles.terminalDots}>
                        <span className={styles.dotRed} />
                        <span className={styles.dotYellow} />
                        <span className={styles.dotGreen} />
                      </div>
                      <div className={styles.terminalTitle}>bashlab@sandbox: ~</div>
                    </div>
                    <div className={styles.terminalBody}>
                      <div className={styles.termLine}>
                        <span className={styles.termPrompt}>student@bashlab:~$</span>
                        <span className={styles.termCmd}>pwd</span>
                      </div>
                      <div className={styles.termOutput}>/home/student/workspace</div>
                      <div className={styles.termLine}>
                        <span className={styles.termPrompt}>student@bashlab:~$</span>
                        <span className={styles.termCmd}>ls -la</span>
                      </div>
                      <div className={styles.termOutput}>
                        total 24<br />
                        drwxr-xr-x 4 student student 4096 Oct 02 12:00 .<br />
                        drwxr-xr-x 3 root    root    4096 Oct 02 11:58 ..<br />
                        -rw-r--r-- 1 student student  220 Oct 02 12:00 .bash_logout<br />
                        -rw-r--r-- 1 student student 3771 Oct 02 12:00 .bashrc<br />
                        -rw-r--r-- 1 student student  807 Oct 02 12:00 .profile
                      </div>
                      <div className={styles.termLine}>
                        <span className={styles.termPrompt}>student@bashlab:~$</span>
                        <span className={styles.termCursor}>█</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </aside>
        )}

        {/* Drag Overlay during column resizing to prevent event capturing */}
        {(isDraggingResizer || isDraggingPreviewResizer) && (
          <div className={styles.dragOverlay} />
        )}
      </div>

      {/* ==============================================================
          MODAL: ADD LESSON
          ============================================================== */}
      {showAddLessonModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddLessonModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Create New Lesson</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowAddLessonModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleConfirmAddLesson}>
              <div className={styles.modalBody}>
                <label className={styles.modalField}>
                  <span>Lesson Title</span>
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. Standard Input and Output Redirection"
                    value={newLessonTitleInput}
                    onChange={(e) => setNewLessonTitleInput(e.target.value)}
                    className={styles.modalInput}
                  />
                </label>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.modalCancelBtn}
                  onClick={() => setShowAddLessonModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.modalSubmitBtn}
                  disabled={!newLessonTitleInput.trim()}
                >
                  Create Lesson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: ADD CHAPTER
          ============================================================== */}
      {showAddChapterModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddChapterModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Add Course Chapter</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowAddChapterModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleConfirmAddChapter}>
              <div className={styles.modalBody}>
                <label className={styles.modalField}>
                  <span>Chapter Title</span>
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. 03. Pipelines & Text Processing"
                    value={newChapterTitleInput}
                    onChange={(e) => setNewChapterTitleInput(e.target.value)}
                    className={styles.modalInput}
                  />
                </label>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.modalCancelBtn}
                  onClick={() => setShowAddChapterModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.modalSubmitBtn}
                  disabled={!newChapterTitleInput.trim()}
                >
                  Add Chapter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: CONFIRM DELETE (FOLDER / LESSON)
          ============================================================== */}
      {deleteConfirmTarget && (
        <div className={styles.modalOverlay} onClick={() => setDeleteConfirmTarget(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.deleteModalHeaderLeft}>
                <span className={styles.dangerIconBadge}><Icon name="trash" /></span>
                <h3>Delete {deleteConfirmTarget.type === 'chapter' ? 'Chapter' : 'Lesson'}</h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setDeleteConfirmTarget(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.deleteConfirmMessage}>
                {deleteConfirmTarget.type === 'chapter' ? (
                  <>
                    Are you sure you want to delete chapter <strong>&quot;{deleteConfirmTarget.title}&quot;</strong>?
                    {deleteConfirmTarget.lessonCount > 0 ? (
                      <span className={styles.deleteWarningText}>
                        <br />⚠️ This folder contains {deleteConfirmTarget.lessonCount} lesson{deleteConfirmTarget.lessonCount > 1 ? 's' : ''}. All lessons inside will be deleted.
                      </span>
                    ) : (
                      <span className={styles.deleteWarningText}>
                        <br />This action cannot be undone.
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    Are you sure you want to delete lesson <strong>&quot;{deleteConfirmTarget.title}&quot;</strong>?
                    <span className={styles.deleteWarningText}>
                      <br />This action cannot be undone.
                    </span>
                  </>
                )}
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setDeleteConfirmTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalDangerBtn}
                onClick={handleExecuteDelete}
                autoFocus
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
