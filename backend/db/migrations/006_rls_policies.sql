-- RLS cơ bản: learner chỉ thấy nội dung đã publish + dữ liệu của chính mình;
-- admin (chưa bị khoá) thấy và sửa mọi thứ. Hành động ghi có audit log
-- (đổi role, khoá user, dừng session) CHƯA có policy ở đây — để dành cho
-- quyết định RLS-vs-RPC sau, admin_logs vẫn chỉ service_role ghi được.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and not is_locked
  );
$$;

-- profiles: tự đọc chính mình hoặc admin đọc hết; chỉ admin được sửa
-- (learner chưa có trường nào của profiles để tự sửa ở giai đoạn này).
create policy "profiles: read own row or admin reads all"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles: admin can update any row"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- courses: ai đăng nhập cũng đọc được course đã publish; admin đọc/ghi hết.
create policy "courses: published are readable, admin reads all"
  on public.courses for select
  using (status = 'published' or public.is_admin());

create policy "courses: admin writes"
  on public.courses for all
  using (public.is_admin())
  with check (public.is_admin());

-- chapters: đọc được nếu course cha đã publish, hoặc là admin.
create policy "chapters: readable when parent course is published"
  on public.chapters for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.courses
      where courses.id = chapters.course_id and courses.status = 'published'
    )
  );

create policy "chapters: admin writes"
  on public.chapters for all
  using (public.is_admin())
  with check (public.is_admin());

-- lessons: đọc được nếu bài đã publish, hoặc là admin.
create policy "lessons: published are readable, admin reads all"
  on public.lessons for select
  using (status = 'published' or public.is_admin());

create policy "lessons: admin writes"
  on public.lessons for all
  using (public.is_admin())
  with check (public.is_admin());

-- progress: user chỉ thấy/ghi tiến độ của chính mình; admin thấy hết (Activity).
create policy "progress: own rows or admin reads all"
  on public.progress for select
  using (user_id = auth.uid() or public.is_admin());

create policy "progress: user writes own rows"
  on public.progress for insert
  with check (user_id = auth.uid());

create policy "progress: user updates own rows"
  on public.progress for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- practice_sessions: tương tự progress, phục vụ Activity (Screen 15) cho admin.
create policy "practice_sessions: own rows or admin reads all"
  on public.practice_sessions for select
  using (user_id = auth.uid() or public.is_admin());

create policy "practice_sessions: user writes own rows"
  on public.practice_sessions for insert
  with check (user_id = auth.uid());

create policy "practice_sessions: user updates own rows"
  on public.practice_sessions for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- admin_logs: chỉ admin đọc. KHÔNG có policy ghi — chỉ service_role (bypass
-- RLS) ghi được cho tới khi có quyết định RLS-vs-RPC.
create policy "admin_logs: admin reads"
  on public.admin_logs for select
  using (public.is_admin());
