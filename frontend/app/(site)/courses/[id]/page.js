import CourseDetail from '@/components/courses/CourseDetail';

export function generateMetadata({ params }) {
  const courseId = params?.id || 'shell-101';
  const name = courseId === 'shell-101' ? 'Shell 101 — Bash Basics' : 'Course Curriculum';
  return {
    title: `${name} — BashLab`,
    description: `Interactive terminal curriculum and practice labs for ${name}.`,
  };
}

export default function CourseDetailPage({ params }) {
  const courseId = params?.id || 'shell-101';
  return <CourseDetail courseId={courseId} />;
}
