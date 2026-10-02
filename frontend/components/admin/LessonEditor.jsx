'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Markdown from '@/components/shared/Markdown';
import styles from './Admin.module.css';
import editor from './LessonEditor.module.css';
import { isValidSlug } from './slug';

function Icon({ name, style }) {
  return (
    <span className="material-symbols-outlined" style={style} aria-hidden="true">
      {name}
    </span>
  );
}

// Keys must exist in backend/src/services/taskVerifier.js
const CHECK_TEMPLATES = [
  { value: '', label: 'No automatic check (learner marks it complete)' },
  { value: 'hello-bashlab', label: 'File: README.md contains "Hello BashLab"' },
  { value: 'files-03', label: 'Directory + file: demo/README.md contains "Hello BashLab"' },
];

const TOOLBAR = [
  { icon: 'format_h1', label: 'Heading 1', before: '# ', after: '' },
  { icon: 'format_h2', label: 'Heading 2', before: '## ', after: '' },
  { icon: 'format_bold', label: 'Bold', before: '**', after: '**' },
  { icon: 'format_italic', label: 'Italic', before: '*', after: '*' },
  { icon: 'code', label: 'Inline code', before: '`', after: '`' },
  { icon: 'data_object', label: 'Code block', before: '```bash\n', after: '\n```' },
  { icon: 'format_list_bulleted', label: 'Bullet list', before: '- ', after: '' },
  { icon: 'format_quote', label: 'Quote', before: '> ', after: '' },
];

function toForm(lesson) {
  return {
    title: lesson.title || '',
    slug: lesson.slug || '',
    chapter_id: lesson.chapter_id || '',
    sort_order: String(lesson.sort_order ?? 0),
    status: lesson.status || 'draft',
    content_md: lesson.content_md || '',
    objectives: Array.isArray(lesson.objectives) ? lesson.objectives : [],
    verifier: lesson.test_template?.verifier || '',
    hint: lesson.test_template?.hint || '',
    category: lesson.category || '',
    tag: lesson.tag || '',
    difficulty: lesson.difficulty || '',
    commands: (lesson.commands || []).join(', '),
    labJson: lesson.lab ? JSON.stringify(lesson.lab, null, 2) : '',
  };
}

export default function LessonEditor({ lessonId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .select(
          'id, title, slug, chapter_id, sort_order, status, content_md, objectives, test_template, category, tag, difficulty, commands, lab, chapters(course_id, courses(id, title, slug))'
        )
        .eq('id', lessonId)
        .maybeSingle();

      if (lessonError || !lesson) {
        setError(lessonError?.message || 'Lesson not found.');
        return;
      }

      const courseId = lesson.chapters?.course_id;
      const { data: chapters } = await supabase
        .from('chapters')
        .select('id, title, sort_order, lessons(id, title, slug, status, sort_order)')
        .eq('course_id', courseId)
        .order('sort_order');

      // Sort lessons inside chapters
      const sortedChapters = (chapters || []).map((ch) => ({
        ...ch,
        lessons: (ch.lessons || []).sort((a, b) => a.sort_order - b.sort_order),
      }));

      setData({ lesson, course: lesson.chapters?.courses, chapters: sortedChapters });
    })();
  }, [lessonId]);

  if (error) {
    return (
      <p className={styles.errorText}>
        {error} <a href="/admin/content">Back to Content</a>
      </p>
    );
  }
  if (!data) return null;

  return <EditorForm {...data} />;
}

