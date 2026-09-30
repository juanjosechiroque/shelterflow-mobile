-- Storage shelter isolation tests.
--
-- Proves that the `shelter-media` bucket is private and that the policies on
-- `storage.objects` confine every operation to the caller's own shelter prefix.
-- Cross-shelter access is denied, and anon has no access.
--
-- The test seeds cross-shelter fixture objects with RESET ROLE before switching
-- to the authenticated role, matching the pattern used in the domain RLS tests.
--
-- NOTE: Supabase installs a `protect_objects_delete` statement-level trigger on
-- `storage.objects` (`storage.protect_delete()`) that raises SQLSTATE 42501 on
-- any direct SQL DELETE unless the session GUC `storage.allow_delete_query` is
-- set to 'true'. This file sets that GUC once, inside the test transaction, so
-- the DELETE `USING` clause of `shelter_media_objects_delete` is exercised
-- directly instead of being masked by the trigger. Every negative write
-- assertion (cross-shelter UPDATE/DELETE, anon UPDATE/DELETE) is verified after
-- `RESET ROLE`, i.e. outside the attacking role's own SELECT policy, so a policy
-- widened to `USING (true)` cannot pass the check by hiding its own effect.

BEGIN;
SELECT plan(27);

-- Bypass the storage delete-protection trigger for this transaction only, so the
-- DELETE policy can be asserted directly. Scoped to the transaction; rolled back
-- with everything else.
SET LOCAL storage.allow_delete_query = 'true';

-- =====================================================================
-- 1. Bucket exists with the expected security posture.
-- =====================================================================

SELECT is(
  (select public from storage.buckets where id = 'shelter-media'),
  false,
  'shelter-media bucket is private'
);

SELECT is(
  (select file_size_limit from storage.buckets where id = 'shelter-media'),
  (10 * 1024 * 1024)::bigint,
  'shelter-media bucket enforces a 10 MiB size ceiling'
);

SELECT results_eq(
  $$ select allowed_mime_types from storage.buckets where id = 'shelter-media' $$,
  $$ values (array['image/jpeg', 'image/png', 'image/webp']::text[]) $$,
  'shelter-media bucket restricts uploads to image MIME types'
);

-- =====================================================================
-- 2. RLS is enabled on storage.objects (assert only, do not set).
-- =====================================================================

SELECT is(
  (select relrowsecurity from pg_class where oid = 'storage.objects'::regclass),
  true,
  'storage.objects has row-level security enabled'
);

-- =====================================================================
-- 2b. Write-policy predicates are the shelter-scoped predicate, not `true`.
--
-- Postgres applies the SELECT policy when locating rows for UPDATE and DELETE,
-- so a behavioural cross-shelter write test cannot, on its own, distinguish a
-- correct write predicate from one widened to `true` while SELECT stays scoped.
-- These structural checks close that gap: each fails if the named policy is
-- dropped (predicate becomes NULL) or widened to `true`.
-- =====================================================================

SELECT is(
  (select qual from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'shelter_media_objects_delete'),
  $q$((bucket_id = 'shelter-media'::text) AND ((storage.foldername(name))[1] = (auth_shelter_id())::text))$q$,
  'shelter_media_objects_delete USING is the shelter-scoped predicate'
);

SELECT is(
  (select qual from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'shelter_media_objects_update'),
  $q$((bucket_id = 'shelter-media'::text) AND ((storage.foldername(name))[1] = (auth_shelter_id())::text))$q$,
  'shelter_media_objects_update USING is the shelter-scoped predicate'
);

SELECT is(
  (select with_check from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'shelter_media_objects_update'),
  $q$((bucket_id = 'shelter-media'::text) AND ((storage.foldername(name))[1] = (auth_shelter_id())::text))$q$,
  'shelter_media_objects_update WITH CHECK is the shelter-scoped predicate'
);

-- =====================================================================
-- 3. Seed cross-shelter fixture objects outside any authenticated session.
-- =====================================================================

RESET ROLE;
RESET request.jwt.claims;

INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES (
  'shelter-media',
  '00000000-0000-4000-8000-000000000002/animals/00000000-0000-4000-8000-000000000021/fixture.jpg',
  '00000000-0000-4000-8000-000000000202',
  '{}'::jsonb
);

INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES (
  'shelter-media',
  '00000000-0000-4000-8000-000000000001/animals/00000000-0000-4000-8000-000000000011/fixture.jpg',
  '00000000-0000-4000-8000-000000000103',
  '{}'::jsonb
);

-- =====================================================================
-- 4. Shelter A can CRUD under its own prefix.
-- =====================================================================

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}';

INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES (
  'shelter-media',
  '00000000-0000-4000-8000-000000000001/animals/00000000-0000-4000-8000-000000000011/owned.jpg',
  '00000000-0000-4000-8000-000000000103',
  '{}'::jsonb
);

