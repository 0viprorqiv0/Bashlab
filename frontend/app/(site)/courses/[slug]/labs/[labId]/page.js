import LabWorkspace from '@/components/workspace/LabWorkspace';

export function generateMetadata({ params }) {
  const courseId = params?.slug || 'shell-101';
  return {
    title: `${courseId} lab — BashLab`,
    description: 'Interactive terminal practice lab: read the scenario, run real Bash commands and check your solution.',
  };
}

export default function LabPage({ params }) {
  const courseId = params?.slug || 'shell-101';
  return <LabWorkspace courseId={courseId} labId={params?.labId} />;
}
