import LessonWorkspace from '@/components/learning/LessonWorkspace';

export const metadata = {
  title: 'Lesson — BashLab',
  description: 'Read the lesson, practice in a real Bash sandbox and check your solution.',
};

export default function LessonPage({ params }) {
  return <LessonWorkspace courseSlug={params.course} lessonSlug={params.lesson} />;
}