SELECT results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'shelter-media' and name = '00000000-0000-4000-8000-000000000001/animals/00000000-0000-4000-8000-000000000011/owned.jpg' $$,
  $$ values (1) $$,
  'shelter A can insert under its own prefix'
);

SELECT results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'shelter-media' and name = '00000000-0000-4000-8000-000000000001/animals/00000000-0000-4000-8000-000000000011/owned.jpg' $$,
  $$ values (1) $$,
  'shelter A can select its own object'
);

UPDATE storage.objects
   SET metadata = '{"updated": true}'::jsonb
 WHERE bucket_id = 'shelter-media'
   AND name = '00000000-0000-4000-8000-000000000001/animals/00000000-0000-4000-8000-000000000011/owned.jpg';

SELECT results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'shelter-media' and name = '00000000-0000-4000-8000-000000000001/animals/00000000-0000-4000-8000-000000000011/owned.jpg' and metadata->>'updated' = 'true' $$,
  $$ values (1) $$,
  'shelter A can update its own object'
);

DELETE FROM storage.objects
 WHERE bucket_id = 'shelter-media'
   AND name = '00000000-0000-4000-8000-000000000001/animals/00000000-0000-4000-8000-000000000011/owned.jpg';

RESET ROLE;
RESET request.jwt.claims;

-- Verified as superuser: the row is actually gone. Fails if the DELETE policy is
-- dropped (the delete would then affect zero rows and the object would remain).
SELECT results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'shelter-media' and name = '00000000-0000-4000-8000-000000000001/animals/00000000-0000-4000-8000-000000000011/owned.jpg' $$,
  $$ values (0) $$,
  'shelter A can delete its own object'
);

-- =====================================================================
-- 5. Shelter A cannot access Shelter B's prefix.
-- =====================================================================

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}';

SELECT throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values (
      'shelter-media',
      '00000000-0000-4000-8000-000000000002/animals/00000000-0000-4000-8000-000000000021/intrusion.jpg',
      '00000000-0000-4000-8000-000000000103',
      '{}'::jsonb
    )
  $$,
  '42501',
  null,
  'shelter A cannot insert under shelter B prefix'
);

SELECT results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'shelter-media' and name = '00000000-0000-4000-8000-000000000002/animals/00000000-0000-4000-8000-000000000021/fixture.jpg' $$,
  $$ values (0) $$,
  'shelter A cannot select shelter B object'
);

UPDATE storage.objects
   SET metadata = '{"hacked": true}'::jsonb
 WHERE bucket_id = 'shelter-media'
   AND name = '00000000-0000-4000-8000-000000000002/animals/00000000-0000-4000-8000-000000000021/fixture.jpg';

DELETE FROM storage.objects
 WHERE bucket_id = 'shelter-media'
   AND name = '00000000-0000-4000-8000-000000000002/animals/00000000-0000-4000-8000-000000000021/fixture.jpg';

RESET ROLE;
RESET request.jwt.claims;

-- Both checks run as superuser, outside shelter A's SELECT policy. The first
-- fails if the DELETE `USING` clause is widened to `true`; the second fails if
-- the UPDATE `USING`/`WITH CHECK` predicate is widened to `true`.
SELECT results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'shelter-media' and name = '00000000-0000-4000-8000-000000000002/animals/00000000-0000-4000-8000-000000000021/fixture.jpg' $$,
  $$ values (1) $$,
  'shelter A cannot delete shelter B object'
);

SELECT results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'shelter-media' and name = '00000000-0000-4000-8000-000000000002/animals/00000000-0000-4000-8000-000000000021/fixture.jpg' and metadata->>'hacked' = 'true' $$,
  $$ values (0) $$,
  'shelter A cannot update shelter B object'
);

-- =====================================================================
-- 6. Shelter B can CRUD under its own prefix.
-- =====================================================================

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000202","role":"authenticated"}';

INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES (
  'shelter-media',
  '00000000-0000-4000-8000-000000000002/animals/00000000-0000-4000-8000-000000000021/owned.jpg',
  '00000000-0000-4000-8000-000000000202',
  '{}'::jsonb
);

SELECT results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'shelter-media' and name = '00000000-0000-4000-8000-000000000002/animals/00000000-0000-4000-8000-000000000021/owned.jpg' $$,
  $$ values (1) $$,
  'shelter B can insert under its own prefix'
);

SELECT results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'shelter-media' and name = '00000000-0000-4000-8000-000000000002/animals/00000000-0000-4000-8000-000000000021/owned.jpg' $$,
  $$ values (1) $$,
  'shelter B can select its own object'
);

