-- Dữ liệu mẫu cho môi trường dev/local, khớp đúng 3 course FE đang mock ở
-- frontend/components/courses/CourseCatalog.jsx. KHÔNG chạy trên project dùng
-- thật. Số chương/bài ở đây là placeholder để có dữ liệu test, không phải nội
-- dung cuối cùng — nội dung thật thuộc về Content admin (nhóm F).
insert into public.courses (slug, title, description, level, category, duration_minutes, status, sort_order)
values
  ('shell-101', 'Shell 101 — Bash Basics',
   'Master command line fundamentals from navigation and directory inspection to file manipulation, redirection, and text filters.',
   'beginner', 'Core Track', 150, 'published', 1),
  ('shell-201', 'Shell 201 — Pipelines & Streams',
   'Dive into standard streams (stdin, stdout, stderr), command chaining, exit codes, and building robust multi-stage data filters.',
   'intermediate', 'Core Track', 120, 'draft', 2),
  ('linux-security', 'Linux Permissions & Security',
   'Understand octal and symbolic permissions, sudo privilege boundaries, process inspection, and secure workspace hygiene.',
   'intermediate', 'Security', 90, 'draft', 3)
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
