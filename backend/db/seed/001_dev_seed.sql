-- Dữ liệu mẫu cho môi trường dev/local. KHÔNG chạy trên project dùng thật.
-- Chạy tay khi cần dữ liệu để test Course Catalog/Overview mà chưa có Content UI.
insert into public.courses (slug, title, description, level, status, sort_order)
values ('shell-101', 'Shell 101', 'Nhập môn dòng lệnh Bash cho người mới.', 'beginner', 'published', 1)
on conflict (slug) do nothing;

insert into public.chapters (course_id, title, sort_order)
select id, 'Làm quen với Terminal', 1 from public.courses where slug = 'shell-101'
on conflict do nothing;

insert into public.lessons (chapter_id, title, slug, content_md, status, sort_order, objectives)
select c.id, 'Tạo file và thư mục đầu tiên', 'hello-bashlab',
  '# Hello BashLab\n\nDùng `mkdir` và `touch` để tạo file/thư mục.',
  'published', 1, '["Tạo được README.md", "Viết nội dung Hello BashLab vào file"]'::jsonb
from public.chapters c
join public.courses co on co.id = c.course_id
where co.slug = 'shell-101' and c.title = 'Làm quen với Terminal'
on conflict (chapter_id, slug) do nothing;
