import CourseStartRedirect from '@/components/courses/CourseStartRedirect';

export function generateMetadata({ params }) {
  const courseId = params?.slug || 'shell-101';
  const name = courseId === 'shell-101' ? 'Shell 101 — Bash Basics' : 'Course Curriculum';
  return {
    title: `${name} — BashLab`,
    description: `Interactive terminal curriculum and practice labs for ${name}.`,
  };
}

export default function CourseStartPage({ params }) {
  return <CourseStartRedirect courseId={params?.slug || 'shell-101'} />;
}
