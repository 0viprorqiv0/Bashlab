import { supabase } from './supabaseClient';

const COURSE_FIELDS = 'id, slug, title, description, level, category, duration_minutes, status, sort_order, '
  + 'chapters(id, title, sort_order, lessons(id, slug, title, status, sort_order))';

const bySort = (a, b) => a.sort_order - b.sort_order;

// Learner pages only ever show published lessons, even to admins (who can read drafts via RLS).
function normalizeCourse(row) {
  const chapters = (row.chapters || []).slice().sort(bySort).map((chapter) => ({
    ...chapter,
    lessons: (chapter.lessons || []).filter((lesson) => lesson.status === 'published').sort(bySort),
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

export function courseCode(slug) {
  return slug.match(/\d+/)?.[0] || slug.slice(0, 3).toUpperCase();
}

export function lessonHref(courseSlug, lessonSlug) {
  return `/learn/${courseSlug}/${lessonSlug}`;
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
