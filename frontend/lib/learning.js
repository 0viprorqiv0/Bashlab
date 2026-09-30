import { supabase } from './supabaseClient';

const COURSE_FIELDS = 'id, slug, title, description, level, category, duration_minutes, status, sort_order, '
  + 'chapters(id, title, sort_order, lessons(id, slug, title, status, sort_order, objectives))';

const bySort = (a, b) => a.sort_order - b.sort_order;

// Learner pages only ever show published lessons, even to admins (who can read drafts via RLS).
function normalizeCourse(row) {
  const chapters = (row.chapters || []).slice().sort(bySort).map((chapter) => ({
    ...chapter,
    lessons: (chapter.lessons || []).filter((lesson) => lesson.status === 'published'
      && !(row.slug === 'shell-101' && lesson.slug === 'hello-bashlab')).sort(bySort),
  }));
  return { ...row, chapters, lessons: chapters.flatMap((chapter) => chapter.lessons) };
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function fetchPublishedCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select(COURSE_FIELDS)
    .eq('status', 'published')
    .order('sort_order');
  if (error) throw error;
  return data.map(normalizeCourse);
}

export async function fetchCourse(slug) {
  const { data, error } = await supabase
    .from('courses')
    .select(COURSE_FIELDS)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeCourse(data) : null;
}

export async function fetchProgressMap(userId) {
  const { data, error } = await supabase
    .from('progress')
    .select('lesson_id, status, completed_at, updated_at')
    .eq('user_id', userId);
  if (error) throw error;
  return new Map(data.map((row) => [row.lesson_id, row]));
}

export function courseStats(course, progressMap) {
  const isDone = (lesson) => progressMap.get(lesson.id)?.status === 'done';
  const done = course.lessons.filter(isDone).length;
  const next = course.lessons.find((lesson) => !isDone(lesson)) || course.lessons[0] || null;
  return { total: course.lessons.length, done, next };
}

// Lessons unlock in order: everything done stays open, the first unfinished
// lesson is "current", and anything after it is locked.
export function lessonStates(course, progressMap) {
  const states = new Map();
  let reachedCurrent = false;
  for (const lesson of course.lessons) {
    if (progressMap.get(lesson.id)?.status === 'done') states.set(lesson.id, 'done');
    else if (!reachedCurrent) {
      states.set(lesson.id, 'current');
      reachedCurrent = true;
    } else states.set(lesson.id, 'locked');
  }
  return states;
}

export function courseCode(slug) {
  return slug.match(/\d+/)?.[0] || slug.slice(0, 3).toUpperCase();
}

export function lessonHref(courseSlug, lessonSlug) {
  return `/courses/${courseSlug}/labs/${lessonSlug}`;
}

export async function markLessonDone(userId, lessonId) {
  const now = new Date().toISOString();
  return supabase.from('progress').upsert({
    user_id: userId,
    lesson_id: lessonId,
    status: 'done',
    completed_at: now,
    updated_at: now,
  });
}

export async function markLessonUndone(userId, lessonId) {
  return supabase.from('progress').delete().eq('user_id', userId).eq('lesson_id', lessonId);
}

export async function markLessonStarted(userId, lessonId) {
  // Never downgrades an already-done lesson — ignoreDuplicates only inserts
  // when no row exists yet for this (user, lesson) pair.
  return supabase.from('progress').upsert(
    { user_id: userId, lesson_id: lessonId, status: 'in_progress', updated_at: new Date().toISOString() },
    { onConflict: 'user_id,lesson_id', ignoreDuplicates: true },
  );
}

const LAB_FIELDS = 'id, slug, title, status, sort_order, category, tag, difficulty, commands, lab, test_template, objectives, '
  + 'chapter_id, chapters!inner(course_id, sort_order)';

// Flat, LeetCode-style list of labs for a course — only lessons authored with
// lab content (category set). Order: chapter.sort_order, then lesson.sort_order.
export async function fetchCourseLabs(courseSlug) {
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, slug, title')
    .eq('slug', courseSlug)
    .in('status', ['published', 'upcoming'])
    .maybeSingle();
  if (courseError) throw courseError;
  if (!course) return null;

  const { data, error } = await supabase
    .from('lessons')
    .select(LAB_FIELDS)
    .eq('status', 'published')
    .eq('chapters.course_id', course.id)
    .not('category', 'is', null);
  if (error) throw error;

  const labs = data
    .slice()
    .sort((a, b) => (a.chapters.sort_order - b.chapters.sort_order) || (a.sort_order - b.sort_order));
  return { ...course, labs };
}

export function labProgressStatus(lab, progressMap) {
  return progressMap.get(lab.id)?.status === 'done' ? 'solved'
    : progressMap.get(lab.id) ? 'in_progress' : 'todo';
}

// Shape expected by CourseDetail/LabWorkspace (mirrors the old frontend/data/labsData.js entries).
export function toDisplayLab(row, progressMap) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    commands: row.commands || [],
    category: row.category,
    tag: row.tag,
    difficulty: row.difficulty,
    status: labProgressStatus(row, progressMap),
    verifier: row.test_template?.verifier || null,
    shortObjective: row.objectives?.[0] || '',
    ...row.lab,
  };
}
