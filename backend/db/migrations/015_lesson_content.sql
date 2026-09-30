-- One source of truth for lab content: lessons.lesson_content (contract v1 in
-- docs/plans/content-redesign/README.md). Before this, the learner pages read
-- the 014 columns (category/tag/difficulty/commands/lab) while the admin
-- editor/preview expected lesson_content, so edits never reached learners.
-- The 014 columns are kept (no drops) but are no longer read or written.

alter table public.lessons add column if not exists lesson_content jsonb;

comment on column public.lessons.lesson_content is
  'Structured lab content, contract v1: {version, short_objective, track, difficulty, tag, commands[], scenario, steps[{id,text,target_cmd?}], command_syntax[{command,description}], examples[{title,code,explanation}], hint, solution_explanation}. NULL = legacy Markdown lesson (content_md).';
comment on column public.lessons.category is 'DEPRECATED (015): use lesson_content.track';
comment on column public.lessons.tag is 'DEPRECATED (015): use lesson_content.tag';
comment on column public.lessons.difficulty is 'DEPRECATED (015): use lesson_content.difficulty';
comment on column public.lessons.commands is 'DEPRECATED (015): use lesson_content.commands';
comment on column public.lessons.lab is 'DEPRECATED (015): use lesson_content';

-- Backfill every lesson authored with the 014 lab shape. Step ids are kept so
-- nothing keyed on them changes; targetCmd becomes the optional target_cmd.
update public.lessons l
set lesson_content = jsonb_build_object(
  'version', 1,
  'short_objective', coalesce(l.objectives ->> 0, ''),
  'track', coalesce(l.category, ''),
  'difficulty', lower(coalesce(l.difficulty, '')),
  'tag', coalesce(l.tag, ''),
  'commands', to_jsonb(coalesce(l.commands, '{}'::text[])),
  'scenario', coalesce(l.lab ->> 'scenario', ''),
  'steps', coalesce((
    select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', s ->> 'id', 'text', coalesce(s ->> 'text', ''), 'target_cmd', s ->> 'targetCmd')) order by ord)
    from jsonb_array_elements(l.lab -> 'steps') with ordinality as t(s, ord)), '[]'::jsonb),
  'command_syntax', coalesce((
    select jsonb_agg(jsonb_build_object('command', coalesce(c ->> 'cmd', ''), 'description', coalesce(c ->> 'desc', '')) order by ord)
    from jsonb_array_elements(l.lab -> 'commandSyntax') with ordinality as t(c, ord)), '[]'::jsonb),
  'examples', coalesce((
    select jsonb_agg(jsonb_build_object('title', coalesce(e ->> 'title', ''), 'code', coalesce(e ->> 'code', ''), 'explanation', coalesce(e ->> 'explanation', '')) order by ord)
    from jsonb_array_elements(l.lab -> 'examples') with ordinality as t(e, ord)), '[]'::jsonb),
  'hint', coalesce(l.lab ->> 'hint', ''),
  'solution_explanation', coalesce(l.lab ->> 'solutionExplanation', '')
)
where l.lab is not null and l.lesson_content is null;

-- Validation lives in the database because the admin UI writes lessons
-- straight through Supabase (an Express-side check would not see it).
create or replace function public.validate_lesson_content(c jsonb, publishing boolean)
returns void
language plpgsql
immutable
set search_path = public
as $$
declare
  key text;
  item jsonb;
  step_ids text[] := '{}';
begin
  if c is null then return; end if;
  if jsonb_typeof(c) <> 'object' then raise exception 'lesson_content must be a JSON object' using errcode = '22023'; end if;
  if c -> 'version' is null or jsonb_typeof(c -> 'version') <> 'number' or (c ->> 'version')::numeric <> 1 then
    raise exception 'lesson_content.version must be 1' using errcode = '22023';
  end if;

  foreach key in array array['short_objective', 'track', 'difficulty', 'tag', 'scenario', 'hint', 'solution_explanation'] loop
    if jsonb_typeof(c -> key) is distinct from 'string' then
      raise exception 'lesson_content.% must be a string', key using errcode = '22023';
    end if;
  end loop;
  foreach key in array array['commands', 'steps', 'command_syntax', 'examples'] loop
    if jsonb_typeof(c -> key) is distinct from 'array' then
      raise exception 'lesson_content.% must be an array', key using errcode = '22023';
    end if;
  end loop;

  if c ->> 'difficulty' not in ('', 'easy', 'medium', 'hard') then
    raise exception 'lesson_content.difficulty must be easy, medium or hard' using errcode = '22023';
  end if;

  for item in select * from jsonb_array_elements(c -> 'commands') loop
    if jsonb_typeof(item) <> 'string' then raise exception 'lesson_content.commands must only contain strings' using errcode = '22023'; end if;
  end loop;

  for item in select * from jsonb_array_elements(c -> 'steps') loop
    if jsonb_typeof(item) <> 'object' or jsonb_typeof(item -> 'id') is distinct from 'string' or btrim(item ->> 'id') = ''
       or jsonb_typeof(item -> 'text') is distinct from 'string'
       or (item ? 'target_cmd' and jsonb_typeof(item -> 'target_cmd') <> 'string') then
      raise exception 'each lesson_content.steps item needs a non-empty string id and a string text' using errcode = '22023';
    end if;
    if (item ->> 'id') = any(step_ids) then
      raise exception 'duplicate step id "%" in lesson_content.steps', item ->> 'id' using errcode = '22023';
    end if;
    step_ids := step_ids || (item ->> 'id');
  end loop;

  for item in select * from jsonb_array_elements(c -> 'command_syntax') loop
    if jsonb_typeof(item -> 'command') is distinct from 'string' or jsonb_typeof(item -> 'description') is distinct from 'string' then
      raise exception 'each lesson_content.command_syntax row needs string command and description' using errcode = '22023';
    end if;
  end loop;
  for item in select * from jsonb_array_elements(c -> 'examples') loop
    if jsonb_typeof(item -> 'title') is distinct from 'string' or jsonb_typeof(item -> 'code') is distinct from 'string'
       or jsonb_typeof(item -> 'explanation') is distinct from 'string' then
      raise exception 'each lesson_content.examples row needs string title, code and explanation' using errcode = '22023';
    end if;
  end loop;

  if not publishing then return; end if;

  -- Publishing requires a lab a learner can actually follow.
  foreach key in array array['short_objective', 'track', 'difficulty', 'scenario'] loop
    if btrim(c ->> key) = '' then
      raise exception 'cannot publish: % is required', key using errcode = '22023';
    end if;
  end loop;
  if not exists (select 1 from jsonb_array_elements_text(c -> 'commands') v where btrim(v) <> '') then
    raise exception 'cannot publish: add at least one command' using errcode = '22023';
  end if;
  if not exists (select 1 from jsonb_array_elements(c -> 'steps') s where btrim(s ->> 'text') <> '') then
    raise exception 'cannot publish: add at least one step' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(c -> 'steps') s where btrim(s ->> 'text') = '') then
    raise exception 'cannot publish: every step needs text' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(c -> 'command_syntax') r where btrim(r ->> 'command') = '' or btrim(r ->> 'description') = '') then
    raise exception 'cannot publish: every command syntax row needs a command and a description' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(c -> 'examples') e where btrim(e ->> 'title') = '' or (e ->> 'code') = '') then
    raise exception 'cannot publish: every example needs a title and code' using errcode = '22023';
  end if;