UPDATE storage.objects
   SET metadata = '{"updated": true}'::jsonb
 WHERE bucket_id = 'shelter-media'
   AND name = '00000000-0000-4000-8000-000000000002/animals/00000000-0000-4000-8000-000000000021/owned.jpg';

SELECT results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'shelter-media' and name = '00000000-0000-4000-8000-000000000002/animals/00000000-0000-4000-8000-000000000021/owned.jpg' and metadata->>'updated' = 'true' $$,
  $$ values (1) $$,
  'shelter B can update its own object'
);

DELETE FROM storage.objects
 WHERE bucket_id = 'shelter-media'
   AND name = '00000000-0000-4000-8000-000000000002/animals/00000000-0000-4000-8000-000000000021/owned.jpg';

RESET ROLE;
RESET request.jwt.claims;

SELECT results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'shelter-media' and name = '00000000-0000-4000-8000-000000000002/animals/00000000-0000-4000-8000-000000000021/owned.jpg' $$,
  $$ values (0) $$,
  'shelter B can delete its own object'
);

-- =====================================================================
-- 7. Shelter B cannot access Shelter A's prefix.
-- =====================================================================

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000202","role":"authenticated"}';

SELECT throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values (
      'shelter-media',
      '00000000-0000-4000-8000-000000000001/animals/00000000-0000-4000-8000-000000000011/intrusion.jpg',
      '00000000-0000-4000-8000-000000000202',
      '{}'::jsonb
    )
  $$,
  '42501',
  null,
  'shelter B cannot insert under shelter A prefix'
);

SELECT results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'shelter-media' and name = '00000000-0000-4000-8000-000000000001/animals/00000000-0000-4000-8000-000000000011/fixture.jpg' $$,
  $$ values (0) $$,
  'shelter B cannot select shelter A object'
);

UPDATE storage.objects
   SET metadata = '{"hacked": true}'::jsonb
 WHERE bucket_id = 'shelter-media'
   AND name = '00000000-0000-4000-8000-000000000001/animals/00000000-0000-4000-8000-000000000011/fixture.jpg';

DELETE FROM storage.objects
 WHERE bucket_id = 'shelter-media'
   AND name = '00000000-0000-4000-8000-000000000001/animals/00000000-0000-4000-8000-000000000011/fixture.jpg';

RESET ROLE;
RESET request.jwt.claims;

SELECT results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'shelter-media' and name = '00000000-0000-4000-8000-000000000001/animals/00000000-0000-4000-8000-000000000011/fixture.jpg' $$,
  $$ values (1) $$,
  'shelter B cannot delete shelter A object'
);

SELECT results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'shelter-media' and name = '00000000-0000-4000-8000-000000000001/animals/00000000-0000-4000-8000-000000000011/fixture.jpg' and metadata->>'hacked' = 'true' $$,
  $$ values (0) $$,
  'shelter B cannot update shelter A object'
);

-- =====================================================================
-- 8. Anon has no access to the bucket.
-- =====================================================================

SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims = '';

SELECT results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'shelter-media' $$,
  $$ values (0) $$,
  'anon cannot select from storage.objects'
);

SELECT throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values ('shelter-media', '00000000-0000-4000-8000-000000000001/animals/anon.jpg', '00000000-0000-4000-8000-000000000103', '{}'::jsonb)
  $$,
  '42501',
  null,
  'anon cannot insert into storage.objects'
);

-- Real UPDATE by anon, effect checked as superuser before anything else can
-- touch the row. `anon` holds the base table privileges but no policy on
-- `storage.objects` targets it, so RLS filters every row out.
UPDATE storage.objects
   SET metadata = '{"anon": true}'::jsonb
 WHERE bucket_id = 'shelter-media'
   AND name = '00000000-0000-4000-8000-000000000001/animals/00000000-0000-4000-8000-000000000011/fixture.jpg';

RESET ROLE;
RESET request.jwt.claims;

SELECT results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'shelter-media' and name = '00000000-0000-4000-8000-000000000001/animals/00000000-0000-4000-8000-000000000011/fixture.jpg' and metadata->>'anon' = 'true' $$,
  $$ values (0) $$,
  'anon cannot update storage.objects'
);

-- Real DELETE by anon, verified as superuser: the row is still there.
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims = '';

DELETE FROM storage.objects
 WHERE bucket_id = 'shelter-media'
   AND name = '00000000-0000-4000-8000-000000000001/animals/00000000-0000-4000-8000-000000000011/fixture.jpg';

RESET ROLE;
RESET request.jwt.claims;

SELECT results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'shelter-media' and name = '00000000-0000-4000-8000-000000000001/animals/00000000-0000-4000-8000-000000000011/fixture.jpg' $$,
  $$ values (1) $$,
  'anon cannot delete from storage.objects'
);

SELECT * FROM finish();
ROLLBACK;
