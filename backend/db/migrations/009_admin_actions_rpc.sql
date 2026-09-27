-- RPC cho hành động admin cần audit log + bảo vệ "admin hoạt động cuối cùng"
-- (rule.md yêu cầu). Đây là đường DUY NHẤT để đổi role/khoá tài khoản —
-- cột role/is_locked của profiles không cho authenticated UPDATE trực tiếp.

create or replace function public.admin_set_user_role(target uuid, new_role text, reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_current_role text;
  remaining_admins int;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if new_role not in ('learner', 'admin') then
    raise exception 'invalid role: %', new_role;
  end if;

  select role into target_current_role from public.profiles where id = target;
  if target_current_role is null then
    raise exception 'user not found';
  end if;

  if target_current_role = 'admin' and new_role = 'learner' then
    select count(*) into remaining_admins
    from public.profiles
    where role = 'admin' and not is_locked and id <> target;
    if remaining_admins = 0 then
      raise exception 'cannot demote the last active admin';
    end if;
  end if;

  update public.profiles set role = new_role where id = target;
  insert into public.admin_logs (actor_id, action, target_type, target_id, reason, result)
  values (auth.uid(), 'set_role:' || new_role, 'user', target, reason, 'ok');
end;
$$;

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
  insert into public.admin_logs (actor_id, action, target_type, target_id, reason, result)
  values (auth.uid(), case when locked then 'lock_user' else 'unlock_user' end, 'user', target, reason, 'ok');
end;
$$;

grant execute on function public.admin_set_user_role(uuid, text, text) to authenticated;
grant execute on function public.admin_set_user_lock(uuid, boolean, text) to authenticated;
