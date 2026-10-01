import { HttpError } from '../errors.js';

// Every write the browser used to make straight to Supabase (learning
// progress, course/chapter/lesson authoring, admin user actions) goes through
// here instead. The service-role client bypasses RLS, so each method does its
// own authorization + validation; the DB triggers/constraints stay on as a
// second layer. Admin RPCs run as the caller (see createSupabaseUserFactory)
// so is_admin()/auth.uid() and the admin_logs audit row keep working.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const COURSE_STATUS = ['draft', 'upcoming', 'published', 'hidden'];
const LESSON_STATUS = ['draft', 'published'];
export const LESSON_SELECT = 'id, title, slug, chapter_id, sort_order, status, content_md, objectives, test_template, lesson_content, '
  + 'chapters(course_id, title, courses(id, title, slug))';

const bad = (message) => new HttpError(400, 'INVALID_INPUT', message);

export const isUuid = (value) => typeof value === 'string' && UUID.test(value);
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function assertUuid(value, name) {
  if (!isUuid(value)) throw bad(`${name} must be a valid id`);
  return value;
}

function text(value, name, { min = 1, max = 200, nullable = false } = {}) {
  if (value === null || value === undefined || value === '') {
    if (nullable) return null;
    throw bad(`${name} is required`);
  }
  if (typeof value !== 'string') throw bad(`${name} must be text`);
  const trimmed = value.trim();
  if (nullable && !trimmed) return null;
  if (trimmed.length < min) throw bad(`${name} is required`);
  if (trimmed.length > max) throw bad(`${name} must be at most ${max} characters`);
  if (trimmed.includes('\0')) throw bad(`${name} contains invalid characters`);
  return trimmed;
}

function slug(value) {
  if (typeof value !== 'string' || !SLUG.test(value) || value.length > 80) {
    throw bad('slug may only contain lowercase letters, numbers and single hyphens (max 80 characters)');
  }
  return value;
}

function oneOf(value, name, allowed) {
  if (!allowed.includes(value)) throw bad(`${name} must be one of: ${allowed.join(', ')}`);
  return value;
}

function sortOrder(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < -1_000_000 || number > 1_000_000) throw bad('sort_order must be a whole number');
  return number;
}

// Only the listed keys survive; everything else the client sent is ignored,
// so a request can never write a column nobody meant to expose.
function pick(body, rules, { partial }) {
  if (!isPlainObject(body)) throw bad('Request body must be a JSON object');
  const out = {};
  for (const [key, parse] of Object.entries(rules)) {
    if (body[key] === undefined) continue;
    out[key] = parse(body[key]);
  }
  if (partial && Object.keys(out).length === 0) throw bad('Nothing to update');
  return out;
}

const courseRules = {
  title: (v) => text(v, 'title'),
  slug,
  description: (v) => text(v, 'description', { max: 2000, nullable: true }),
  level: (v) => text(v, 'level', { max: 40, nullable: true }),
  category: (v) => text(v, 'category', { max: 80, nullable: true }),
  duration_minutes: (v) => {
    if (v === null || v === '') return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > 100_000) throw bad('duration_minutes must be a whole number');
    return n;
  },
  status: (v) => oneOf(v, 'status', COURSE_STATUS),
  sort_order: sortOrder,
};

const lessonRules = {
  title: (v) => text(v, 'title'),
  slug,
  chapter_id: (v) => assertUuid(v, 'chapter_id'),
  sort_order: sortOrder,
  status: (v) => oneOf(v, 'status', LESSON_STATUS),
  test_template: (v) => {
    if (v === null) return null;
    if (!isPlainObject(v) || (v.verifier !== undefined && (typeof v.verifier !== 'string' || v.verifier.length > 80))) {
      throw bad('test_template must be null or { verifier: string }');
    }
    return v.verifier ? { verifier: v.verifier } : null;
  },
  // Structure/limits of lesson_content are enforced by the DB trigger
  // (validate_lesson_content); here only "is an object of sane size".
  lesson_content: (v) => {
    if (!isPlainObject(v)) throw bad('lesson_content must be an object');
    return v;
  },
  content_md: (v) => {
    if (v === null) return null;
    if (typeof v !== 'string' || v.length > 100_000) throw bad('content_md must be text up to 100000 characters');
    return v;
  },
  objectives: (v) => {
    if (!Array.isArray(v) || v.length > 50 || v.some((item) => typeof item !== 'string' || item.length > 500)) {
      throw bad('objectives must be a list of up to 50 short texts');
    }
    return v;
  },
};

