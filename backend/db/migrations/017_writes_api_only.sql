-- Content authoring, learning progress and practice-session bookkeeping now
-- go through the backend API (PUT/DELETE /api/progress/:lessonId,
-- /api/admin/*, POST /api/sessions), which validates every field and writes
-- with the service role. Browsers holding the anon/authenticated keys can
-- read (under RLS) but no longer INSERT/UPDATE/DELETE these tables directly.
-- admin_* RPCs are unchanged: they are security definer, check is_admin()
-- themselves and write admin_logs.
revoke insert, update, delete, truncate on public.courses from authenticated, anon;
revoke insert, update, delete, truncate on public.chapters from authenticated, anon;
revoke insert, update, delete, truncate on public.lessons from authenticated, anon;
revoke insert, update, delete, truncate on public.progress from authenticated, anon;
revoke insert, update, delete, truncate on public.practice_sessions from authenticated, anon;
revoke insert, update, delete, truncate on public.admin_logs from authenticated, anon;

drop policy if exists "courses: admin writes" on public.courses;
drop policy if exists "chapters: admin writes" on public.chapters;
drop policy if exists "lessons: admin writes" on public.lessons;
drop policy if exists "progress: user writes own rows for visible lessons" on public.progress;
drop policy if exists "progress: user updates own rows for visible lessons" on public.progress;
drop policy if exists "progress: user deletes own rows" on public.progress;
drop policy if exists "practice_sessions: user writes own active rows" on public.practice_sessions;
drop policy if exists "practice_sessions: user updates own active rows" on public.practice_sessions;

-- "for all" policies also granted SELECT to admins; keep that explicit.
drop policy if exists "courses: published and upcoming are readable, admin reads all" on public.courses;
create policy "courses: published and upcoming are readable, admin reads all"
  on public.courses for select
  using (status in ('published', 'upcoming') or public.is_admin());
