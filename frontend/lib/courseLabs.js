'use client';

// Data source for the lab workspace: the published lessons of a course, read
// from the database (the same list the course page and the admin Content page
// show), in the shape the workspace UI consumes. Labs are numbered 1..n by
// their position, which is what the /courses/<course>/labs/<n> URLs carry, so
// whatever an admin adds, edits, reorders or unpublishes shows up here.
import { useCallback, useEffect, useState } from 'react';
import { authClient } from './authClient';
import { fetchCourseWithLessons, fetchProgressMap, markLessonDone, markLessonStarted, toDisplayLab } from './learning';

export function labsOf(course, progressMap) {
  return (course?.lessons || []).map((lesson, index) => ({
    ...toDisplayLab(lesson, progressMap),
    lessonId: lesson.id,
    id: index + 1,
  }));
}

export function useCourseLabs(courseSlug) {
  const [state, setState] = useState({ loading: true });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ loading: true });
    // The course and the learner's progress load in parallel; visitors
    // without a session just see every lab as not started.
    const userId = authClient.peekUserId();
    Promise.all([fetchCourseWithLessons(courseSlug), userId ? fetchProgressMap(userId) : new Map()])
      .then(([course, progress]) => {
        if (!active) return;
        setState(course ? { loading: false, course, progress } : { loading: false, missing: true });
      })
      .catch((error) => { if (active) setState({ loading: false, error: error.message }); });
    return () => { active = false; };
  }, [courseSlug, attempt]);

  // Saves through the API, then mirrors it locally so the sidebar updates.
  const markDone = useCallback(async (lab) => {
    const { error } = await markLessonDone(null, lab.lessonId);
    if (!error) {
      setState((prev) => {
        if (!prev.progress) return prev;
        const progress = new Map(prev.progress);
        progress.set(lab.lessonId, { lesson_id: lab.lessonId, status: 'done' });
        return { ...prev, progress };
      });
    }
    return { error };
  }, []);

  const markStarted = useCallback(async (lab) => {
    if (!lab?.lessonId) return { error: null };
    const { error } = await markLessonStarted(null, lab.lessonId);
    if (!error) {
      setState((prev) => {
        if (!prev.progress) return prev;
        const progress = new Map(prev.progress);
        const existing = progress.get(lab.lessonId);
        if (existing?.status !== 'done') {
          progress.set(lab.lessonId, { lesson_id: lab.lessonId, status: 'in_progress', updated_at: new Date().toISOString() });
        }
        return { ...prev, progress };
      });
    }
    return { error };
  }, []);

  const labs = state.course ? labsOf(state.course, state.progress) : [];
  return {
    loading: state.loading,
    missing: Boolean(state.missing),
    error: state.error || '',
    labs,
    markDone,
    markStarted,
    retry: () => setAttempt((n) => n + 1),
  };
}
