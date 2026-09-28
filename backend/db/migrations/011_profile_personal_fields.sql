-- Thêm field cá nhân cho form Edit Profile trên Account page (age/location/occupation).
-- Cùng cơ chế bảo vệ như 007: chỉ cho authenticated tự sửa field hiển thị của mình.
alter table public.profiles
  add column if not exists age int,
  add column if not exists location text,
  add column if not exists occupation text;

grant update (name, bio, avatar_url, age, location, occupation) on public.profiles to authenticated;
