import LearningDashboard from '@/components/learning/LearningDashboard';

export const metadata = {
  title: 'My Learning — BashLab',
  description: 'Your courses, practice activity, and learning progress in one place.',
};

export const revalidate = 86400;

export default function MyLearningPage() {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  // Preview records until the practice API is connected. Totals and streak use the same records.
  const days = Array.from({ length: 365 }, (_, index) => {
    const date = new Date(today - (364 - index) * 86400000);
    const dayNumber = Math.floor(date.getTime() / 86400000);
    let hash = dayNumber ^ 0x9e3779b9;
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    const score = (hash >>> 0) % 100;
    const activeMonth = [2, 3, 7, 8].includes(date.getUTCMonth());
    let level = score >= (activeMonth ? 32 : 14) ? 0 : score < 2 ? 4 : score < 7 ? 3 : score < 15 ? 2 : 1;
    if (index >= 358) level = 1 + (dayNumber % 4);
    if (index === 357) level = 0;
    return { date: date.toISOString().slice(0, 10), level, minutes: level * 9, sessions: Math.ceil(level / 2) };
  });
  return <LearningDashboard days={days} />;
}
