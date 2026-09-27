-- Thêm field hiển thị cho Account page (name/bio/avatar). role/is_locked/email
-- KHÔNG nằm trong các cột này — chỉ admin qua RPC (xem 009) mới đổi được.
alter table public.profiles
  add column if not exists name text,
  add column if not exists bio text,
  add column if not exists avatar_url text;

create policy "profiles: user updates own display fields"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Chặn ở tầng quyền cột: dù RLS cho qua theo hàng, authenticated chỉ được
-- phép UPDATE 3 cột này. Cố set role/is_locked/email qua update thẳng sẽ bị
-- Postgres từ chối trước khi RLS kịp can thiệp.
revoke update on public.profiles from authenticated;
grant update (name, bio, avatar_url) on public.profiles to authenticated;
