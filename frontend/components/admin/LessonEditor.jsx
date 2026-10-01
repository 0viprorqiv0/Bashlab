'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { adminApi } from '@/lib/writeApi';
import Markdown from '@/components/shared/Markdown';
import { PageLoading } from '@/components/shared/Loading';
import styles from './Admin.module.css';
import editor from './LessonEditor.module.css';
import LessonPreview from './LessonPreview';
import { isValidSlug } from './slug';
import { emptyLessonContent, newItemId, validateLessonContent } from './lessonContent';

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

const LESSON_FIELDS = 'id, title, slug, chapter_id, sort_order, status, content_md, objectives, test_template, lesson_content, '
  + 'chapters(course_id, title, courses(id, title, slug))';

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
    content: lesson.lesson_content?.version === 1 ? lesson.lesson_content : null,
  };
}

export default function LessonEditor({ lessonId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: lesson, error: lessonError } = await supabase
        .from('lessons').select(LESSON_FIELDS).eq('id', lessonId).maybeSingle();
      if (!active) return;
      if (lessonError || !lesson) {
        setError(lessonError?.message || 'Lesson not found.');
        return;
      }
      const { data: chapters, error: chaptersError } = await supabase
        .from('chapters').select('id, title, sort_order, lessons(id, slug)')
        .eq('course_id', lesson.chapters.course_id).order('sort_order');
      if (!active) return;
      if (chaptersError) setError(chaptersError.message);
      else setData({ lesson, course: lesson.chapters.courses, chapters });
    })();
    return () => { active = false; };
  }, [lessonId]);

  if (error) return <p className={styles.errorText}>{error} <Link href="/admin/content">Back to Content</Link></p>;
  if (!data) return <PageLoading label="Loading lesson…" />;
  return <EditorForm {...data} />;
}

