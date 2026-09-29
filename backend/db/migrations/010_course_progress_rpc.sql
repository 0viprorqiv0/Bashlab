-- % tiến độ mỗi course cho user đang gọi, dùng chung cho Course Catalog (07)
-- và My Learning (09). SECURITY INVOKER (mặc định) — chạy bằng quyền người
-- gọi, lọc auth.uid() ngay trong query nên không cần bypass RLS.
create or replace function public.get_course_progress(p_course_id uuid)
returns table(total_lessons int, completed_lessons int)
language sql
stable
set search_path = public
as $$
  select
    count(l.id)::int as total_lessons,
    count(l.id) filter (where pr.status = 'done')::int as completed_lessons
  from public.chapters ch
  join public.lessons l on l.chapter_id = ch.id and l.status = 'published'
  left join public.progress pr on pr.lesson_id = l.id and pr.user_id = auth.uid()
  where ch.course_id = p_course_id;
$$;

grant execute on function public.get_course_progress(uuid) to authenticated;
