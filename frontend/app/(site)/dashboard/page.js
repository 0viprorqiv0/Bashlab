'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { PageLoading } from '@/components/shared/Loading';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login?next=/dashboard');
    } else if (isAdmin) {
      router.replace('/admin/activity');
    } else {
      router.replace('/my-learning');
    }
  }, [user, isAdmin, loading, router]);

  return <PageLoading label="Redirecting to dashboard…" />;
}
