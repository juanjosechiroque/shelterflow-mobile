BEGIN;
SELECT plan(17);

SELECT is(
  (
    select prosecdef
    from pg_proc
    where oid = 'public.complete_reevaluation(uuid, text)'::regprocedure
  ),
  true,
  'complete_reevaluation runs as SECURITY DEFINER'
);

SELECT is(
  (
    select 'search_path=""' = any(proconfig)
    from pg_proc
    where oid = 'public.complete_reevaluation(uuid, text)'::regprocedure
  ),
  true,
  'complete_reevaluation has an empty search_path'
);

SELECT results_eq(
  $$
    select has_function_privilege(
      'authenticated',
      'public.complete_reevaluation(uuid, text)',
      'EXECUTE'
    )
  $$,
  $$ values (true) $$,
  'authenticated may execute complete_reevaluation'
);

SELECT results_eq(
  $$
    select has_function_privilege(
      'anon',
      'public.complete_reevaluation(uuid, text)',
      'EXECUTE'
    )
  $$,
  $$ values (false) $$,
  'anon may not execute complete_reevaluation'
);

-- Prepare a cross-shelter animal fixture for isolation assertions before
-- switching to the authenticated primary shelter identity.
UPDATE public.animals
   SET status = 'REEVALUATION', updated_at = now()
 WHERE id = '00000000-0000-4000-8000-000000000021';

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}';

SELECT isnt(
  public.complete_reevaluation(
    '00000000-0000-4000-8000-000000000012',
    'READY'
  ),
  null::uuid,
  'complete_reevaluation returns the animal id on a successful transition'
);

SELECT results_eq(
  $$
    select status
    from public.animals
    where id = '00000000-0000-4000-8000-000000000012'
  $$,
  $$ values ('READY'::text) $$,
  'the animal moves from REEVALUATION to READY'
);

SELECT results_eq(
  $$
    select event_type
    from public.timeline_events
    where animal_id = '00000000-0000-4000-8000-000000000012'
      and event_type = 'ANIMAL_READY'
    order by occurred_at desc
    limit 1
  $$,
  $$ values ('ANIMAL_READY'::text) $$,
  'a new ANIMAL_READY timeline event is recorded for the reevaluation'
);

SELECT results_eq(
  $$
    select count(*)::int
    from public.timeline_events
    where animal_id = '00000000-0000-4000-8000-000000000012'
      and event_type = 'ANIMAL_READY'
  $$,
  $$ values (2::int) $$,
  'the reevaluation adds a second ANIMAL_READY timeline event alongside the original'
);

SELECT throws_ok(
  $$
    select public.complete_reevaluation(
      '00000000-0000-4000-8000-000000000014',
      'NOT_AVAILABLE'
    )
  $$,
  'P0001',
  'Animal must be in REEVALUATION status',
  'an animal that is not in REEVALUATION is rejected'
);

SELECT results_eq(
  $$
    select status
    from public.animals
    where id = '00000000-0000-4000-8000-000000000014'
  $$,
  $$ values ('READY'::text) $$,
  'a wrong-state rejection leaves the animal unchanged'
);

SELECT throws_ok(
  $$
    select public.complete_reevaluation(
      '00000000-0000-4000-8000-000000000013',
      'IN_PROCESS'
    )
  $$,
  'P0001',
  'Next status must be READY or NOT_AVAILABLE',
  'an invalid next status is rejected'
);

SELECT results_eq(
  $$
    select status
    from public.animals
    where id = '00000000-0000-4000-8000-000000000013'
  $$,
  $$ values ('IN_PROCESS'::text) $$,
  'an invalid next status leaves the animal unchanged'
);

SELECT throws_ok(
  $$
    select public.complete_reevaluation(
      '00000000-0000-4000-8000-000000000021',
      'NOT_AVAILABLE'
    )
  $$,
  'P0001',
  'Animal is not available in the authenticated shelter',
  'an animal from another shelter is rejected'
);

RESET ROLE;
RESET request.jwt.claims;

SELECT results_eq(
  $$
    select status
    from public.animals
    where id = '00000000-0000-4000-8000-000000000021'
  $$,
  $$ values ('REEVALUATION'::text) $$,
  'a cross-shelter rejection leaves the other shelter''s animal unchanged'
);

-- Move Luna back into REEVALUATION so we can exercise the NOT_AVAILABLE path
-- and the no-active-adoption precondition.
UPDATE public.animals
   SET status = 'REEVALUATION', updated_at = now()
 WHERE id = '00000000-0000-4000-8000-000000000012';

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}';

SELECT isnt(
  public.complete_reevaluation(
    '00000000-0000-4000-8000-000000000012',
    'NOT_AVAILABLE'
  ),
  null::uuid,
  'complete_reevaluation returns the animal id when moving to NOT_AVAILABLE'
);

SELECT results_eq(
  $$
    select status
    from public.animals
    where id = '00000000-0000-4000-8000-000000000012'
  $$,
  $$ values ('NOT_AVAILABLE'::text) $$,
  'the animal moves from REEVALUATION to NOT_AVAILABLE'
);

SELECT results_eq(
  $$
    select count(*)::int
    from public.timeline_events
    where animal_id = '00000000-0000-4000-8000-000000000012'
      and event_type = 'ANIMAL_NOT_AVAILABLE'
  $$,
  $$ values (1::int) $$,
  'a new ANIMAL_NOT_AVAILABLE timeline event is recorded'
);

SELECT * FROM finish();
ROLLBACK;
