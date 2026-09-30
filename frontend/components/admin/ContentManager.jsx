'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import styles from './Admin.module.css';
import content from './ContentManager.module.css';
import { isValidSlug, slugify } from './slug';

function Icon({ name }) { return <span className="material-symbols-outlined" aria-hidden="true">{name}</span>; }

const STATUS_BADGE = { published: styles.badgeGreen, draft: styles.badgeAmber, upcoming: styles.badgeGray, hidden: styles.badgeGray };
const bySort = (a, b) => a.sort_order - b.sort_order;
const nextOrder = (rows) => rows.reduce((max, row) => Math.max(max, row.sort_order), 0) + 1;

async function loadCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('id, slug, title, description, level, category, duration_minutes, status, sort_order, chapters(id, title, sort_order, lessons(id, slug, title, status, sort_order))')
    .order('sort_order');
  if (error) throw error;
  return data.map((course) => ({
    ...course,
    chapters: course.chapters.sort(bySort).map((chapter) => ({ ...chapter, lessons: chapter.lessons.sort(bySort) })),
  }));
}

export default function ContentManager() {
  const router = useRouter();
  const [courses, setCourses] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await loadCourses();
      setCourses(data);
      setSelectedId((current) => current ?? data[0]?.id ?? null);
    } catch (loadError) {
      setError(loadError.message);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const confirmLeave = () => !dirty || window.confirm('You have unsaved changes. Discard them?');

  // Every mutation goes through here: show the error or reload the tree.
  async function mutate(promise) {
    const { error: mutationError } = await promise;
    if (mutationError) {
      setError(mutationError.message);
      return false;
    }
    setError('');
    await refresh();
    return true;
  }

  async function createCourse() {
    const title = window.prompt('New course title');
    if (!title?.trim()) return;
    const slug = slugify(title);
    const { data, error: insertError } = await supabase.from('courses')
      .insert({ title: title.trim(), slug, status: 'draft', sort_order: nextOrder(courses) })
      .select('id').single();
    if (insertError) {
      setError(insertError.code === '23505' ? `A course with slug "${slug}" already exists.` : insertError.message);
      return;
    }
    setSelectedId(data.id);
    await refresh();
  }

  async function swap(table, a, b) {
    if (!a || !b) return;
    await mutate(Promise.all([
      supabase.from(table).update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from(table).update({ sort_order: a.sort_order }).eq('id', b.id),
    ]).then((results) => results.find((result) => result.error) || { error: null }));
  }

  async function addLesson(course, chapter) {
    const title = window.prompt('New lesson title');
    if (!title?.trim()) return;
    const taken = new Set(course.chapters.flatMap((item) => item.lessons.map((lesson) => lesson.slug)));
    let slug = slugify(title) || 'lesson';
    for (let n = 2; taken.has(slug); n++) slug = `${slugify(title)}-${n}`;
    const { data, error: insertError } = await supabase.from('lessons')
      .insert({ chapter_id: chapter.id, title: title.trim(), slug, status: 'draft', sort_order: nextOrder(chapter.lessons), content_md: `# ${title.trim()}\n` })
      .select('id').single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.push(`/admin/lessons/${data.id}`);
  }

  if (!courses) return error ? <p className={styles.errorText}>{error}</p> : null;
  const course = courses.find((item) => item.id === selectedId) || null;

  return (
    <div>
      <header className={styles.header}>
        <div><h1>Content<span>.</span></h1><p>Courses, chapters and lessons. Drafts are only visible to admins.</p></div>
        <button type="button" className={styles.primaryButton} onClick={createCourse}><Icon name="add" /> New course</button>
      </header>
      {error && <p className={styles.errorText} role="alert">{error}</p>}

      <div className={content.layout}>
        <aside className={`${styles.panel} ${content.courseList}`} aria-label="Courses">
          {courses.map((item) => (
            <button type="button" key={item.id} aria-pressed={item.id === selectedId}
              className={item.id === selectedId ? content.courseActive : ''}
              onClick={() => { if (confirmLeave()) { setDirty(false); setSelectedId(item.id); } }}>
              <span>{item.title}</span>
              <span className={`${styles.badge} ${STATUS_BADGE[item.status]}`}>{item.status}</span>
            </button>
          ))}
          {courses.length === 0 && <p className={styles.muted}>No courses yet.</p>}
        </aside>

        {course && (
          <div className={content.detail}>
            <CourseForm key={course.id} course={course} courses={courses} onDirty={setDirty} mutate={mutate} />

            <section className={`${styles.panel} ${styles.panelPad}`} aria-labelledby="tree-title">
              <div className={content.treeHeader}>
                <h2 id="tree-title">Chapters &amp; lessons</h2>
                <button type="button" className={styles.button} onClick={async () => {
                  const title = window.prompt('New chapter title');
                  if (title?.trim()) await mutate(supabase.from('chapters').insert({ course_id: course.id, title: title.trim(), sort_order: nextOrder(course.chapters) }));
                }}><Icon name="add" /> Add chapter</button>
              </div>

              {course.chapters.length === 0 && <p className={styles.muted}>No chapters yet.</p>}
              {course.chapters.map((chapter, chapterIndex) => (
                <div className={content.chapter} key={chapter.id}>
                  <div className={content.chapterRow}>
                    <span className={content.index}>{String(chapterIndex + 1).padStart(2, '0')}</span>
                    <strong>{chapter.title}</strong>
                    <div className={content.rowActions}>
                      <button type="button" className={styles.ghostButton} aria-label="Rename chapter" onClick={async () => {
                        const title = window.prompt('Rename chapter', chapter.title);
                        if (title?.trim() && title !== chapter.title) await mutate(supabase.from('chapters').update({ title: title.trim() }).eq('id', chapter.id));
                      }}><Icon name="edit" /></button>
                      <button type="button" className={styles.ghostButton} aria-label="Move chapter up" disabled={chapterIndex === 0}
                        onClick={() => swap('chapters', chapter, course.chapters[chapterIndex - 1])}><Icon name="arrow_upward" /></button>
                      <button type="button" className={styles.ghostButton} aria-label="Move chapter down" disabled={chapterIndex === course.chapters.length - 1}
                        onClick={() => swap('chapters', chapter, course.chapters[chapterIndex + 1])}><Icon name="arrow_downward" /></button>
                      <button type="button" className={styles.ghostButton} onClick={() => addLesson(course, chapter)}><Icon name="add" /> Lesson</button>
                    </div>
                  </div>
                  <ol className={content.lessons}>
                    {chapter.lessons.map((lesson, lessonIndex) => (
                      <li key={lesson.id} className={content.lessonRow}>
                        <a href={`/admin/lessons/${lesson.id}`} onClick={(event) => { if (!confirmLeave()) event.preventDefault(); }}>{lesson.title}</a>
                        <span className={`${styles.badge} ${STATUS_BADGE[lesson.status]}`}>{lesson.status}</span>
                        <div className={content.rowActions}>
                          <button type="button" className={styles.ghostButton} aria-label="Move lesson up" disabled={lessonIndex === 0}
                            onClick={() => swap('lessons', lesson, chapter.lessons[lessonIndex - 1])}><Icon name="arrow_upward" /></button>
                          <button type="button" className={styles.ghostButton} aria-label="Move lesson down" disabled={lessonIndex === chapter.lessons.length - 1}
                            onClick={() => swap('lessons', lesson, chapter.lessons[lessonIndex + 1])}><Icon name="arrow_downward" /></button>
                          <a className={styles.ghostButton} href={`/admin/lessons/${lesson.id}`} onClick={(event) => { if (!confirmLeave()) event.preventDefault(); }}><Icon name="edit_note" /> Edit</a>
                        </div>
                      </li>
                    ))}
                    {chapter.lessons.length === 0 && <li className={styles.muted}>No lessons in this chapter.</li>}
                  </ol>
                </div>
              ))}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function CourseForm({ course, courses, onDirty, mutate }) {
  const initial = {
    title: course.title,
    slug: course.slug,
    description: course.description || '',
    level: course.level || '',
    category: course.category || '',
    // Inputs hold strings; keep the baseline as strings too so "dirty" compares like with like.
    duration_minutes: course.duration_minutes == null ? '' : String(course.duration_minutes),
  };
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState('');
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);

  const set = (key) => (event) => {
    setMessage('');
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  async function save(event) {
    event.preventDefault();
    if (!form.title.trim()) return setMessage('Title is required.');
    if (!isValidSlug(form.slug)) return setMessage('Slug may only contain lowercase letters, numbers and single hyphens.');
    if (courses.some((item) => item.id !== course.id && item.slug === form.slug)) return setMessage('Another course already uses this slug.');
    const ok = await mutate(supabase.from('courses').update({
      title: form.title.trim(),
      slug: form.slug,
      description: form.description.trim() || null,
      level: form.level || null,
      category: form.category || null,
      duration_minutes: form.duration_minutes === '' ? null : Number(form.duration_minutes),
    }).eq('id', course.id));
    setMessage(ok ? 'Saved.' : '');
    return undefined;
  }

  return (
    <section className={`${styles.panel} ${styles.panelPad}`} aria-labelledby="course-form-title">
      <div className={content.treeHeader}>
        <h2 id="course-form-title">Course details</h2>
        <label className={styles.field} style={{ flexDirection: 'row', alignItems: 'center' }}>
          Status
          <select value={course.status} onChange={(event) => mutate(supabase.from('courses').update({ status: event.target.value }).eq('id', course.id))}>
            <option value="draft">Draft</option>
            <option value="upcoming">Upcoming (public teaser)</option>
            <option value="published">Published</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
      </div>
      <form onSubmit={save} className={content.form}>
        <div className={styles.fieldRow}>
          <label className={styles.field}>Title<input value={form.title} onChange={set('title')} required /></label>
          <label className={styles.field}>Slug<input value={form.slug} onChange={set('slug')} required /></label>
        </div>
        <label className={styles.field}>Description<textarea rows={3} value={form.description} onChange={set('description')} /></label>
        <div className={styles.fieldRow}>
          <label className={styles.field}>Level
            <select value={form.level} onChange={set('level')}>
              <option value="">—</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
            </select>
          </label>
          <label className={styles.field}>Category
            <select value={form.category} onChange={set('category')}>
              <option value="">—</option><option value="Core Track">Core Track</option><option value="Security">Security</option>
            </select>
          </label>
          <label className={styles.field}>Duration (minutes)<input type="number" min="0" value={form.duration_minutes} onChange={set('duration_minutes')} /></label>
        </div>
        <div className={content.formActions}>
          {message && <span className={message === 'Saved.' ? styles.successText : styles.errorText}>{message}</span>}
          {dirty && <span className={styles.muted}>Unsaved changes</span>}
          <button type="button" className={styles.button} disabled={!dirty} onClick={() => { setForm(initial); setMessage(''); }}>Cancel</button>
          <button type="submit" className={styles.primaryButton} disabled={!dirty}>Save</button>
        </div>
      </form>
    </section>
  );
}
