-- Public course teasers can be listed without exposing their chapters or lessons.
alter table public.courses
  drop constraint if exists courses_status_check;

alter table public.courses
  add constraint courses_status_check
  check (status in ('draft', 'upcoming', 'published', 'hidden'));

update public.courses
set status = 'upcoming'
where slug in ('shell-201', 'linux-security')
  and status = 'draft';

drop policy if exists "courses: published are readable, admin reads all"
  on public.courses;

create policy "courses: published and upcoming are readable, admin reads all"
  on public.courses for select
  using (status in ('published', 'upcoming') or public.is_admin());
