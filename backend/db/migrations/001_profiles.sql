-- profiles: 1 dòng cho mỗi auth.users, giữ role và trạng thái khoá tài khoản.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'learner' check (role in ('learner', 'admin')),
  is_locked boolean not null default false,
  created_at timestamptz not null default now()
);

-- Tự tạo profile ngay khi có user mới đăng ký qua Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
