-- Least privilege on what 017 did not cover.
-- 1) profiles: rows are created by the handle_new_user trigger and changed only
--    through the API / security-definer RPCs. TRUNCATE ignores RLS entirely, so
--    nobody holding the public keys should have it (nor INSERT/DELETE, which RLS
--    already denies, but defence in depth costs nothing).
revoke insert, delete, truncate on public.profiles from anon, authenticated;

-- 2) Security-definer functions are executable by PUBLIC by default.
--    handle_new_user is a trigger function: never callable by clients.
--    admin_* check is_admin() themselves, but anonymous visitors have no
--    business calling them at all. is_admin() stays callable: RLS policies
--    evaluate it for anon reads of published courses.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.admin_set_user_role(uuid, text, text) from public, anon;
revoke execute on function public.admin_set_user_lock(uuid, boolean, text) from public, anon;
revoke execute on function public.admin_stop_session(uuid, text) from public, anon;
revoke execute on function public.admin_list_users(text, int, int) from public, anon;
