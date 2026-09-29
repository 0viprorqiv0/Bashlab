import LabWorkspace from '@/components/workspace/LabWorkspace';
import { getLabById } from '@/data/labsData';

export function generateMetadata({ params }) {
  const labId = Number(params?.labId) || 1;
  const courseId = params?.id || 'shell-101';
  const lab = getLabById(labId);

  return {
    title: `Lab #${lab.id}: ${lab.title} — BashLab`,
    description: lab.shortObjective || 'Interactive terminal practice lab from BashLab.',
  };
}

export default function LabPage({ params }) {
  const courseId = params?.id || 'shell-101';
  const labId = Number(params?.labId) || 1;

  return <LabWorkspace courseId={courseId} labId={labId} />;
}
