import CourseOverview from '@/components/courses/CourseOverview';

export const metadata = {
  title: 'Course — BashLab',
  description: 'Course syllabus, learning outcomes and your progress.',
};

export default function CourseOverviewPage({ params }) {
  return <CourseOverview slug={params.slug} />;
}