// Postgres/PostgREST error -> HTTP. Messages raised by our own triggers and
// RPCs (errcode 22023/42501/P0001) are written for humans, so they pass through.
export function mapDbError(error) {
  if (!error) return null;
  if (error.code === 'PGRST116') return new HttpError(404, 'NOT_FOUND', 'Not found');
  if (error.code === '23505') return new HttpError(409, 'CONFLICT', 'That name is already in use.');
  if (error.code === '23503') return new HttpError(400, 'INVALID_REFERENCE', 'Referenced item does not exist');
  if (error.code === '42501') return new HttpError(403, 'FORBIDDEN', error.message === 'forbidden' ? 'Admin role required' : error.message);
  if (['22023', 'P0001', '23514', '22P02'].includes(error.code)) return new HttpError(400, 'INVALID_INPUT', error.message);
  console.error('content db error:', error.code, error.message);
  return new HttpError(500, 'INTERNAL_ERROR', 'Internal server error');
}

const must = ({ data, error }) => {
  if (error) throw mapDbError(error);
  return data;
};

export function createContentService({ admin, userClient }) {
  // A lesson is learnable when it and its course are published (same rule as
  // the RLS read policy); admins may touch any lesson.
  async function visibleLesson(lessonId, isAdmin) {
    const { data, error } = await admin.from('lessons')
      .select('id, status, chapters(courses(status))').eq('id', lessonId).maybeSingle();
    if (error) throw mapDbError(error);
    const published = data && data.status === 'published' && data.chapters?.courses?.status === 'published';
    if (!data || !(published || isAdmin)) throw new HttpError(404, 'LESSON_NOT_FOUND', 'Lesson not found');
  }

  return {
    // ---- learner progress ------------------------------------------------
    async markProgress(user, lessonId, status) {
      assertUuid(lessonId, 'lessonId');
      oneOf(status, 'status', ['in_progress', 'done']);
      await visibleLesson(lessonId, user.isAdmin);
      const now = new Date().toISOString();
      if (status === 'done') {
        must(await admin.from('progress').upsert(
          { user_id: user.id, lesson_id: lessonId, status: 'done', completed_at: now, updated_at: now },
          { onConflict: 'user_id,lesson_id' },
        ));
      } else {
        // Starting a lesson never downgrades one that is already done.
        must(await admin.from('progress').upsert(
          { user_id: user.id, lesson_id: lessonId, status: 'in_progress', updated_at: now },
          { onConflict: 'user_id,lesson_id', ignoreDuplicates: true },
        ));
      }
    },

    async clearProgress(user, lessonId) {
      assertUuid(lessonId, 'lessonId');
      must(await admin.from('progress').delete().eq('user_id', user.id).eq('lesson_id', lessonId));
    },

    // ---- course authoring --------------------------------------------------
    async createCourse(body) {
      const values = pick(body, courseRules, { partial: false });
      if (!values.title || !values.slug) throw bad('title and slug are required');
      return must(await admin.from('courses').insert({ status: 'draft', sort_order: 0, ...values }).select('id, slug').single());
    },

    async updateCourse(id, body) {
      assertUuid(id, 'course id');
      const values = pick(body, courseRules, { partial: true });
      return must(await admin.from('courses').update(values).eq('id', id).select('id, slug').single());
    },

    async createChapter(courseId, body) {
      assertUuid(courseId, 'course id');
      const values = pick(body, { title: courseRules.title, sort_order: sortOrder }, { partial: false });
      if (!values.title) throw bad('title is required');
      return must(await admin.from('chapters').insert({ sort_order: 0, ...values, course_id: courseId }).select('id').single());
    },

    async updateChapter(id, body) {
      assertUuid(id, 'chapter id');
      const values = pick(body, { title: courseRules.title, sort_order: sortOrder }, { partial: true });
      return must(await admin.from('chapters').update(values).eq('id', id).select('id').single());
    },

    async createLesson(chapterId, body) {
      assertUuid(chapterId, 'chapter id');
      const { chapter_id: _ignored, ...rules } = lessonRules;
      const values = pick(body, rules, { partial: false });
      if (!values.title || !values.slug) throw bad('title and slug are required');
      return must(await admin.from('lessons').insert({ status: 'draft', sort_order: 0, ...values, chapter_id: chapterId })
        .select('id').single());
    },

    async updateLesson(id, body) {
      assertUuid(id, 'lesson id');
      const values = pick(body, lessonRules, { partial: true });
      return must(await admin.from('lessons').update(values).eq('id', id).select(LESSON_SELECT).single());
    },

    // Swap the sort_order of two siblings (the Up/Down buttons).
    async swapOrder(kind, body) {
      const table = { courses: 'courses', chapters: 'chapters', lessons: 'lessons' }[kind];
      if (!table) throw new HttpError(404, 'NOT_FOUND', 'Endpoint not found');
      const items = body?.items;
      if (!Array.isArray(items) || items.length !== 2) throw bad('items must contain exactly two entries');
      const [a, b] = items.map((item) => ({ id: assertUuid(item?.id, 'id'), sort_order: sortOrder(item?.sort_order) }));
      if (a.id === b.id) throw bad('items must be different');
      must(await admin.from(table).update({ sort_order: a.sort_order }).eq('id', a.id).select('id').single());
      must(await admin.from(table).update({ sort_order: b.sort_order }).eq('id', b.id).select('id').single());
    },

    // ---- admin user/session actions (run as the caller) ---------------------
    async setUserRole(accessToken, targetId, role, reason) {
      assertUuid(targetId, 'user id');
      oneOf(role, 'role', ['learner', 'admin']);
      must(await userClient(accessToken).rpc('admin_set_user_role',
        { target: targetId, new_role: role, reason: text(reason, 'reason', { max: 500, nullable: true }) }));
    },

    async setUserLock(accessToken, targetId, locked, reason) {
      assertUuid(targetId, 'user id');
      if (typeof locked !== 'boolean') throw bad('locked must be true or false');
      must(await userClient(accessToken).rpc('admin_set_user_lock',
        { target: targetId, locked, reason: text(reason, 'reason', { max: 500, nullable: true }) }));
    },

    // Returns the sandbox session id (if any) so the caller can also end it.
    async stopPracticeSession(accessToken, recordId, reason) {
      assertUuid(recordId, 'session id');
      const { data } = await admin.from('practice_sessions').select('sandbox_session_id').eq('id', recordId).maybeSingle();
      must(await userClient(accessToken).rpc('admin_stop_session',
        { p_session: recordId, p_reason: text(reason, 'reason', { max: 500, nullable: true }) }));
      return data?.sandbox_session_id || null;
    },

    // ---- practice session bookkeeping (called by the sandbox routes) --------
    async openPracticeRecord(userId, lessonId, sandboxSessionId) {
      if (lessonId !== undefined && lessonId !== null) {
        assertUuid(lessonId, 'lessonId');
        await visibleLesson(lessonId, false);
      }
      const { data, error } = await admin.from('practice_sessions')
        .insert({ user_id: userId, lesson_id: lessonId || null, sandbox_session_id: sandboxSessionId, status: 'active' })
        .select('id').single();
      if (error) { console.error('practice_sessions insert failed:', error.message); return null; }
      return data.id;
    },

    async touchPracticeRecord(recordId) {
      await admin.from('practice_sessions').update({ last_active_at: new Date().toISOString() })
        .eq('id', recordId).eq('status', 'active');
    },

    async closePracticeRecord(recordId) {
      await admin.from('practice_sessions').update({ status: 'stopped', last_active_at: new Date().toISOString() })
        .eq('id', recordId).eq('status', 'active');
    },
  };
}
