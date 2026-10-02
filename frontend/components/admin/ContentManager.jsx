'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { adminApi } from '@/lib/writeApi';
import styles from './Admin.module.css';
import content from './ContentManager.module.css';
import { isValidSlug, slugify } from './slug';
import { emptyLessonContent } from './lessonContent';
import ContentStudio from './ContentStudio';

function Icon({ name }) { return <span className="material-symbols-outlined" aria-hidden="true">{name}</span>; }

const STATUS_BADGE = { published: styles.badgeGreen, draft: styles.badgeAmber, upcoming: styles.badgeGray, hidden: styles.badgeGray };
const bySort = (a, b) => a.sort_order - b.sort_order;
const nextOrder = (rows) => rows.reduce((max, row) => Math.max(max, row.sort_order), 0) + 1;

async function loadCourses() {
  const result = await supabase
    .from('courses')
    .select('id, slug, title, description, level, category, duration_minutes, status, sort_order, '
      + 'chapters(id, title, sort_order, lessons(id, slug, title, status, sort_order, lesson_content))')
    .order('sort_order');
  if (result.error) throw result.error;
  return result.data.map((course) => ({
    ...course,
    chapters: course.chapters.sort(bySort).map((chapter) => ({ ...chapter, lessons: chapter.lessons.sort(bySort) })),
  }));
}