end;
$$;

-- Slugs identify a lesson within a course in URLs (/courses/<course>/labs/<slug>),
-- but the old unique key is only (chapter_id, slug). Enforce course-wide
-- uniqueness here, serialized per course so two concurrent saves can't both pass.
create or replace function public.lessons_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_course uuid;
begin
  if new.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'slug may only contain lowercase letters, numbers and single hyphens' using errcode = '22023';
  end if;

  perform public.validate_lesson_content(new.lesson_content, new.status = 'published');

  if tg_op = 'INSERT' or new.slug is distinct from old.slug or new.chapter_id is distinct from old.chapter_id then
    select course_id into target_course from public.chapters where id = new.chapter_id;
    perform pg_advisory_xact_lock(hashtext('lesson-slug:' || target_course::text));
    if exists (
      select 1 from public.lessons l join public.chapters ch on ch.id = l.chapter_id
      where ch.course_id = target_course and l.slug = new.slug and l.id <> new.id
    ) then
      raise exception 'another lesson in this course already uses the slug "%"', new.slug using errcode = '23505';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists lessons_before_write on public.lessons;
create trigger lessons_before_write
  before insert or update on public.lessons
  for each row execute function public.lessons_before_write();

-- Security fix: 006 let anyone read a published lesson even when its course
-- was draft/hidden/upcoming (only the lesson's own status was checked), so a
-- direct /rest/v1/lessons query leaked unreleased content. Lessons are now
-- readable only when both the lesson and its course are published.
drop policy if exists "lessons: published are readable, admin reads all" on public.lessons;
create policy "lessons: readable when lesson and course are published, admin reads all"
  on public.lessons for select
  using (
    public.is_admin()
    or (
      status = 'published'
      and exists (
        select 1 from public.chapters ch
        join public.courses co on co.id = ch.course_id
        where ch.id = lessons.chapter_id and co.status = 'published'
      )
    )
  );

-- Progress may only point at lessons the learner can actually see; the
-- lessons RLS above applies inside this subquery.
drop policy if exists "progress: user writes own rows" on public.progress;
create policy "progress: user writes own rows for visible lessons"
  on public.progress for insert
  with check (user_id = auth.uid() and exists (select 1 from public.lessons where lessons.id = progress.lesson_id));

drop policy if exists "progress: user updates own rows" on public.progress;
create policy "progress: user updates own rows for visible lessons"
  on public.progress for update
  using (user_id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (user_id = auth.uid() and exists (select 1 from public.lessons where lessons.id = progress.lesson_id))
  );

-- Learners need to delete their own progress to un-tick a solved lab
-- (CourseDetail toggle); 006 never granted that, so un-ticking silently failed.
drop policy if exists "progress: user deletes own rows" on public.progress;
create policy "progress: user deletes own rows"
  on public.progress for delete
  using (user_id = auth.uid());

-- A learner could previously reopen a session an admin had stopped (any
-- update to their own row was allowed). Learners may now only touch sessions
-- that are still active, and only to keep them active or stop them.
drop policy if exists "practice_sessions: user updates own rows" on public.practice_sessions;
create policy "practice_sessions: user updates own active rows"
  on public.practice_sessions for update
  using ((user_id = auth.uid() and status = 'active') or public.is_admin())
  with check ((user_id = auth.uid() and status in ('active', 'stopped')) or public.is_admin());

drop policy if exists "practice_sessions: user writes own rows" on public.practice_sessions;
create policy "practice_sessions: user writes own active rows"
  on public.practice_sessions for insert
  with check (
    user_id = auth.uid() and status = 'active'
    and (lesson_id is null or exists (select 1 from public.lessons where lessons.id = practice_sessions.lesson_id))
  );
