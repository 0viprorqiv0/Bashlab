import LabWorkspace from '@/components/workspace/LabWorkspace';
import { notFound, redirect } from 'next/navigation';
import { initialLabs } from '@/data/labsData';

export function generateMetadata({ params }) {
  const courseId = params?.slug || 'shell-101';
  return {
    title: `${courseId} lab — BashLab`,
    description: 'Read the lab scenario and practice Bash commands in the terminal preview.',
  };
}

export default function LabPage({ params }) {
  const courseId = params?.slug || 'shell-101';
  if (courseId !== 'shell-101') notFound();
  const lab = initialLabs.find((item) => String(item.id) === params?.labId || item.slug === params?.labId);
  if (!lab) notFound();
  if (params.labId !== String(lab.id)) redirect(`/courses/${courseId}/labs/${lab.id}`);
  return <LabWorkspace key={lab.id} courseId={courseId} labId={lab.id} />;
}
