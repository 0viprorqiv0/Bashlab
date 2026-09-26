-- Tiến độ học (Screen 09,10) và phiên thực hành sandbox (nối với practice_sessions
-- không thay thế session UUID của sandboxRunner — bảng này chỉ ghi lại ai sở hữu
-- session nào để Activity (Screen 15) và quota theo user dùng được).
create table if not exists public.progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status text not null default 'locked' check (status in ('locked', 'in_progress', 'done')),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sandbox_session_id uuid,
  lesson_id uuid references public.lessons(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'stopped', 'expired')),
  started_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

create index if not exists idx_progress_lesson_id on public.progress(lesson_id);
create index if not exists idx_practice_sessions_user_id on public.practice_sessions(user_id);
