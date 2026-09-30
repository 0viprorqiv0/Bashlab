import CourseDetail from '@/components/courses/CourseDetail';
import { redirect } from 'next/navigation';

export function generateMetadata({ params }) {
  const courseId = params?.slug || 'shell-101';
  const name = courseId === 'shell-101' ? 'Shell 101 — Bash Basics' : 'Course Curriculum';
  return {
    title: `${name} — BashLab`,
    description: `Interactive terminal curriculum and practice labs for ${name}.`,
  };
}

export default function CourseDetailPage({ params }) {
  if (params?.slug === 'shell-101') redirect('/courses/shell-101/labs/1');
  return <CourseDetail courseId={params?.slug || 'shell-101'} />;
}
