-- Field còn thiếu để khớp Course Catalog (Screen 07): lọc theo category,
-- hiển thị thời lượng ước tính. Số chương/bài tính bằng count, không lưu cứng.
alter table public.courses
  add column if not exists category text,
  add column if not exists duration_minutes int;
