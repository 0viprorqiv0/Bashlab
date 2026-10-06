-- Upgrade admin_list_users to support database-level filtering by role and sorting
-- across the entire database, with accurate total_count for pagination.

drop function if exists public.admin_list_users(text, int, int);
drop function if exists public.admin_list_users(text, int, int, text, text);

create or replace function public.admin_list_users(
  p_search text default '',
  p_limit int default 20,
  p_offset int default 0,
  p_role text default 'all',
  p_sort text default 'recent'
)
returns table (
  id uuid,
  email text,
  name text,
  role text,
  is_locked boolean,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  completed_labs int,
  active_sessions int,
  total_count bigint
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
  select
    p.id,
    p.email,
    p.name,
    p.role,
    p.is_locked,
    u.email_confirmed_at,
    u.last_sign_in_at,
    p.created_at,
    coalesce((select count(*)::int from public.progress pr where pr.user_id = p.id and pr.status = 'done'), 0) as completed_labs,
    coalesce((select count(*)::int from public.practice_sessions ps where ps.user_id = p.id and ps.status = 'active'), 0) as active_sessions,
    count(*) over () as total_count
  from public.profiles p
  join auth.users u on u.id = p.id
  where (coalesce(trim(p_search), '') = ''
         or p.email ilike '%' || trim(p_search) || '%'
         or coalesce(p.name, '') ilike '%' || trim(p_search) || '%')
    and (coalesce(p_role, 'all') = 'all' or p.role = p_role)
  order by
    case when p_sort = 'recent' then u.last_sign_in_at end desc nulls last,
    case when p_sort = 'least_recent' then u.last_sign_in_at end asc nulls last,
    case when p_sort = 'name_asc' then lower(coalesce(nullif(trim(p.name), ''), p.email)) end asc,
    case when p_sort = 'labs_desc' then (select count(*)::int from public.progress pr where pr.user_id = p.id and pr.status = 'done') end desc,
    p.created_at desc
  limit greatest(1, least(p_limit, 100))
  offset greatest(0, p_offset);
end;
$$;

grant execute on function public.admin_list_users(text, int, int, text, text) to authenticated;
revoke execute on function public.admin_list_users(text, int, int, text, text) from public, anon;
