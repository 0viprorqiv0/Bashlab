-- Course Catalog (Screen 07) has always had a "Coming next" teaser section
-- for not-yet-published courses, but the original courses SELECT policy
-- (006_rls_policies.sql) treated every non-published status the same —
-- anonymous/learner requests got zero rows back for 'draft' courses, so
-- that section could never actually render outside an admin session.
--
-- Split the two statuses instead of keeping them equivalent: 'draft' is now
-- a public teaser (title/description/category/level/duration only — this
-- policy is table-wide, but chapters/lessons stay admin-only regardless,
-- see 006's "chapters: readable when parent course is published", which is
-- unchanged and still requires status = 'published'). 'hidden' stays fully
-- blocked, as before.
drop policy if exists "courses: published are readable, admin reads all" on public.courses;

create policy "courses: published and draft are readable, admin reads all"
  on public.courses for select
  using (status in ('published', 'draft') or public.is_admin());
