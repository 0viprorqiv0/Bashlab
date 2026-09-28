import LessonEditor from '@/components/admin/LessonEditor';

export default function AdminLessonPage({ params }) {
  return <LessonEditor lessonId={params.id} />;
}