export default function ContentManager() {
  const router = useRouter();
  const [courses, setCourses] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState('studio');
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [dialog, setDialog] = useState(null);
  const [dialogTitle, setDialogTitle] = useState('');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await loadCourses();
      setCourses(data);
      const requestedSlug = new URLSearchParams(window.location.search).get('course');
      setSelectedId((current) => current ?? data.find((item) => item.slug === requestedSlug)?.id ?? data[0]?.id ?? null);
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

  function openDialog(type, target = null, title = '') {
    setDialog({ type, target });
    setDialogTitle(title);
    setError('');
  }

  async function submitDialog(event) {
    event.preventDefault();
    const title = dialogTitle.trim();
    if (!title) return setError('Enter a name to continue.');
    let result;
    if (dialog.type === 'course') {
      const slug = slugify(title);
      if (!slug) return setError('Add a title with at least one letter or number.');
      if (courses.some((item) => item.slug === slug)) return setError(`A course with slug "${slug}" already exists.`);
      result = await adminApi.createCourse({ title, slug, status: 'draft', sort_order: nextOrder(courses) });
      if (!result.error) setSelectedId(result.data.id);
    } else if (dialog.type === 'chapter') {
      result = await adminApi.createChapter(course.id, { title, sort_order: nextOrder(course.chapters) });
    } else if (dialog.type === 'rename') {
      result = await adminApi.updateChapter(dialog.target.id, { title });
    } else {
      const chapter = dialog.target;
      const taken = new Set(course.chapters.flatMap((item) => item.lessons.map((lesson) => lesson.slug)));
      const base = slugify(title) || 'lesson';
      let slug = base;
      for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
      // New lessons start as structured labs (draft), so they render in the
      // learner workspace the same way the seeded labs do once published.
      result = await adminApi.createLesson(chapter.id, {
        title, slug, status: 'draft', sort_order: nextOrder(chapter.lessons),
        lesson_content: { ...emptyLessonContent(), track: chapter.title },
      });
      if (!result.error) {
        router.push(`/admin/lessons/${result.data.id}`);
        return;
      }
    }
    if (result.error) return setError(result.error.code === '23505' ? 'That name is already in use.' : result.error.message);
    setDialog(null);
    setDialogTitle('');
    await refresh();
  }

  async function swap(table, a, b) {
    if (!a || !b) return;
    // The two rows trade places: each takes the other's sort_order.
    await mutate(adminApi.swap(table, { id: a.id, sort_order: b.sort_order }, { id: b.id, sort_order: a.sort_order }));
  }

  if (!courses) return error ? <p className={styles.errorText}>{error}</p> : null;
  const course = courses.find((item) => item.id === selectedId) || null;
  const visibleCourses = courses.filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className={content.dashboard}>
      {tab === 'studio' ? (
        <ContentStudio initialCourseSlug={course?.slug} />
      ) : (
        <>
          <header className={styles.header}>
            <div><h1>Content<span>.</span></h1><p>Courses, chapters and lessons. Drafts are only visible to admins.</p></div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => setTab('studio')}
              >
                <Icon name="edit_document" /> Content Studio
              </button>
              <button type="button" className={styles.primaryButton} onClick={() => openDialog('course')}><Icon name="add" /> New course</button>
            </div>
          </header>
          {error && <p className={styles.errorText} role="alert">{error}</p>}

          <div className={content.layout}>
        <aside className={`${styles.panel} ${content.courseAside}`} aria-label="Courses">
          <label className={content.courseSearch}>
            <span className={styles.srOnly}>Search courses</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a course" type="search" />
          </label>
          <div className={content.courseList}>
          {visibleCourses.map((item) => (
            <button type="button" key={item.id} aria-pressed={item.id === selectedId}
              className={item.id === selectedId ? content.courseActive : ''}
              onClick={() => { if (confirmLeave()) { setDirty(false); setSelectedId(item.id); setTab('curriculum'); } }}>
              <span className={content.courseInfo}><strong>{item.title}</strong><small>{item.chapters.length} chapters · {item.chapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0)} lessons</small></span>
              <span className={`${styles.badge} ${STATUS_BADGE[item.status]}`}>{item.status}</span>
            </button>
          ))}
          {visibleCourses.length === 0 && <p className={content.empty}>{courses.length ? 'No courses match your search.' : 'No courses yet.'}</p>}
          </div>
        </aside>

        {course && (
          <div className={content.detail}>
            <div className={content.courseHeading}>
              <div><h2>{course.title}</h2><p>{course.description || 'Add a short summary in Course settings.'}</p></div>
              <span className={`${styles.badge} ${STATUS_BADGE[course.status]}`}>{course.status}</span>
            </div>

            <div className={content.tabs} role="tablist" aria-label="Course sections">
              <button type="button" role="tab" aria-selected={tab === 'curriculum'} onClick={() => setTab('curriculum')}><Icon name="account_tree" /> Curriculum</button>
              <button type="button" role="tab" aria-selected={tab === 'settings'} onClick={() => setTab('settings')}><Icon name="settings" /> Course settings</button>
            </div>

            <div className={content.tabPanel} hidden={tab !== 'curriculum'}>
            <section className={`${styles.panel} ${styles.panelPad}`} aria-labelledby="tree-title">
              <div className={content.treeHeader}>
                <h3 id="tree-title">Chapters &amp; lessons</h3>
                <button type="button" className={styles.button} onClick={() => openDialog('chapter')}><Icon name="add" /> Add chapter</button>
              </div>

              {course.chapters.length === 0 && <p className={content.empty}>No chapters yet. Add a chapter to start the course.</p>}
              {course.chapters.map((chapter, chapterIndex) => (
                <div className={content.chapter} key={chapter.id}>
                  <div className={content.chapterRow}>
                    <button type="button" className={content.chapterToggle} aria-expanded={!collapsed.has(chapter.id)}
                      onClick={() => setCollapsed((prev) => { const next = new Set(prev); next.has(chapter.id) ? next.delete(chapter.id) : next.add(chapter.id); return next; })}>
                      <span className={content.index}>{String(chapterIndex + 1).padStart(2, '0')}</span>
                      <Icon name={collapsed.has(chapter.id) ? 'chevron_right' : 'expand_more'} />
                      <strong>{chapter.title}</strong>
                    </button>
                    <span className={content.chapterCount}>{chapter.lessons.length} lessons</span>
                    <div className={content.rowActions}>
                      <button type="button" className={styles.ghostButton} aria-label={`Rename ${chapter.title}`} onClick={() => openDialog('rename', chapter, chapter.title)}><Icon name="edit" /></button>
                      <button type="button" className={styles.ghostButton} aria-label="Move chapter up" disabled={chapterIndex === 0}
                        onClick={() => swap('chapters', chapter, course.chapters[chapterIndex - 1])}><Icon name="arrow_upward" /></button>
                      <button type="button" className={styles.ghostButton} aria-label="Move chapter down" disabled={chapterIndex === course.chapters.length - 1}
                        onClick={() => swap('chapters', chapter, course.chapters[chapterIndex + 1])}><Icon name="arrow_downward" /></button>
                      <button type="button" className={styles.ghostButton} onClick={() => openDialog('lesson', chapter)}><Icon name="add" /> Lesson</button>
                    </div>
                  </div>
                  {!collapsed.has(chapter.id) && <ol className={content.lessons}>
                    {chapter.lessons.map((lesson, lessonIndex) => (
                      <li key={lesson.id} className={content.lessonRow}>
                        <Link className={content.lessonMain} href={`/admin/lessons/${lesson.id}`} onClick={(event) => { if (!confirmLeave()) event.preventDefault(); }}>
                          <span>{lesson.title}</span>
                          {!!lesson.lesson_content?.commands?.length && <small>{lesson.lesson_content.commands.join(' · ')}</small>}
                        </Link>
                        <span className={`${styles.badge} ${STATUS_BADGE[lesson.status]}`}>{lesson.status}</span>
                        <div className={content.rowActions}>
                          <button type="button" className={styles.ghostButton} aria-label="Move lesson up" disabled={lessonIndex === 0}
                            onClick={() => swap('lessons', lesson, chapter.lessons[lessonIndex - 1])}><Icon name="arrow_upward" /></button>
                          <button type="button" className={styles.ghostButton} aria-label="Move lesson down" disabled={lessonIndex === chapter.lessons.length - 1}
                            onClick={() => swap('lessons', lesson, chapter.lessons[lessonIndex + 1])}><Icon name="arrow_downward" /></button>
                          <Link className={styles.ghostButton} href={`/admin/lessons/${lesson.id}`} onClick={(event) => { if (!confirmLeave()) event.preventDefault(); }}><Icon name="edit_note" /> Edit</Link>
                          {/* Only lessons learners can actually open get a View link. */}
                          {lesson.status === 'published' && course.status === 'published' && (
                            <Link className={styles.ghostButton} href={`/courses/${course.slug}/labs/${lesson.slug}`} aria-label={`View ${lesson.title} as a learner`}><Icon name="visibility" /> View</Link>
                          )}
                        </div>
                      </li>
                    ))}
                    {chapter.lessons.length === 0 && <li className={styles.muted}>No lessons in this chapter.</li>}
                  </ol>}
                </div>
              ))}
            </section>
            </div>
            <div className={content.tabPanel} hidden={tab !== 'settings'}>
              <CourseForm key={course.id} course={course} courses={courses} onDirty={setDirty} mutate={mutate} />
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {dialog && <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
        <form className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="content-dialog-title" onSubmit={submitDialog}>
          <h2 id="content-dialog-title">{dialog.type === 'course' ? 'New course' : dialog.type === 'chapter' ? 'Add chapter' : dialog.type === 'rename' ? 'Rename chapter' : 'Add lesson'}</h2>
          {error && <p className={styles.errorText} role="alert">{error}</p>}
          <label className={styles.field}>{dialog.type === 'course' ? 'Course title' : dialog.type === 'lesson' ? 'Lesson title' : 'Chapter title'}
            <input autoFocus value={dialogTitle} onChange={(event) => setDialogTitle(event.target.value)} maxLength={120} required />
          </label>
          <div className={styles.dialogActions}>
            <button type="button" className={styles.button} onClick={() => setDialog(null)}>Cancel</button>
            <button type="submit" className={styles.primaryButton}>Continue</button>
          </div>
        </form>
      </div>}
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
    status: course.status,
    // Inputs hold strings; keep the baseline as strings too so "dirty" compares like with like.
    duration_minutes: course.duration_minutes == null ? '' : String(course.duration_minutes),
  };
  const [saved, setSaved] = useState(initial);
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState('');
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

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
    const ok = await mutate(adminApi.updateCourse(course.id, {
      title: form.title.trim(),
      slug: form.slug,
      description: form.description.trim() || null,
      level: form.level || null,
      category: form.category || null,
      duration_minutes: form.duration_minutes === '' ? null : Number(form.duration_minutes),
      status: form.status,
    }));
    if (ok) {
      const next = { ...form, title: form.title.trim() };
      setSaved(next);
      setForm(next);
    }
    setMessage(ok ? 'Saved.' : '');
    return undefined;
  }

  return (
    <section className={`${styles.panel} ${styles.panelPad} ${content.settingsPanel}`} aria-labelledby="course-form-title">
      <div className={content.treeHeader}>
        <h3 id="course-form-title">Course details</h3>
        <label className={`${styles.field} ${content.courseStatus}`}>
          Status
          <select value={form.status} onChange={set('status')}>
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
          <button type="button" className={styles.button} disabled={!dirty} onClick={() => { setForm(saved); setMessage(''); }}>Cancel</button>
          <button type="submit" className={styles.primaryButton} disabled={!dirty}>Save</button>
        </div>
      </form>
    </section>
  );
}
