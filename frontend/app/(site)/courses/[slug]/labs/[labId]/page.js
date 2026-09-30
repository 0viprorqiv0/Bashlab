import LabWorkspace from '@/components/workspace/LabWorkspace';

export function generateMetadata({ params }) {
  const courseId = params?.slug || 'shell-101';
  return {
    title: `${courseId} lab — BashLab`,
    description: 'Read the lab scenario and practice Bash commands in the terminal preview.',
  };
}

// Which labs exist (and their numbering) comes from the database, so the
// workspace resolves :labId itself — see components/workspace/LabWorkspace.jsx.
export default function LabPage({ params }) {
  const courseId = params?.slug || 'shell-101';
  return <LabWorkspace courseId={courseId} labId={params?.labId} />;
}
