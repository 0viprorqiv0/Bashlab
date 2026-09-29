-- Hỗ trợ trang Users (14) và Activity (15).

-- Khoá tài khoản giờ chặn đăng nhập thật: đặt auth.users.banned_until để
-- Supabase Auth từ chối sign-in/refresh token, không chỉ đổi cờ is_locked.
create or replace function public.admin_set_user_lock(target uuid, locked boolean, reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role text;
  remaining_admins int;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if target = auth.uid() and locked then
    raise exception 'you cannot lock your own account';
  end if;

  select role into target_role from public.profiles where id = target;
  if target_role is null then
    raise exception 'user not found';
  end if;

  if locked and target_role = 'admin' then
    select count(*) into remaining_admins
    from public.profiles
    where role = 'admin' and not is_locked and id <> target;
    if remaining_admins = 0 then
      raise exception 'cannot lock the last active admin';
    end if;
  end if;

  update public.profiles set is_locked = locked where id = target;
  -- A finite date: Supabase Auth cannot parse 'infinity' and fails with a schema error.
  update auth.users set banned_until = case when locked then now() + interval '100 years' else null end where id = target;
  insert into public.admin_logs (actor_id, action, target_type, target_id, reason, result)
  values (auth.uid(), case when locked then 'lock_user' else 'unlock_user' end, 'user', target, reason, 'ok');
end;
$$;

-- Danh sách user cho admin: cần email_confirmed_at / last_sign_in_at nằm trong
-- auth.users (client không đọc được trực tiếp).
create or replace function public.admin_list_users(p_search text default '', p_limit int default 20, p_offset int default 0)
returns table (
  id uuid, email text, name text, role text, is_locked boolean,
  email_confirmed_at timestamptz, last_sign_in_at timestamptz, created_at timestamptz, total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  select p.id, p.email, p.name, p.role, p.is_locked,
         u.email_confirmed_at, u.last_sign_in_at, p.created_at,
         count(*) over () as total_count
  from public.profiles p
  join auth.users u on u.id = p.id
  where coalesce(p_search, '') = ''
     or p.email ilike '%' || p_search || '%'
     or coalesce(p.name, '') ilike '%' || p_search || '%'
  order by p.created_at desc
  limit greatest(1, least(p_limit, 100)) offset greatest(0, p_offset);
end;
$$;

-- Dừng phiên thực hành (lý do bắt buộc) + ghi admin_logs trong cùng transaction.
create or replace function public.admin_stop_session(p_session uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required';
  end if;
  update public.practice_sessions set status = 'stopped', last_active_at = now()
  where id = p_session and status = 'active';
  if not found then
    raise exception 'session not found or already stopped';
  end if;
  insert into public.admin_logs (actor_id, action, target_type, target_id, reason, result)
  values (auth.uid(), 'stop_session', 'session', p_session, p_reason, 'ok');
end;
$$;

grant execute on function public.admin_list_users(text, int, int) to authenticated;
grant execute on function public.admin_stop_session(uuid, text) to authenticated;
