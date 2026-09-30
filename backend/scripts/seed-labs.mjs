// Loads frontend/data/labsData.js into Supabase: 1 chapter per distinct
// category, 1 lesson per lab (category/tag/difficulty/commands/lab jsonb).
// Requires migration 014 applied first. Run: node backend/scripts/seed-labs.mjs
import { createClient } from '@supabase/supabase-js';
import { initialLabs } from '../../frontend/data/labsData.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const COURSE_SLUG = process.argv[2] || 'shell-101';

const { data: course, error: courseError } = await supabase
  .from('courses').select('id').eq('slug', COURSE_SLUG).single();
if (courseError) throw courseError;

const categories = [...new Set(initialLabs.map((lab) => lab.category))];
const { data: existingChapters } = await supabase
  .from('chapters').select('id, title, sort_order').eq('course_id', course.id);
let sortOrder = Math.max(0, ...(existingChapters || []).map((c) => c.sort_order));

const chapterIdByCategory = {};
for (const category of categories) {
  const found = existingChapters?.find((c) => c.title === category);
  if (found) {
    chapterIdByCategory[category] = found.id;
    continue;
  }
  sortOrder += 1;
  const { data, error } = await supabase
    .from('chapters').insert({ course_id: course.id, title: category, sort_order: sortOrder })
    .select('id').single();
  if (error) throw error;
  chapterIdByCategory[category] = data.id;
}

for (const [index, lab] of initialLabs.entries()) {
  const { error } = await supabase.from('lessons').upsert({
    chapter_id: chapterIdByCategory[lab.category],
    title: lab.title,
    slug: lab.slug,
    status: 'published',
    sort_order: index + 1,
    category: lab.category,
    tag: lab.tag,
    difficulty: lab.difficulty,
    commands: lab.commands,
    objectives: [lab.shortObjective],
    lab: {
      scenario: lab.scenario,
      steps: lab.steps,
      commandSyntax: lab.commandSyntax,
      examples: lab.examples,
      hint: lab.hint,
      solutionExplanation: lab.solutionExplanation,
    },
  }, { onConflict: 'chapter_id,slug' });
  if (error) throw error;
}

console.log(`Seeded ${initialLabs.length} labs across ${categories.length} chapters for "${COURSE_SLUG}".`);
