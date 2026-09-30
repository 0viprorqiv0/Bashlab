'use client';

// Data glue for the Shell 101 lab workspace (whose UI is static): keeps a
// signed-in learner's completed labs in the database instead of in component
// state. Labs are matched to lessons by slug. Returns doneSlugs = null until
// loaded (and for visitors without a session) so the workspace falls back to
// its built-in defaults.
import { useCallback, useEffect, useRef, useState } from 'react';
import { authClient } from './authClient';
import { fetchCourseWithLessons, fetchProgressMap, markLessonDone } from './learning';

export function useLabProgress(courseSlug) {
  const [doneSlugs, setDoneSlugs] = useState(null);
  const lessonIds = useRef(new Map()); // slug -> lesson id
  const loaded = useRef(Promise.resolve()); // settles once the lessons are known

  useEffect(() => {
    const userId = authClient.peekUserId();
    if (!userId) return undefined;
    let active = true;
    const request = Promise.all([fetchCourseWithLessons(courseSlug), fetchProgressMap(userId)]);
    loaded.current = request.catch(() => {});
    request
      .then(([course, progress]) => {
        if (!active || !course) return;
        const done = new Set();
        for (const lesson of course.lessons) {
          lessonIds.current.set(lesson.slug, lesson.id);
          if (progress.get(lesson.id)?.status === 'done') done.add(lesson.slug);
        }
        setDoneSlugs(done);
      })
      .catch(() => {}); // workspace keeps working with its defaults
    return () => { active = false; };
  }, [courseSlug]);

  // Optimistic: the workspace already shows "Completed"; a failed save is
  // reported so it can tell the learner instead of silently losing progress.
  const markDone = useCallback(async (slug) => {
    await loaded.current; // a click right after page load must not skip the save
    const lessonId = lessonIds.current.get(slug);
    if (!lessonId) return { error: null }; // not a DB lesson (or not signed in): nothing to save
    const { error } = await markLessonDone(null, lessonId);
    if (!error) setDoneSlugs((prev) => new Set([...(prev || []), slug]));
    return { error };
  }, []);

  return { doneSlugs, markDone };
}
