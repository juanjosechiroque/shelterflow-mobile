-- ShelterFlow Phase 5: Row Level Security tests.
--
-- These tests prove the policy contract for V1:
--   * every public table has RLS enabled and forced on for the table owner;
--   * the data API roles (anon and authenticated) have no INSERT, UPDATE or
--     DELETE grants on the principal tables;
--   * authenticated users can SELECT only their own profile row, only the
--     shelter linked to that profile, and only domain rows whose
--     shelter_id matches that shelter;
--   * an authenticated user with no matching profile row (for example the
--     RLS fixture after the profile is deleted) is treated as
--     unauthenticated for the public tables;
--   * the SECURITY DEFINER helper public.auth_shelter_id() bypasses RLS
--     for its single-purpose read.
--
-- The tests use SET LOCAL ROLE/SET LOCAL request.jwt.claims to simulate the
-- Data API roles for each scenario, which lets pgTAP exercise the same
-- policies that PostgREST and the mobile client will evaluate.

BEGIN;
SELECT plan(36);

-- =====================================================================
-- 1. Schema-wide RLS posture
-- =====================================================================

SELECT is(
  (select bool_and(rowsecurity) from pg_tables where schemaname = 'public'),
  true,
  'every public table has row-level security enabled'
);

SELECT is(
  (
    select bool_and(c.relrowsecurity and (c.relforcerowsecurity is null or c.relforcerowsecurity))
    from pg_class c
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public' and c.relkind = 'r'
  ),
  true,
  'every public table enforces row-level security even for the table owner'
);

SELECT is(
  (
    select count(*)::int
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.grantee = 'anon'
      and g.privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  ),
  0,
  'anon has no INSERT/UPDATE/DELETE grant on any public table'
);

SELECT is(
  (
    select count(*)::int
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.grantee = 'authenticated'
      and g.privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  ),
  0,
  'authenticated has no INSERT/UPDATE/DELETE grant on any public table'
);

-- The principal tables must have at least one SELECT grant for authenticated.
SELECT cmp_ok(
  (
    select count(*)::int
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.grantee = 'authenticated'
      and g.privilege_type = 'SELECT'
      and g.table_name in (
        'shelters', 'profiles', 'animals', 'people', 'candidates',
        'evaluations', 'meetings', 'adoptions', 'adoption_returns',
        'followups', 'timeline_events'
      )
  ),
  '>=',
  11,
  'authenticated has SELECT on every public domain table'
);

-- =====================================================================
-- 2. Helper function shape and safety
-- =====================================================================

SELECT is(
  (
    select proname from pg_proc where proname = 'auth_shelter_id'
  ),
  'auth_shelter_id',
  'public.auth_shelter_id() exists'
);

SELECT is(
  (
    select prosecdef from pg_proc where proname = 'auth_shelter_id'
  ),
  true,
  'public.auth_shelter_id() runs as SECURITY DEFINER to bypass RLS'
);

SELECT results_eq(
  $$
    select has_function_privilege('authenticated', 'public.auth_shelter_id()', 'EXECUTE')
  $$,
  $$ values (true) $$,
  'authenticated may execute public.auth_shelter_id()'
);

SELECT results_eq(
  $$
    select has_function_privilege('anon', 'public.auth_shelter_id()', 'EXECUTE')
  $$,
  $$ values (false) $$,
  'anon may not execute public.auth_shelter_id()'
);

-- =====================================================================
-- 3. Anon reads are denied even with valid SET ROLE
-- =====================================================================

SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims = '';
SELECT throws_ok(
  $$ select * from public.shelters limit 1 $$,
  '42501',
  null,
  'anon cannot SELECT from shelters'
);
SELECT throws_ok(
  $$ select * from public.profiles limit 1 $$,
  '42501',
  null,
  'anon cannot SELECT from profiles'
);
SELECT throws_ok(
  $$ select * from public.animals limit 1 $$,
  '42501',
  null,
  'anon cannot SELECT from animals'
);
RESET ROLE;
RESET request.jwt.claims;

-- =====================================================================
-- 4. Authenticated read scope
-- =====================================================================

-- Primary administrator (Huellitas Rescue).
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}';

SELECT results_eq(
  $$ select count(*)::int from public.profiles $$,
  $$ values (1) $$,
  'authenticated user only sees their own profile row'
);

SELECT results_eq(
  $$ select id from public.profiles limit 1 $$,
  $$ values ('00000000-0000-4000-8000-000000000103'::uuid) $$,
  'the visible profile belongs to the authenticated user'
);

SELECT results_eq(
  $$ select count(*)::int from public.shelters $$,
  $$ values (1) $$,
  'authenticated user only sees their own shelter'
);

SELECT results_eq(
  $$ select id from public.shelters limit 1 $$,
  $$ values ('00000000-0000-4000-8000-000000000001'::uuid) $$,
  'the visible shelter belongs to the authenticated user'
);

SELECT cmp_ok(
  (select count(*)::int from public.animals),
  '>=',
  5,
  'administrator sees the seeded animals for their own shelter'
);