function EditorForm({ lesson, course, chapters }) {
  const router = useRouter();
  const [saved, setSaved] = useState(toForm(lesson));
  const [form, setForm] = useState(saved);
  const [activeTab, setActiveTab] = useState('write'); // 'write' | 'settings'
  const [status, setStatus] = useState({ type: 'idle' });
  const [collapsedChapters, setCollapsedChapters] = useState(() => new Set());
  const textareaRef = useRef(null);

  // Terminal simulator state
  const [terminalHistory, setTerminalHistory] = useState([
    { type: 'output', text: 'BashLab Cloud Terminal v2.4 (Simulated Sandbox)' },
    { type: 'output', text: 'Type "help", "pwd", "ls", "whoami", or "clear".' },
  ]);
  const [terminalInput, setTerminalInput] = useState('');

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  function applyFormat({ before, after }) {
    const area = textareaRef.current;
    if (!area) return;
    const { selectionStart: start, selectionEnd: end, value } = area;
    const selected = value.slice(start, end) || 'text';
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    setForm((prev) => ({ ...prev, content_md: next }));
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  const setObjective = (index, value) =>
    setForm((prev) => ({
      ...prev,
      objectives: prev.objectives.map((item, i) => (i === index ? value : item)),
    }));

  const removeObjective = (index) =>
    setForm((prev) => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index),
    }));

  const addObjective = () =>
    setForm((prev) => ({
      ...prev,
      objectives: [...prev.objectives, ''],
    }));

  function toggleChapterCollapse(chapterId) {
    setCollapsedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  }

  function handleLessonClick(event, targetLessonId) {
    if (targetLessonId === lesson.id) return;
    if (dirty && !window.confirm('You have unsaved changes. Discard them?')) {
      event.preventDefault();
      return;
    }
    router.push(`/admin/lessons/${targetLessonId}`);
  }

  async function save() {
    if (!form.title.trim()) return setStatus({ type: 'error', message: 'Title is required.' });
    if (!isValidSlug(form.slug))
      return setStatus({
        type: 'error',
        message: 'Slug may only contain lowercase letters, numbers, and single hyphens.',
      });

    const slugTaken = chapters.some((chapter) =>
      chapter.lessons.some((item) => item.id !== lesson.id && item.slug === form.slug)
    );
    if (slugTaken) return setStatus({ type: 'error', message: 'Another lesson in this course already uses this slug.' });

    let lab = null;
    if (form.labJson.trim()) {
      try {
        lab = JSON.parse(form.labJson);
      } catch {
        return setStatus({ type: 'error', message: 'Lab content JSON is invalid — check the syntax.' });
      }
    }

    setStatus({ type: 'saving' });
    const objectives = form.objectives.map((item) => item.trim()).filter(Boolean);
    const testTemplate = form.verifier
      ? { verifier: form.verifier, ...(form.hint.trim() ? { hint: form.hint.trim() } : {}) }
      : null;
    const commands = form.commands
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from('lessons')
      .update({
        title: form.title.trim(),
        slug: form.slug,
        chapter_id: form.chapter_id,
        sort_order: Number(form.sort_order) || 0,
        status: form.status,
        content_md: form.content_md,
        objectives,
        test_template: testTemplate,
        category: form.category || null,
        tag: form.tag || null,
        difficulty: form.difficulty || null,
        commands,
        lab,
      })
      .eq('id', lesson.id);

    if (error) return setStatus({ type: 'error', message: error.message });

    const next = {
      ...form,
      objectives,
      title: form.title.trim(),
      sort_order: String(Number(form.sort_order) || 0),
      commands: commands.join(', '),
      labJson: lab ? JSON.stringify(lab, null, 2) : '',
    };
    setSaved(next);
    setForm(next);
    setStatus({ type: 'saved' });
  }

  // Handle terminal simulation commands
  function handleTerminalSubmit(e) {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd) return;

    const newHistory = [...terminalHistory, { type: 'command', text: cmd }];
    if (cmd === 'clear') {
      setTerminalHistory([]);
      setTerminalInput('');
      return;
    }
    if (cmd === 'pwd') {
      newHistory.push({ type: 'output', text: '/home/student' });
    } else if (cmd === 'whoami') {
      newHistory.push({ type: 'output', text: 'student' });
    } else if (cmd === 'ls' || cmd === 'ls -la') {
      newHistory.push({ type: 'output', text: 'demo/  lab_script.sh  README.md' });
    } else if (cmd.startsWith('cat ')) {
      newHistory.push({ type: 'output', text: 'Hello BashLab! Welcome to your interactive shell.' });
    } else if (cmd === 'date') {
      newHistory.push({ type: 'output', text: new Date().toUTCString() });
    } else if (cmd === 'help') {
      newHistory.push({
        type: 'output',
        text: 'Available test commands: pwd, ls, whoami, date, cat README.md, clear',
      });
    } else {
      newHistory.push({ type: 'output', text: `${cmd}: command not found (simulation sandbox)` });
    }

    setTerminalHistory(newHistory);
    setTerminalInput('');
  }

  const currentChapter = chapters.find((c) => c.id === form.chapter_id);

  const saveLabel =
    status.type === 'saving'
      ? 'Saving…'
      : status.type === 'error'
      ? status.message
      : dirty
      ? 'Unsaved changes'
      : 'All changes saved';

  return (
    <div className={editor.container}>
      {/* Top Breadcrumb & Save Bar */}
      <div className={editor.topbar}>
        <div className={editor.breadcrumbs}>
          <a
            href="/admin/content"
            onClick={(e) => {
              if (dirty && !window.confirm('Discard unsaved changes?')) e.preventDefault();
            }}
          >
            <Icon name="library_books" style={{ fontSize: 16 }} />
            Courses
          </a>
          <span className={editor.separator}>/</span>
          <span style={{ color: '#cbd5e1' }}>{course?.title || 'Course'}</span>
          <span className={editor.separator}>/</span>
          <span>{currentChapter?.title || 'Chapter'}</span>
          <span className={editor.separator}>/</span>
          <span className={editor.current}>{form.title || 'Untitled'}</span>
        </div>

        <div className={editor.topActions}>
          <span
            className={`${editor.statusLabel} ${
              status.type === 'error' ? styles.errorText : dirty ? styles.muted : styles.successText
            }`}
            role="status"
          >
            {saveLabel}
          </span>
          <button
            type="button"
            className={editor.btnCancel}
            disabled={!dirty}
            onClick={() => {
              setForm(saved);
              setStatus({ type: 'idle' });
            }}
          >
            Discard
          </button>
          <button
            type="button"
            className={editor.btnSave}
            disabled={!dirty || status.type === 'saving'}
            onClick={save}
          >
            <Icon name="save" style={{ fontSize: 16 }} />
            Save
          </button>
        </div>
      </div>

      {/* 3-Column CMS Workspace Layout */}
      <div className={editor.workspace}>
        {/* Column 1: Course Tree */}
        <aside className={editor.colTree} aria-label="Course content navigation">
          <div className={editor.treeHeader}>
            <span>Course Content</span>
            <button
              type="button"
              className={styles.ghostButton}
              style={{ padding: '2px 6px', fontSize: 11 }}
              onClick={() => router.push(`/admin/content?course=${course?.slug}`)}
              title="Manage course structure"
            >
              <Icon name="settings" style={{ fontSize: 16 }} />
            </button>
          </div>

          <div className={editor.treeScroll}>
            {chapters.map((chapter) => {
              const isCollapsed = collapsedChapters.has(chapter.id);
              return (
                <div key={chapter.id} className={editor.chapterGroup}>
                  <div
                    className={editor.chapterNode}
                    onClick={() => toggleChapterCollapse(chapter.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <Icon
                      name={isCollapsed ? 'chevron_right' : 'expand_more'}
                      style={{ fontSize: 16, color: '#9ba3b5' }}
                    />
                    <Icon name="folder" style={{ fontSize: 16, color: '#f59e0b' }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {chapter.title}
                    </span>
                  </div>

                  {!isCollapsed && (
                    <div className={editor.lessonList}>
                      {chapter.lessons.map((item) => {
                        const isCurrent = item.id === lesson.id;
                        return (
                          <div
                            key={item.id}
                            className={`${editor.lessonNode} ${isCurrent ? editor.lessonNodeActive : ''}`}
                            onClick={(e) => handleLessonClick(e, item.id)}
                            role="button"
                            tabIndex={0}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                              <Icon
                                name="description"
                                style={{
                                  fontSize: 14,
                                  color: isCurrent ? '#93c5fd' : '#637180',
                                }}
                              />
                              <span
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {item.title || item.slug}
                              </span>
                            </div>
                            <span
                              className={item.status === 'published' ? editor.badgePublished : editor.badgeDraft}
                            >
                              {item.status === 'published' ? 'Live' : 'Draft'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className={editor.treeBottomBtn}>
            <button
              type="button"
              className={editor.btnAddLesson}
              onClick={() => router.push(`/admin/content?course=${course?.slug}`)}
            >
              <Icon name="add" style={{ fontSize: 16 }} />
              Add Lesson in Curriculum
            </button>
          </div>
        </aside>

        {/* Column 2: Lesson Editor */}
        <section className={editor.colEditor} aria-label="Lesson Editor">
          <div className={editor.editorInner}>
            {/* Title Input */}
            <input
              type="text"
              className={editor.titleInput}
              value={form.title}
              onChange={set('title')}
              placeholder="Lesson Title (e.g. 1.1 Introduction to File Navigation)"
              aria-label="Lesson title"
            />

            {/* Editor Tabs: Content (Markdown) vs Settings */}
            <div className={editor.editorTabs} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'write'}
                className={`${editor.editorTabItem} ${activeTab === 'write' ? editor.editorTabItemActive : ''}`}
                onClick={() => setActiveTab('write')}
              >
                Content (Markdown)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'settings'}
                className={`${editor.editorTabItem} ${activeTab === 'settings' ? editor.editorTabItemActive : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                Settings &amp; Solution Check
              </button>
            </div>

            {activeTab === 'write' ? (
              <>
                {/* Markdown Formatting Toolbar */}
                <div className={editor.toolbar} role="toolbar" aria-label="Markdown formatting">
                  {TOOLBAR.map((item) => (
                    <button
                      type="button"
                      key={item.icon}
                      className={editor.toolBtn}
                      aria-label={item.label}
                      title={item.label}
                      onClick={() => applyFormat(item)}
                    >
                      <Icon name={item.icon} style={{ fontSize: 18 }} />
                    </button>
                  ))}
                </div>

                {/* Markdown Textarea */}
                <div className={editor.codeEditorArea}>
                  <textarea
                    ref={textareaRef}
                    className={editor.codeTextarea}
                    rows={16}
                    value={form.content_md}
                    onChange={set('content_md')}
                    placeholder="# Write your lesson markdown here..."
                    spellCheck={false}
                    data-lenis-prevent
                  />
                </div>

                {/* Objectives Section */}
                <div className={editor.objectivesBox}>
                  <div className={editor.objectivesTitle}>Learning Objectives</div>
                  {form.objectives.map((item, index) => (
                    <div className={editor.objItem} key={index}>
                      <input
                        type="checkbox"
                        className={editor.objCheckbox}
                        title="Objective item preview"
                        readOnly
                        checked={index < 2}
                      />
                      <input
                        className={editor.objInput}
                        value={item}
                        onChange={(e) => setObjective(index, e.target.value)}
                        placeholder={`Objective ${index + 1}`}
                        aria-label={`Objective ${index + 1}`}
                      />
                      <button
                        type="button"
                        className={editor.objDeleteBtn}
                        onClick={() => removeObjective(index)}
                        title="Delete objective"
                        aria-label="Remove objective"
                      >
                        <Icon name="delete" style={{ fontSize: 16 }} />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    className={editor.btnAddObjective}
                    onClick={addObjective}
                  >
                    <Icon name="add" style={{ fontSize: 16 }} />
                    Add Objective
                  </button>
                </div>
              </>
            ) : (
              /* Settings & Solution Check Tab */
              <div className={editor.settingsStack}>
                <label className={styles.field}>
                  Slug
                  <input value={form.slug} onChange={set('slug')} />
                </label>

                <label className={styles.field}>
                  Chapter
                  <select value={form.chapter_id} onChange={set('chapter_id')}>
                    {chapters.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.title}
                      </option>
                    ))}
                  </select>
                </label>

                <div className={styles.fieldRow}>
                  <label className={styles.field}>
                    Sort Order
                    <input type="number" value={form.sort_order} onChange={set('sort_order')} />
                  </label>

                  <label className={styles.field}>
                    Status
                    <select value={form.status} onChange={set('status')}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </label>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14 }}>
                  <h3 style={{ fontSize: 13, color: '#e8e9f0', marginBottom: 10 }}>Solution Check (Verifier)</h3>
                  <label className={styles.field}>
                    Template
                    <select value={form.verifier} onChange={set('verifier')}>
                      {CHECK_TEMPLATES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {form.verifier && (
                    <label className={styles.field} style={{ marginTop: 8 }}>
                      Hint (optional)
                      <textarea rows={2} value={form.hint} onChange={set('hint')} />
                    </label>
                  )}
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14 }}>
                  <h3 style={{ fontSize: 13, color: '#e8e9f0', marginBottom: 6 }}>Lab Listing Catalog Fields</h3>
                  <p className={styles.muted} style={{ fontSize: 12, marginBottom: 10 }}>
                    Only shown on the public course page when Category is specified.
                  </p>
                  <div className={styles.fieldRow}>
                    <label className={styles.field}>
                      Category
                      <input value={form.category} onChange={set('category')} placeholder="e.g. Core Commands" />
                    </label>
                    <label className={styles.field}>
                      Tag
                      <input value={form.tag} onChange={set('tag')} placeholder="e.g. File Ops" />
                    </label>
                    <label className={styles.field}>
                      Difficulty
                      <select value={form.difficulty} onChange={set('difficulty')}>
                        <option value="">—</option>
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </label>
                  </div>
                  <label className={styles.field} style={{ marginTop: 8 }}>
                    Commands (comma-separated)
                    <input value={form.commands} onChange={set('commands')} placeholder="pwd, cd, ls" />
                  </label>
                  <label className={styles.field} style={{ marginTop: 8 }}>
                    Lab content (JSON configuration)
                    <textarea
                      rows={6}
                      value={form.labJson}
                      onChange={set('labJson')}
                      spellCheck={false}
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Column 3: Student Preview & Terminal Simulator */}
        <aside className={editor.colPreview} aria-label="Student Preview">
          <div className={editor.previewHeader}>
            <span className={editor.previewHeaderTitle}>Student Preview</span>
            <div className={editor.previewToggleBtns}>
              <button
                type="button"
                className={`${editor.previewToggleBtn} ${editor.previewToggleBtnActive}`}
              >
                Live Preview
              </button>
            </div>
          </div>

          <div className={editor.previewViewport}>
            {/* Live Markdown Render */}
            <div style={{ minHeight: 180 }}>
              <Markdown>{form.content_md || '*Lesson content is empty.*'}</Markdown>
            </div>

            {/* Interactive Terminal Sandbox Simulator */}
            <div className={editor.terminalMock}>
              <div className={editor.termHead}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="terminal" style={{ fontSize: 15, color: '#68dfa0' }} />
                  Terminal (Bash Sandbox)
                </span>
                <button
                  type="button"
                  className={editor.termResetBtn}
                  onClick={() =>
                    setTerminalHistory([
                      { type: 'output', text: 'BashLab Cloud Terminal v2.4 (Simulated Sandbox)' },
                      { type: 'output', text: 'Type "help", "pwd", "ls", "whoami", or "clear".' },
                    ])
                  }
                  title="Reset terminal view"
                >
                  <Icon name="refresh" style={{ fontSize: 14 }} />
                  Reset
                </button>
              </div>

              <div className={editor.termBody}>
                {terminalHistory.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      color: item.type === 'command' ? '#fff' : '#68dfa0',
                      marginBottom: 3,
                    }}
                  >
                    {item.type === 'command' && <span className={editor.termPrompt}>student@bashlab:~$ </span>}
                    {item.text}
                  </div>
                ))}

                <form onSubmit={handleTerminalSubmit} className={editor.termInputLine}>
                  <span className={editor.termPrompt}>student@bashlab:~$</span>
                  <input
                    type="text"
                    className={editor.termInput}
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    placeholder="type command..."
                    autoComplete="off"
                    spellCheck={false}
                  />
                </form>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
