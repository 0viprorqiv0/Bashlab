// Every write the app makes (learning progress, content authoring, admin
// actions) goes through the backend API — the browser's Supabase client is
// read-only (see backend/db/migrations/017_writes_api_only.sql). Resolves to
// { data, error } like supabase-js did, so callers just check `error`.
import { apiFetch } from './api';
import { authClient } from './authClient';

async function send(path, method, body) {
  try {
    const token = await authClient.getAccessToken();
    const data = await apiFetch(path, { method, body, token });
    return { data, error: null };
  } catch (error) {
    return { data: null, error: { message: error.message, code: error.status === 409 ? '23505' : error.code, status: error.status } };
  }
}

export const progressApi = {
  done: (lessonId) => send(`/api/progress/${lessonId}`, 'PUT', { status: 'done' }),
  started: (lessonId) => send(`/api/progress/${lessonId}`, 'PUT', { status: 'in_progress' }),
  clear: (lessonId) => send(`/api/progress/${lessonId}`, 'DELETE'),
};

export const adminApi = {
  createCourse: (values) => send('/api/admin/courses', 'POST', values),
  updateCourse: (id, values) => send(`/api/admin/courses/${id}`, 'PATCH', values),
  createChapter: (courseId, values) => send(`/api/admin/courses/${courseId}/chapters`, 'POST', values),
  updateChapter: (id, values) => send(`/api/admin/chapters/${id}`, 'PATCH', values),
  createLesson: (chapterId, values) => send(`/api/admin/chapters/${chapterId}/lessons`, 'POST', values),
  updateLesson: (id, values) => send(`/api/admin/lessons/${id}`, 'PATCH', values),
  swap: (kind, a, b) => send(`/api/admin/${kind}/swap`, 'POST', { items: [a, b].map(({ id, sort_order }) => ({ id, sort_order })) }),
  setUserRole: (id, role, reason) => send(`/api/admin/users/${id}/role`, 'POST', { role, reason }),
  setUserLock: (id, locked, reason) => send(`/api/admin/users/${id}/lock`, 'POST', { locked, reason }),
  dashboard: (range) => send(`/api/admin/dashboard?range=${encodeURIComponent(range)}`, 'GET'),
  stopSession: (id, reason) => send(`/api/admin/sessions/${id}/stop`, 'POST', { reason }),
};