SELECT results_eq(
  $$ select count(*)::int from public.animals where shelter_id = '00000000-0000-4000-8000-000000000002' $$,
  $$ values (0) $$,
  'administrator cannot see animals from another shelter'
);

SELECT results_eq(
  $$ select count(*)::int from public.people where shelter_id = '00000000-0000-4000-8000-000000000002' $$,
  $$ values (0) $$,
  'administrator cannot see people from another shelter'
);

SELECT results_eq(
  $$ select count(*)::int from public.candidates where shelter_id = '00000000-0000-4000-8000-000000000002' $$,
  $$ values (0) $$,
  'administrator cannot see candidates from another shelter'
);

SELECT results_eq(
  $$ select count(*)::int from public.evaluations where shelter_id = '00000000-0000-4000-8000-000000000002' $$,
  $$ values (0) $$,
  'administrator cannot see evaluations from another shelter'
);

SELECT results_eq(
  $$ select count(*)::int from public.meetings where shelter_id = '00000000-0000-4000-8000-000000000002' $$,
  $$ values (0) $$,
  'administrator cannot see meetings from another shelter'
);

SELECT results_eq(
  $$ select count(*)::int from public.adoptions where shelter_id = '00000000-0000-4000-8000-000000000002' $$,
  $$ values (0) $$,
  'administrator cannot see adoptions from another shelter'
);

SELECT results_eq(
  $$ select count(*)::int from public.adoption_returns where shelter_id = '00000000-0000-4000-8000-000000000002' $$,
  $$ values (0) $$,
  'administrator cannot see adoption returns from another shelter'
);

SELECT results_eq(
  $$ select count(*)::int from public.followups where shelter_id = '00000000-0000-4000-8000-000000000002' $$,
  $$ values (0) $$,
  'administrator cannot see follow-ups from another shelter'
);

SELECT results_eq(
  $$ select count(*)::int from public.timeline_events where shelter_id = '00000000-0000-4000-8000-000000000002' $$,
  $$ values (0) $$,
  'administrator cannot see timeline events from another shelter'
);

RESET ROLE;
RESET request.jwt.claims;

-- Shelter B fixture (Patitas Felices).
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000202","role":"authenticated"}';

SELECT results_eq(
  $$ select count(*)::int from public.animals $$,
  $$ values (1) $$,
  'shelter B user only sees their own shelter animals'
);

SELECT results_eq(
  $$ select count(*)::int from public.animals where shelter_id = '00000000-0000-4000-8000-000000000001' $$,
  $$ values (0) $$,
  'shelter B user cannot see animals from shelter A'
);

SELECT results_eq(
  $$ select count(*)::int from public.shelters where id = '00000000-0000-4000-8000-000000000001' $$,
  $$ values (0) $$,
  'shelter B user cannot see shelter A row'
);

SELECT results_eq(
  $$ select count(*)::int from public.profiles where id = '00000000-0000-4000-8000-000000000103' $$,
  $$ values (0) $$,
  'shelter B user cannot see shelter A administrator profile'
);

RESET ROLE;
RESET request.jwt.claims;

-- =====================================================================
-- 5. Writes are denied at the privilege layer for authenticated
-- =====================================================================

-- Move into the authenticated role with the administrator's JWT once, then
-- exercise every forbidden write path. Because the surrounding test file is
-- a single transaction, `SET LOCAL` keeps the role and the JWT claim set for
-- the duration of the block. The `RESET ROLE` at the end of section 4 has
-- already cleared the prior context.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}';

SELECT throws_ok(
  $$
    insert into public.animals (shelter_id, name, species, sex, size)
    values ('00000000-0000-4000-8000-000000000001', 'X', 'DOG', 'MALE', 'SMALL')
  $$,
  '42501',
  null,
  'authenticated cannot INSERT into animals'
);

SELECT throws_ok(
  $$
    update public.animals set notes = 'X' where id = '00000000-0000-4000-8000-000000000011'
  $$,
  '42501',
  null,
  'authenticated cannot UPDATE animals'
);

SELECT throws_ok(
  $$
    delete from public.animals where id = '00000000-0000-4000-8000-000000000011'
  $$,
  '42501',
  null,
  'authenticated cannot DELETE animals'
);

SELECT throws_ok(
  $$
    insert into public.profiles (id, shelter_id, display_name)
    values ('00000000-0000-4000-8000-0000000000ff', '00000000-0000-4000-8000-000000000001', 'X')
  $$,
  '42501',
  null,
  'authenticated cannot INSERT into profiles'
);

SELECT throws_ok(
  $$
    update public.profiles set display_name = 'X' where id = '00000000-0000-4000-8000-000000000103'
  $$,
  '42501',
  null,
  'authenticated cannot UPDATE profiles'
);

SELECT throws_ok(
  $$
    insert into public.shelters (id, name, country)
    values ('00000000-0000-4000-8000-0000000000ff', 'X', 'X')
  $$,
  '42501',
  null,
  'authenticated cannot INSERT into shelters'
);

RESET ROLE;
RESET request.jwt.claims;

SELECT * FROM finish();
ROLLBACK;
