-- Cây nội dung: courses -> chapters -> lessons. Dùng cho Screen 07,08,12,13.
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  level text,
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  title text not null,
  slug text not null,
  content_md text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  sort_order int not null default 0,
  objectives jsonb not null default '[]'::jsonb,
  test_template jsonb,
  created_at timestamptz not null default now(),
  unique (chapter_id, slug)
);

create index if not exists idx_chapters_course_id on public.chapters(course_id);
create index if not exists idx_lessons_chapter_id on public.lessons(chapter_id);
