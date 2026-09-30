'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Markdown from '@/components/shared/Markdown';
import styles from './Admin.module.css';
import editor from './LessonEditor.module.css';
import { isValidSlug } from './slug';

function Icon({ name }) { return <span className="material-symbols-outlined" aria-hidden="true">{name}</span>; }

// Keys must exist in backend/src/services/taskVerifier.js — rules are server-owned.
const CHECK_TEMPLATES = [
  { value: '', label: 'No automatic check (learner marks it complete)' },
  { value: 'hello-bashlab', label: 'File: README.md contains "Hello BashLab"' },
  { value: 'files-03', label: 'Directory + file: demo/README.md contains "Hello BashLab"' },
];

const TOOLBAR = [
  { icon: 'title', label: 'Heading', before: '## ', after: '' },
  { icon: 'format_bold', label: 'Bold', before: '**', after: '**' },
  { icon: 'code', label: 'Inline code', before: '`', after: '`' },
  { icon: 'data_object', label: 'Code block', before: '```bash\n', after: '\n```' },
  { icon: 'format_list_bulleted', label: 'List', before: '- ', after: '' },
];

function toForm(lesson) {
  return {
    title: lesson.title,
    slug: lesson.slug,
    chapter_id: lesson.chapter_id,
    sort_order: String(lesson.sort_order),
    status: lesson.status,
    content_md: lesson.content_md || '',
    objectives: lesson.objectives || [],
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
        .select('id, title, slug, chapter_id, sort_order, status, content_md, objectives, test_template, category, tag, difficulty, commands, lab, chapters(course_id, courses(id, title, slug))')
        .eq('id', lessonId)
        .maybeSingle();
      if (lessonError || !lesson) {
        setError(lessonError?.message || 'Lesson not found.');
        return;
      }
      const courseId = lesson.chapters.course_id;
      const { data: chapters } = await supabase
        .from('chapters').select('id, title, sort_order, lessons(id, slug)').eq('course_id', courseId).order('sort_order');
      setData({ lesson, course: lesson.chapters.courses, chapters });
    })();
  }, [lessonId]);

  if (error) return <p className={styles.errorText}>{error} <a href="/admin/content">Back to Content</a></p>;
  if (!data) return null;
  return <EditorForm {...data} />;
}

