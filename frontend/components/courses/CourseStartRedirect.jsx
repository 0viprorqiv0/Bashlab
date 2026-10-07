'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { authClient } from '@/lib/authClient';
import { useCourseLabs } from '@/lib/courseLabs';
import { PageError, PageLoading } from '@/components/shared/Loading';

export default function CourseStartRedirect({ courseId }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { loading, missing, error, labs, retry } = useCourseLabs(courseId);

  useEffect(() => {
    if (!authClient.peekUserId()) {
      router.replace(`/login?next=${encodeURIComponent(`/courses/${courseId}`)}`);
    }
  }, [courseId, router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?next=${encodeURIComponent(`/courses/${courseId}`)}`);
    }
  }, [authLoading, courseId, router, user]);

  useEffect(() => {
    if (!authLoading && user && !loading && !error && !missing && labs.length) {
      const nextLab = labs.find((lab) => lab.status !== 'solved') || labs[0];
      router.replace(`/courses/${courseId}/labs/${nextLab.id}`);
    }
  }, [authLoading, courseId, error, labs, loading, missing, router, user]);

  if (error) return <PageError message={`Could not load this course: ${error}`} onRetry={retry} />;
  if (missing || (!loading && !labs.length)) {
    return <PageError message="This course has no published lessons yet." />;
  }
  return <PageLoading label="Opening your workspace…" />;
}
