-- Profile edits (name, bio, age, location, occupation, avatar) now go through
-- the backend API (PATCH /api/auth/profile), which validates every field and
-- writes with the service role. Browsers using the anon/authenticated keys
-- can therefore no longer UPDATE profiles directly. Role changes and account
-- locking were already RPC-only (009/012, security definer).
revoke update on public.profiles from authenticated;
revoke update on public.profiles from anon;
drop policy if exists "profiles: user updates own display fields" on public.profiles;
