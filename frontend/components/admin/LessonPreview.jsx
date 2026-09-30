'use client';

import LessonInstructions from '@/components/learning/LessonInstructions';
import styles from './LessonEditor.module.css';

export default function LessonPreview({ lesson }) {
  return (
    <section className={styles.labPreview} aria-label="Lesson preview">
      <div className={styles.previewBar}><span>●</span> Student preview <span className={styles.previewDot} /> Terminal preview</div>
      <div className={styles.previewSplit}>
        <div className={styles.previewInstructions}><LessonInstructions lesson={lesson} preview /></div>
        <div className={styles.previewTerminal} aria-label="Preview terminal">
          <div className={styles.terminalBar}><i /><i /><i /></div>
          <pre>BashLab Cloud Shell v2.4 (Ubuntu 24.04 LTS x86_64){'\n'}Workspace: /home/learner/workspace{'\n'}Type "help" for a list of commands.{"\n\n"}<strong>learner@bashlab:~/workspace$</strong> type a bash command…</pre>
          <div className={styles.quickRun}>Quick Run: {(lesson.lesson_content?.commands || []).map((command) => <code key={command}>{command}</code>)}</div>
        </div>
      </div>
    </section>
  );
}
