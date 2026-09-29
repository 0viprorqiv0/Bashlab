-- Nhật ký quản trị (Screen 15, tab Admin log). Không lưu mật khẩu/token ở đây.
create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  reason text,
  result text not null default 'ok',
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_logs_created_at on public.admin_logs(created_at desc);