function EditorForm({ lesson, course, chapters }) {
  const [saved, setSaved] = useState(toForm(lesson));
  const [form, setForm] = useState(saved);
  const [tab, setTab] = useState('write');
  const [status, setStatus] = useState({ type: 'idle' });
  const textareaRef = useRef(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  function applyFormat({ before, after }) {
    const area = textareaRef.current;
    const { selectionStart: start, selectionEnd: end, value } = area;
    const selected = value.slice(start, end) || 'text';
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    setForm((prev) => ({ ...prev, content_md: next }));
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  const setObjective = (index, value) => setForm((prev) => ({
    ...prev, objectives: prev.objectives.map((item, i) => (i === index ? value : item)),
  }));

  async function save() {
    if (!form.title.trim()) return setStatus({ type: 'error', message: 'Title is required.' });
    if (!isValidSlug(form.slug)) return setStatus({ type: 'error', message: 'Slug may only contain lowercase letters, numbers and single hyphens.' });
    const slugTaken = chapters.some((chapter) => chapter.lessons.some((item) => item.id !== lesson.id && item.slug === form.slug));
    if (slugTaken) return setStatus({ type: 'error', message: 'Another lesson in this course already uses this slug.' });
    let lab = null;
    if (form.labJson.trim()) {
      try { lab = JSON.parse(form.labJson); }
      catch { return setStatus({ type: 'error', message: 'Lab content JSON is invalid — check the syntax.' }); }
    }

    setStatus({ type: 'saving' });
    const objectives = form.objectives.map((item) => item.trim()).filter(Boolean);
    const testTemplate = form.verifier ? { verifier: form.verifier, ...(form.hint.trim() ? { hint: form.hint.trim() } : {}) } : null;
    const commands = form.commands.split(',').map((item) => item.trim()).filter(Boolean);
    const { error } = await supabase.from('lessons').update({
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
    }).eq('id', lesson.id);
    if (error) return setStatus({ type: 'error', message: error.message });
    const next = {
      ...form, objectives, title: form.title.trim(), sort_order: String(Number(form.sort_order) || 0),
      commands: commands.join(', '), labJson: lab ? JSON.stringify(lab, null, 2) : '',
    };
    setSaved(next);
    setForm(next);
    setStatus({ type: 'saved' });
    return undefined;
  }

  const saveLabel = status.type === 'saving' ? 'Saving…'
    : status.type === 'error' ? status.message
      : dirty ? 'Unsaved changes' : 'All changes saved';

  return (
    <div>
      <p className={editor.crumbs}>
        <a href="/admin/content" onClick={(event) => { if (dirty && !window.confirm('Discard unsaved changes?')) event.preventDefault(); }}>
          <Icon name="arrow_back" /> Content
        </a>
        <span>/</span>{course.title}
      </p>
      <header className={styles.header}>
        <div><h1>{form.title || 'Untitled lesson'}<span>.</span></h1></div>
        <div className={editor.saveBar}>
          <span className={status.type === 'error' ? styles.errorText : dirty ? styles.muted : styles.successText} role="status">{saveLabel}</span>
          <button type="button" className={styles.button} disabled={!dirty} onClick={() => { setForm(saved); setStatus({ type: 'idle' }); }}>Cancel</button>
          <button type="button" className={styles.primaryButton} disabled={!dirty || status.type === 'saving'} onClick={save}>Save</button>
        </div>
      </header>

      <div className={editor.layout}>
        <section className={`${styles.panel} ${styles.panelPad} ${editor.body}`} aria-label="Lesson content">
          <div className={styles.tabs} role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'write'} onClick={() => setTab('write')}>Write</button>
            <button type="button" role="tab" aria-selected={tab === 'preview'} onClick={() => setTab('preview')}>Preview</button>
          </div>
          {tab === 'write' ? (
            <>
              <div className={editor.toolbar} role="toolbar" aria-label="Formatting">
                {TOOLBAR.map((item) => (
                  <button type="button" key={item.icon} className={styles.ghostButton} aria-label={item.label} title={item.label} onClick={() => applyFormat(item)}>
                    <Icon name={item.icon} />
                  </button>
                ))}
              </div>
              <label className={styles.field}>
                <span className={styles.srOnly}>Markdown</span>
                <textarea ref={textareaRef} rows={22} value={form.content_md} onChange={set('content_md')} spellCheck={false} data-lenis-prevent />
              </label>
            </>
          ) : (
            <div className={editor.preview}><Markdown>{form.content_md}</Markdown></div>
          )}
        </section>

        <aside className={editor.side}>
          <section className={`${styles.panel} ${styles.panelPad} ${editor.stack}`} aria-label="Lesson details">
            <label className={styles.field}>Title<input value={form.title} onChange={set('title')} /></label>
            <label className={styles.field}>Slug<input value={form.slug} onChange={set('slug')} /></label>
            <label className={styles.field}>Chapter
              <select value={form.chapter_id} onChange={set('chapter_id')}>
                {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
              </select>
            </label>
            <div className={styles.fieldRow}>
              <label className={styles.field}>Order<input type="number" value={form.sort_order} onChange={set('sort_order')} /></label>
              <label className={styles.field}>Status
                <select value={form.status} onChange={set('status')}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>
            </div>
          </section>

          <section className={`${styles.panel} ${styles.panelPad} ${editor.stack}`} aria-labelledby="objectives-title">
            <h2 id="objectives-title" className={editor.sideTitle}>Objectives</h2>
            {form.objectives.map((item, index) => (
              <div className={editor.objective} key={index}>
                <input aria-label={`Objective ${index + 1}`} value={item} onChange={(event) => setObjective(index, event.target.value)} />
                <button type="button" className={styles.ghostButton} aria-label="Remove objective"
                  onClick={() => setForm((prev) => ({ ...prev, objectives: prev.objectives.filter((_, i) => i !== index) }))}><Icon name="delete" /></button>
              </div>
            ))}
            <button type="button" className={styles.button} onClick={() => setForm((prev) => ({ ...prev, objectives: [...prev.objectives, ''] }))}>
              <Icon name="add" /> Add objective
            </button>
          </section>

          <section className={`${styles.panel} ${styles.panelPad} ${editor.stack}`} aria-labelledby="check-title">
            <h2 id="check-title" className={editor.sideTitle}>Solution check</h2>
            <label className={styles.field}>Template
              <select value={form.verifier} onChange={set('verifier')}>
                {CHECK_TEMPLATES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            {form.verifier && <label className={styles.field}>Hint (optional)<textarea rows={2} value={form.hint} onChange={set('hint')} /></label>}
          </section>

          <section className={`${styles.panel} ${styles.panelPad} ${editor.stack}`} aria-labelledby="lab-title">
            <h2 id="lab-title" className={editor.sideTitle}>Lab listing (Course page)</h2>
            <p className={styles.muted}>Only shown if Category is set — that&apos;s what makes a lesson appear in the course&apos;s lab table.</p>
            <div className={styles.fieldRow}>
              <label className={styles.field}>Category<input value={form.category} onChange={set('category')} placeholder="e.g. Core Commands" /></label>
              <label className={styles.field}>Tag<input value={form.tag} onChange={set('tag')} placeholder="e.g. File Ops" /></label>
              <label className={styles.field}>Difficulty
                <select value={form.difficulty} onChange={set('difficulty')}>
                  <option value="">—</option><option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option>
                </select>
              </label>
            </div>
            <label className={styles.field}>Commands (comma-separated)<input value={form.commands} onChange={set('commands')} placeholder="pwd, cd, ls" /></label>
            <label className={styles.field}>
              Lab content (JSON: scenario, steps, commandSyntax, examples, hint, solutionExplanation)
              <textarea rows={10} value={form.labJson} onChange={set('labJson')} spellCheck={false} style={{ fontFamily: 'var(--font-code)', fontSize: 12 }} />
            </label>
          </section>
        </aside>
      </div>
    </div>
  );
}
