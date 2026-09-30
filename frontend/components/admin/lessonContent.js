// lesson_content v1 helpers for the admin editor (contract:
// docs/plans/content-redesign/README.md). The database trigger in
// backend/db/migrations/015_lesson_content.sql is the authority; this mirror
// only exists so the admin sees a precise message before a round trip.

export function emptyLessonContent() {
  return {
    version: 1,
    short_objective: '',
    track: '',
    difficulty: '',
    tag: '',
    commands: [],
    scenario: '',
    steps: [],
    command_syntax: [],
    examples: [],
    hint: '',
    solution_explanation: '',
  };
}

export function newItemId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

const blank = (value) => !String(value ?? '').trim();

export function validateLessonContent(content, publishing) {
  const ids = content.steps.map((step) => step.id);
  if (new Set(ids).size !== ids.length) return 'Two steps share the same id — remove and re-add one of them.';
  if (!publishing) return null;
  if (blank(content.short_objective)) return 'Cannot publish: add a short objective.';
  if (blank(content.track)) return 'Cannot publish: add a track.';
  if (!content.difficulty) return 'Cannot publish: choose a difficulty.';
  if (blank(content.scenario)) return 'Cannot publish: write the mission scenario.';
  if (!content.commands.some((command) => !blank(command))) return 'Cannot publish: add at least one focus command.';
  if (!content.steps.length) return 'Cannot publish: add at least one step.';
  if (content.steps.some((step) => blank(step.text))) return 'Cannot publish: every step needs text.';
  if (content.command_syntax.some((row) => blank(row.command) || blank(row.description))) {
    return 'Cannot publish: every command syntax row needs a command and a description.';
  }
  if (content.examples.some((example) => blank(example.title) || example.code === '')) {
    return 'Cannot publish: every example needs a title and code.';
  }
  return null;
}