function EditorForm({ lesson, course, chapters }) {
  const [saved, setSaved] = useState(() => toForm(lesson));
  const [form, setForm] = useState(saved);
  const [tab, setTab] = useState('content');
  const [phoneTab, setPhoneTab] = useState('write');
  const [widePreview, setWidePreview] = useState(false);
  const [status, setStatus] = useState({ type: 'idle' });
  const textareaRef = useRef(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const structured = Boolean(form.content);
  const chapterTitle = chapters.find((chapter) => chapter.id === form.chapter_id)?.title || lesson.chapters.title;

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (!widePreview) return undefined;
    const close = (event) => { if (event.key === 'Escape') setWidePreview(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [widePreview]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const setContent = (patch) => setForm((prev) => ({ ...prev, content: { ...prev.content, ...patch } }));

  const previewLesson = useMemo(() => ({ title: form.title, lesson_content: form.content }), [form.title, form.content]);

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

  // Legacy Markdown lesson -> structured lab. The old content_md stays in the
  // row (for rollback) but is no longer edited once a lesson is structured.
  function convertToStructured() {
    const content = emptyLessonContent();
    content.short_objective = form.objectives[0] || '';
    content.track = chapterTitle || '';
    content.steps = form.objectives.filter((item) => item.trim()).map((text) => ({ id: newItemId('s'), text }));
    setForm((prev) => ({ ...prev, content }));
  }

  async function save() {
    if (status.type === 'saving') return;
    if (!form.title.trim()) return setStatus({ type: 'error', message: 'Title is required.' });
    if (!isValidSlug(form.slug)) return setStatus({ type: 'error', message: 'Slug may only contain lowercase letters, numbers and single hyphens.' });
    const slugTaken = chapters.some((chapter) => chapter.lessons.some((item) => item.id !== lesson.id && item.slug === form.slug));
    if (slugTaken) return setStatus({ type: 'error', message: 'Another lesson in this course already uses this slug.' });
    if (structured) {
      const problem = validateLessonContent(form.content, form.status === 'published');
      if (problem) return setStatus({ type: 'error', message: problem });
    }

    setStatus({ type: 'saving' });
    const objectives = form.objectives.map((item) => item.trim()).filter(Boolean);
    const { data: row, error } = await adminApi.updateLesson(lesson.id, {
      title: form.title.trim(),
      slug: form.slug,
      chapter_id: form.chapter_id,
      sort_order: Number(form.sort_order) || 0,
      status: form.status,
      test_template: form.verifier ? { verifier: form.verifier } : null,
      ...(structured
        ? { lesson_content: form.content }
        : { content_md: form.content_md, objectives }),
    });
    if (error) return setStatus({ type: 'error', message: error.message });
    // Re-sync from what the database stored, not from what we sent.
    const next = toForm(row);
    setSaved(next);
    setForm(next);
    setStatus({ type: 'saved' });
    return undefined;
  }

  const saveLabel = status.type === 'saving' ? 'Saving…'
    : status.type === 'error' ? status.message
      : dirty ? 'Unsaved changes' : 'All changes saved';
  const backHref = `/admin/content?course=${encodeURIComponent(course.slug)}`;
  const confirmLeave = (event) => { if (dirty && !window.confirm('Discard unsaved changes?')) event.preventDefault(); };

  return (
    <div className={editor.editorPage}>
      <p className={editor.crumbs}>
        <Link href={backHref} onClick={confirmLeave}><Icon name="arrow_back" /> Content</Link>
        <span>/</span><span>{course.title}</span>
        <span>/</span><span>{chapterTitle}</span>
      </p>
      <header className={`${styles.header} ${editor.editorHeader}`}>
        <div><h1>{form.title || 'Untitled lesson'}<span>.</span></h1></div>
        <div className={editor.saveBar}>
          <span className={status.type === 'error' ? styles.errorText : dirty ? styles.muted : styles.successText} role="status">{saveLabel}</span>
          {structured && <button type="button" className={styles.button} onClick={() => setWidePreview(true)}><Icon name="fullscreen" /> Preview</button>}
          <button type="button" className={styles.button} disabled={!dirty || status.type === 'saving'} onClick={() => { setForm(saved); setStatus({ type: 'idle' }); }}>Cancel</button>
          <button type="button" className={styles.primaryButton} disabled={!dirty || status.type === 'saving'} onClick={save}>Save</button>
        </div>
      </header>

      <div className={editor.tabs} role="tablist" aria-label="Lesson sections">
        <button type="button" role="tab" aria-selected={tab === 'content'} onClick={() => setTab('content')}>Content</button>
        <button type="button" role="tab" aria-selected={tab === 'settings'} onClick={() => setTab('settings')}>Settings</button>
      </div>

      {tab === 'content' ? (
        <div className={editor.contentView}>
          <div className={editor.modeBar} role="tablist" aria-label="Lesson format">
            <button type="button" role="tab" aria-selected={structured} disabled={!structured}>Structured lab</button>
            <button type="button" role="tab" aria-selected={!structured} disabled={structured}>Markdown (legacy)</button>
            {!structured && <button type="button" onClick={convertToStructured}>Convert to structured lab</button>}
            <span>{structured ? 'This is exactly what learners see in the lab workspace.' : 'Legacy lesson — shown to learners as Markdown until converted.'}</span>
          </div>

          <div className={editor.phoneTabs}>
            <button type="button" aria-pressed={phoneTab === 'write'} onClick={() => setPhoneTab('write')}>Write</button>
            <button type="button" aria-pressed={phoneTab === 'preview'} onClick={() => setPhoneTab('preview')}>Preview</button>
          </div>

          <div className={editor.layout} data-phone-tab={phoneTab}>
            <section className={editor.body} aria-label="Lesson content">
              {structured
                ? <StructuredForm form={form} set={set} content={form.content} setContent={setContent} />
                : <LegacyForm form={form} set={set} setForm={setForm} textareaRef={textareaRef} applyFormat={applyFormat} />}
            </section>
            <aside className={editor.previewPane} aria-label="Preview">
              {structured ? <LessonPreview lesson={previewLesson} /> : (
                <div className={editor.legacyPreview}>
                  <h2>{form.title}</h2>
                  <Markdown>{form.content_md}</Markdown>
                </div>
              )}
            </aside>
          </div>
        </div>
      ) : (
        <div className={editor.settingsView}>
          <section className={editor.settingsCard} aria-label="Lesson settings">
            <div className={editor.settingsGrid}>
              <label className={styles.field}>Slug<input value={form.slug} onChange={set('slug')} /></label>
              <label className={styles.field}>Chapter
                <select value={form.chapter_id} onChange={set('chapter_id')}>
                  {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
                </select>
              </label>
              <label className={styles.field}>Order<input type="number" value={form.sort_order} onChange={set('sort_order')} /></label>
              <label className={styles.field}>Status
                <select value={form.status} onChange={set('status')}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>
              <label className={styles.field}>Solution check
                <select value={form.verifier} onChange={set('verifier')}>
                  {CHECK_TEMPLATES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
            </div>
          </section>
        </div>
      )}

      {widePreview && structured && (
        <div className={editor.widePreview} role="dialog" aria-modal="true" aria-label="Full-screen preview">
          <p className={editor.saveBar} style={{ marginBottom: 12 }}>
            <button type="button" className={styles.button} onClick={() => setWidePreview(false)}><Icon name="close_fullscreen" /> Close preview (Esc)</button>
          </p>
          <LessonPreview lesson={previewLesson} />
        </div>
      )}
    </div>
  );
}

function LegacyForm({ form, set, setForm, textareaRef, applyFormat }) {
  const setObjective = (index, value) => setForm((prev) => ({
    ...prev, objectives: prev.objectives.map((item, i) => (i === index ? value : item)),
  }));
  return (
    <>
      <p className={editor.legacyNotice}>This lesson predates the structured lab format. Converting keeps a copy of this Markdown but switches editing to the lab form.</p>
      <label className={styles.field}>Title<input value={form.title} onChange={set('title')} /></label>
      <div className={editor.toolbar} role="toolbar" aria-label="Formatting">
        {TOOLBAR.map((item) => (
          <button type="button" key={item.icon} className={styles.ghostButton} aria-label={item.label} title={item.label} onClick={() => applyFormat(item)}>
            <Icon name={item.icon} />
          </button>
        ))}
      </div>
      <label className={styles.field}>
        <span className={styles.srOnly}>Markdown</span>
        <textarea ref={textareaRef} rows={18} value={form.content_md} onChange={set('content_md')} spellCheck={false} />
      </label>
      <div className={editor.legacyObjectives}>
        <h2>Objectives</h2>
        {form.objectives.map((item, index) => (
          // eslint-disable-next-line react/no-array-index-key -- plain strings, no stable id
          <div className={editor.row} key={index}>
            <input aria-label={`Objective ${index + 1}`} value={item} onChange={(event) => setObjective(index, event.target.value)} />
            <button type="button" className={styles.ghostButton} aria-label="Remove objective"
              onClick={() => setForm((prev) => ({ ...prev, objectives: prev.objectives.filter((_, i) => i !== index) }))}><Icon name="delete" /></button>
          </div>
        ))}
        <button type="button" className={styles.button} onClick={() => setForm((prev) => ({ ...prev, objectives: [...prev.objectives, ''] }))}>
          <Icon name="add" /> Add objective
        </button>
      </div>
    </>
  );
}

function move(list, index, delta) {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = list.slice();
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function ItemActions({ index, count, label, onMove, onRemove }) {
  return (
    <div className={editor.itemActions}>
      <button type="button" className={styles.ghostButton} aria-label={`Move ${label} ${index + 1} up`} disabled={index === 0} onClick={() => onMove(-1)}><Icon name="arrow_upward" /></button>
      <button type="button" className={styles.ghostButton} aria-label={`Move ${label} ${index + 1} down`} disabled={index === count - 1} onClick={() => onMove(1)}><Icon name="arrow_downward" /></button>
      <button type="button" className={styles.ghostButton} aria-label={`Remove ${label} ${index + 1}`} onClick={onRemove}><Icon name="delete" /></button>
    </div>
  );
}

function StructuredForm({ form, set, content, setContent }) {
  const text = (key) => (event) => setContent({ [key]: event.target.value });
  const updateAt = (key, index, patch) => setContent({ [key]: content[key].map((item, i) => (i === index ? { ...item, ...patch } : item)) });
  const removeAt = (key, index) => setContent({ [key]: content[key].filter((_, i) => i !== index) });
  const moveAt = (key, index, delta) => setContent({ [key]: move(content[key], index, delta) });

  return (
    <div className={editor.structuredForm}>
      <section className={editor.formSection} aria-labelledby="info-title">
        <h2 id="info-title">Lesson info</h2>
        <label className={styles.field}>Title<input value={form.title} onChange={set('title')} /></label>
        <label className={styles.field}>Short objective<input value={content.short_objective} onChange={text('short_objective')} placeholder="What the learner will be able to do" /></label>
        <div className={styles.fieldRow}>
          <label className={styles.field}>Track<input value={content.track} onChange={text('track')} placeholder="e.g. Core Commands" /></label>
          <label className={styles.field}>Tag<input value={content.tag} onChange={text('tag')} placeholder="e.g. Navigation" /></label>
          <label className={styles.field}>Difficulty
            <select value={content.difficulty} onChange={text('difficulty')}>
              <option value="">—</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
            </select>
          </label>
        </div>
        <label className={styles.field}>Focus commands (comma-separated)
          <input
            value={content.commands.join(', ')}
            onChange={(event) => setContent({ commands: event.target.value.split(',').map((item) => item.trimStart()) })}
            onBlur={() => setContent({ commands: content.commands.map((item) => item.trim()).filter(Boolean) })}
            placeholder="pwd, cd, ls"
          />
        </label>
      </section>

      <section className={editor.formSection} aria-labelledby="scenario-form-title">
        <h2 id="scenario-form-title">Mission scenario</h2>
        <label className={styles.field}><span className={styles.srOnly}>Scenario</span>
          <textarea rows={4} value={content.scenario} onChange={text('scenario')} placeholder="Set the scene: who the learner is and why this task matters." />
        </label>
      </section>

      <section className={editor.formSection} aria-labelledby="steps-form-title">
        <div className={editor.sectionHeading}>
          <h2 id="steps-form-title">Objective tasks</h2>
          <button type="button" className={styles.button} onClick={() => setContent({ steps: [...content.steps, { id: newItemId('s'), text: '' }] })}><Icon name="add" /> Add step</button>
        </div>
        {content.steps.length === 0 && <p className={styles.muted}>No steps yet — a published lab needs at least one.</p>}
        {content.steps.map((step, index) => (
          <div className={editor.itemRow} key={step.id}>
            <span className={editor.rowIndex}>{index + 1}</span>
            <div style={{ display: 'grid', gap: 6 }}>
              <textarea className={editor.stepText} rows={2} aria-label={`Step ${index + 1}`} value={step.text} onChange={(event) => updateAt('steps', index, { text: event.target.value })} placeholder="Use `backticks` for inline commands" />
              <label className={styles.field} style={{ fontSize: 12 }}>Auto-tick when the learner runs (optional)
                <input value={step.target_cmd || ''} onChange={(event) => updateAt('steps', index, { target_cmd: event.target.value || undefined })} placeholder="e.g. ls -la" />
              </label>
            </div>
            <ItemActions index={index} count={content.steps.length} label="step" onMove={(d) => moveAt('steps', index, d)} onRemove={() => removeAt('steps', index)} />
          </div>
        ))}
      </section>

      <section className={editor.formSection} aria-labelledby="syntax-form-title">
        <div className={editor.sectionHeading}>
          <h2 id="syntax-form-title">Command syntax &amp; usage</h2>
          <button type="button" className={styles.button} onClick={() => setContent({ command_syntax: [...content.command_syntax, { command: '', description: '' }] })}><Icon name="add" /> Add row</button>
        </div>
        {content.command_syntax.map((row, index) => (
          // eslint-disable-next-line react/no-array-index-key -- rows have no stable id in the v1 contract
          <div className={editor.dataRow} key={index}>
            <label className={styles.field}>Command<input value={row.command} onChange={(event) => updateAt('command_syntax', index, { command: event.target.value })} placeholder="ls [options] [path]" /></label>
            <label className={styles.field}>Description<input value={row.description} onChange={(event) => updateAt('command_syntax', index, { description: event.target.value })} /></label>
            <ItemActions index={index} count={content.command_syntax.length} label="syntax row" onMove={(d) => moveAt('command_syntax', index, d)} onRemove={() => removeAt('command_syntax', index)} />
          </div>
        ))}
      </section>

      <section className={editor.formSection} aria-labelledby="examples-form-title">
        <div className={editor.sectionHeading}>
          <h2 id="examples-form-title">Example walkthrough</h2>
          <button type="button" className={styles.button} onClick={() => setContent({ examples: [...content.examples, { title: '', code: '', explanation: '' }] })}><Icon name="add" /> Add example</button>
        </div>
        {content.examples.map((example, index) => (
          // eslint-disable-next-line react/no-array-index-key -- rows have no stable id in the v1 contract
          <div className={editor.exampleForm} key={index}>
            <div className={editor.sectionHeading}>
              <strong>Example {index + 1}</strong>
              <ItemActions index={index} count={content.examples.length} label="example" onMove={(d) => moveAt('examples', index, d)} onRemove={() => removeAt('examples', index)} />
            </div>
            <label className={styles.field}>Example title<input value={example.title} onChange={(event) => updateAt('examples', index, { title: event.target.value })} /></label>
            <label className={styles.field}>Code<textarea rows={3} value={example.code} onChange={(event) => updateAt('examples', index, { code: event.target.value })} spellCheck={false} /></label>
            <label className={styles.field}>Explanation<textarea rows={2} value={example.explanation} onChange={(event) => updateAt('examples', index, { explanation: event.target.value })} /></label>
          </div>
        ))}
      </section>

      <section className={editor.formSection} aria-labelledby="hints-form-title">
        <h2 id="hints-form-title">Hints &amp; solution</h2>
        <label className={styles.field}>Hint<textarea rows={2} value={content.hint} onChange={text('hint')} /></label>
        <label className={styles.field}>Solution walkthrough<textarea rows={4} value={content.solution_explanation} onChange={text('solution_explanation')} /></label>
      </section>
    </div>
  );
}
