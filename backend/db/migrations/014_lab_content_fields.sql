-- Field cho giao diện "Lab" mới của FE (danh sách bài kiểu LeetCode: category,
-- tag, difficulty, scenario, checklist steps, cú pháp lệnh, ví dụ, lời giải).
-- content_md/objectives cũ vẫn giữ nguyên cho các bài chưa migrate.
alter table public.lessons
  add column if not exists category text,
  add column if not exists tag text,
  add column if not exists difficulty text check (difficulty in ('Easy', 'Medium', 'Hard')),
  add column if not exists commands text[] not null default '{}',
  add column if not exists lab jsonb;

comment on column public.lessons.lab is
  'Rich lab content: { scenario, steps: [{id,text,targetCmd}], commandSyntax: [{cmd,desc}], examples: [{title,code,explanation}], hint, solutionExplanation }';
