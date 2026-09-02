-- ShelterFlow Phase 5: authentication and Row Level Security.
--
-- This migration establishes the durable authorization boundary for V1:
--   * unauthenticated users have no access to public schema objects;
--   * an authenticated user may read their own profile, their shelter, and
--     domain rows whose `shelter_id` matches the shelter recorded on their
--     `public.profiles` row;
--   * direct mobile-client INSERT, UPDATE, and DELETE paths remain denied;
--     mutations will be introduced in later phases through dedicated atomic
--     PostgreSQL operations.
--
-- The migration does NOT create the login-capable users themselves; those are
-- inserted through `supabase/seed.sql` so that `supabase db reset` produces a
-- reproducible local environment with the same credentials each time.

-- =====================================================================
-- 1. Helper function: returns the authenticated user's shelter id.
--    SECURITY DEFINER bypasses RLS for this single-purpose read, which
--    prevents policy recursion on `public.profiles`. The function has
--    minimal privileges (only `authenticated` may EXECUTE it) and a
--    `search_path` set to '' so it cannot be redirected into an attacker
--    controlled schema.
-- =====================================================================

create or replace function public.auth_shelter_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.shelter_id
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke all on function public.auth_shelter_id() from public;
grant execute on function public.auth_shelter_id() to authenticated;

-- =====================================================================
-- 2. Revoke broad Data API privileges on existing public objects so that
--    access is controlled solely by the explicit grants and policies
--    defined below.
-- =====================================================================

revoke all on table public.shelters from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.animals from anon, authenticated;
revoke all on table public.people from anon, authenticated;
revoke all on table public.candidates from anon, authenticated;
revoke all on table public.evaluations from anon, authenticated;
revoke all on table public.meetings from anon, authenticated;
revoke all on table public.adoptions from anon, authenticated;
revoke all on table public.adoption_returns from anon, authenticated;
revoke all on table public.followups from anon, authenticated;
revoke all on table public.timeline_events from anon, authenticated;

-- Future public schema objects created by the migration/seed role do not
-- receive automatic grants to the Data API roles. Phase 6+ will GRANT
-- SELECT/EXECUTE explicitly when it introduces new tables or RPCs.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;

-- =====================================================================
-- 3. Enable RLS and grant read-only SELECT to authenticated on every
--    Phase 4 public table. Each policy uses `auth.uid()` for the profile
--    row and the SECURITY DEFINER helper for the shelter_id.
-- =====================================================================

-- ---- shelters ----
alter table public.shelters enable row level security;
alter table public.shelters force row level security;
grant select on table public.shelters to authenticated;
create policy "shelter_read_own"
  on public.shelters
  for select
  to authenticated
  using (id = public.auth_shelter_id());

-- ---- profiles ----
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
grant select on table public.profiles to authenticated;
create policy "profile_read_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

-- ---- animals ----
alter table public.animals enable row level security;
alter table public.animals force row level security;
grant select on table public.animals to authenticated;
create policy "animals_read_own_shelter"
  on public.animals
  for select
  to authenticated
  using (shelter_id = public.auth_shelter_id());

-- ---- people ----
alter table public.people enable row level security;
alter table public.people force row level security;
grant select on table public.people to authenticated;
create policy "people_read_own_shelter"
  on public.people
  for select
  to authenticated
  using (shelter_id = public.auth_shelter_id());

-- ---- candidates ----
alter table public.candidates enable row level security;
alter table public.candidates force row level security;
grant select on table public.candidates to authenticated;
create policy "candidates_read_own_shelter"
  on public.candidates
  for select
  to authenticated
  using (shelter_id = public.auth_shelter_id());

-- ---- evaluations ----
alter table public.evaluations enable row level security;
alter table public.evaluations force row level security;
grant select on table public.evaluations to authenticated;
create policy "evaluations_read_own_shelter"
  on public.evaluations
  for select
  to authenticated
  using (shelter_id = public.auth_shelter_id());

-- ---- meetings ----
alter table public.meetings enable row level security;
alter table public.meetings force row level security;
grant select on table public.meetings to authenticated;
create policy "meetings_read_own_shelter"
  on public.meetings
  for select
  to authenticated
  using (shelter_id = public.auth_shelter_id());

-- ---- adoptions ----
alter table public.adoptions enable row level security;
alter table public.adoptions force row level security;
grant select on table public.adoptions to authenticated;
create policy "adoptions_read_own_shelter"
  on public.adoptions
  for select
  to authenticated
  using (shelter_id = public.auth_shelter_id());

-- ---- adoption_returns ----
alter table public.adoption_returns enable row level security;
alter table public.adoption_returns force row level security;
grant select on table public.adoption_returns to authenticated;
create policy "adoption_returns_read_own_shelter"
  on public.adoption_returns
  for select
  to authenticated
  using (shelter_id = public.auth_shelter_id());

-- ---- followups ----
alter table public.followups enable row level security;
alter table public.followups force row level security;
grant select on table public.followups to authenticated;
create policy "followups_read_own_shelter"
  on public.followups
  for select
  to authenticated
  using (shelter_id = public.auth_shelter_id());

-- ---- timeline_events ----
alter table public.timeline_events enable row level security;
alter table public.timeline_events force row level security;
grant select on table public.timeline_events to authenticated;
create policy "timeline_events_read_own_shelter"
  on public.timeline_events
  for select
  to authenticated
  using (shelter_id = public.auth_shelter_id());
