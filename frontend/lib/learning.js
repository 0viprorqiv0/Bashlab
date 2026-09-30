import { supabase } from './supabaseClient';
import { progressApi } from './writeApi';

// Single source of truth for what a learner sees: every *published* lesson of
// a course, in the chapter/lesson order the admin set in Content. The course
// page, lab workspace, My Learning and the catalog all go through here, so an
// admin change shows up identically everywhere. A lesson's lab content lives
// in lessons.lesson_content (contract v1); lessons without it are legacy
// Markdown lessons (content_md) and are shown as such, not hidden.

const LESSON_FIELDS = 'id, slug, title, status, sort_order, objectives, content_md, test_template, lesson_content';
const LESSON_SUMMARY_FIELDS = 'id, slug, title, status, sort_order';
const COURSE_FIELDS = 'id, slug, title, description, level, category, duration_minutes, status, sort_order';

const bySort = (a, b) => a.sort_order - b.sort_order;

function normalizeCourse(row) {
  const chapters = (row.chapters || []).slice().sort(bySort).map((chapter) => ({
    ...chapter,
    lessons: (chapter.lessons || [])
      .filter((lesson) => lesson.status === 'published')
      .sort(bySort)
      .map((lesson) => ({ ...lesson, chapterTitle: chapter.title })),
  }));
  return { ...row, chapters, lessons: chapters.flatMap((chapter) => chapter.lessons) };
}

// Course page + lab workspace: one request for the course and its lessons.
export async function fetchCourseWithLessons(slug) {
  const { data, error } = await supabase
    .from('courses')
    .select(`${COURSE_FIELDS}, chapters(id, title, sort_order, lessons(${LESSON_FIELDS}))`)
    .eq('slug', slug)
    .in('status', ['published', 'upcoming'])
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeCourse(data) : null;
}

// My Learning: every published course with a light lesson list (no content).
export async function fetchPublishedCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select(`${COURSE_FIELDS}, chapters(id, title, sort_order, lessons(${LESSON_SUMMARY_FIELDS}))`)
    .eq('status', 'published')
    .order('sort_order');
  if (error) throw error;
  return data.map(normalizeCourse);
}

export async function fetchProgressMap(userId) {
  if (!userId) return new Map();
  const { data, error } = await supabase
    .from('progress')
    .select('lesson_id, status, completed_at, updated_at')
    .eq('user_id', userId);
  if (error) throw error;
  return new Map(data.map((row) => [row.lesson_id, row]));
}

export function labProgressStatus(lesson, progressMap) {
  const row = progressMap.get(lesson.id);
  if (row?.status === 'done') return 'solved';
  return row ? 'in_progress' : 'todo';
}

export function courseStats(course, progressMap) {
  const isDone = (lesson) => progressMap.get(lesson.id)?.status === 'done';
  const done = course.lessons.filter(isDone).length;
  const next = course.lessons.find((lesson) => !isDone(lesson)) || null;
  return { total: course.lessons.length, done, next };
}

export function courseCode(slug) {
  return slug.match(/\d+/)?.[0] || slug.slice(0, 3).toUpperCase();
}

export function lessonHref(courseSlug, lessonSlug) {
  return `/courses/${courseSlug}/labs/${lessonSlug}`;
}

const capitalize = (value) => (value ? value[0].toUpperCase() + value.slice(1) : '');

// Shape consumed by CourseDetail/LabWorkspace, from either a structured lab
// (lesson_content v1) or a legacy Markdown lesson.
export function toDisplayLab(lesson, progressMap = new Map()) {
  const content = lesson.lesson_content?.version === 1 ? lesson.lesson_content : null;
  return {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    structured: Boolean(content),
    status: labProgressStatus(lesson, progressMap),
    verifier: lesson.test_template?.verifier || null,
    category: content?.track || lesson.chapterTitle || '',
    tag: content?.tag || lesson.chapterTitle || '',
    difficulty: capitalize(content?.difficulty),
    commands: content?.commands || [],
    shortObjective: content?.short_objective || lesson.objectives?.[0] || '',
    scenario: content?.scenario || '',
    steps: (content?.steps || []).map((step) => ({ id: step.id, text: step.text, targetCmd: step.target_cmd || '' })),
    commandSyntax: (content?.command_syntax || []).map((row) => ({ cmd: row.command, desc: row.description })),
    examples: content?.examples || [],
    hint: content?.hint || lesson.test_template?.hint || '',
    solutionExplanation: content?.solution_explanation || '',
    contentMd: lesson.content_md || '',
    objectives: lesson.objectives || [],
  };
}

// Progress writes go through the API, which takes the user from the token
// (the userId argument is kept only so callers did not need to change).
export async function markLessonDone(_userId, lessonId) {
  return progressApi.done(lessonId);
}

export async function markLessonUndone(_userId, lessonId) {
  return progressApi.clear(lessonId);
}

// The API never downgrades an already-done lesson.
export async function markLessonStarted(_userId, lessonId) {
  return progressApi.started(lessonId);
}
