BEGIN;
SELECT plan(16);

SELECT is(
  (
    select prosecdef
    from pg_proc
    where oid = 'public.return_adoption(uuid, text, text)'::regprocedure
  ),
  true,
  'return_adoption runs as SECURITY DEFINER'
);

SELECT is(
  (
    select 'search_path=""' = any(proconfig)
    from pg_proc
    where oid = 'public.return_adoption(uuid, text, text)'::regprocedure
  ),
  true,
  'return_adoption has an empty search_path'
);

SELECT results_eq(
  $$
    select has_function_privilege(
      'authenticated',
      'public.return_adoption(uuid, text, text)',
      'EXECUTE'
    )
  $$,
  $$ values (true) $$,
  'authenticated may execute return_adoption'
);

SELECT results_eq(
  $$
    select has_function_privilege(
      'anon',
      'public.return_adoption(uuid, text, text)',
      'EXECUTE'
    )
  $$,
  $$ values (false) $$,
  'anon may not execute return_adoption'
);

-- Luna's active adoption has pending and completed follow-ups in the
-- deterministic fixture. Add two more historical states within this test so
-- the return preserves every non-pending state required by the contract.
INSERT INTO public.followups (id, shelter_id, adoption_id, due_date, status)
VALUES
  (
    'ffffffff-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000091',
    current_date - 2,
    'MISSED'
  ),
  (
    'ffffffff-0000-4000-8000-000000000302',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000091',
    current_date - 3,
    'RESCHEDULED'
  );

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}';

SELECT isnt(
  public.return_adoption(
    '00000000-0000-4000-8000-000000000091',
    'The adopter can no longer provide care.',
    'The animal arrived safely at the shelter.'
  ),
  null::uuid,
  'return_adoption returns the new adoption return id'
);

SELECT results_eq(
  $$
    select adoption_id, reason, notes, created_by_user_id, returned_at = created_at
    from public.adoption_returns
    where adoption_id = '00000000-0000-4000-8000-000000000091'
  $$,
  $$
    values (
      '00000000-0000-4000-8000-000000000091'::uuid,
      'The adopter can no longer provide care.'::text,
      'The animal arrived safely at the shelter.'::text,
      '00000000-0000-4000-8000-000000000103'::uuid,
      true
    )
  $$,
  'the RPC records the return with the authenticated actor and execution timestamp'
);

SELECT results_eq(
  $$
    select status
    from public.adoptions
    where id = '00000000-0000-4000-8000-000000000091'
  $$,
  $$ values ('RETURNED'::text) $$,
  'the active adoption becomes RETURNED'
);

SELECT results_eq(
  $$
    select status
    from public.animals
    where id = '00000000-0000-4000-8000-000000000011'
  $$,
  $$ values ('REEVALUATION'::text) $$,
  'the adopted animal becomes REEVALUATION'
);

SELECT results_eq(
  $$
    select status, cancelled_at is not null, cancellation_reason
    from public.followups
    where id = '00000000-0000-4000-8000-000000000113'
  $$,
  $$ values ('CANCELLED'::text, true, 'ADOPTION_RETURNED'::text) $$,
  'the pending follow-up is cancelled with return metadata'
);

SELECT results_eq(
  $$
    select array_agg(status order by id)
    from public.followups
    where adoption_id = '00000000-0000-4000-8000-000000000091'
      and id <> '00000000-0000-4000-8000-000000000113'
  $$,
  $$ values (array['COMPLETED', 'COMPLETED', 'MISSED', 'RESCHEDULED']::text[]) $$,
  'completed, rescheduled, and missed follow-ups remain unchanged'
);

SELECT results_eq(
  $$
    select array_agg(event_type order by event_type)
    from public.timeline_events
    where animal_id = '00000000-0000-4000-8000-000000000011'
      and event_type in ('ADOPTION_RETURNED', 'REEVALUATION_REQUIRED')
  $$,
  $$ values (array['ADOPTION_RETURNED', 'REEVALUATION_REQUIRED']::text[]) $$,
  'the RPC creates both return timeline events'
);

RESET ROLE;
RESET request.jwt.claims;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}';

SELECT throws_ok(
  $$
    select public.return_adoption(
      '00000000-0000-4000-8000-000000000092',
      'Attempt to return an already returned adoption.',
      null
    )
  $$,
  'P0001',
  'Adoption must be in ACTIVE status',
  'an adoption in an invalid state is rejected'
);

SELECT results_eq(
  $$
    select count(*)::int
    from public.adoption_returns
    where adoption_id = '00000000-0000-4000-8000-000000000092'
  $$,
  $$ values (1::int) $$,
  'an invalid-state rejection creates no additional return record'
);

RESET ROLE;
RESET request.jwt.claims;

-- This fixture row exists only to prove that the shelter boundary is checked
-- before a caller can operate on an adoption owned by another shelter.
INSERT INTO public.adoptions (id, shelter_id, animal_id, candidate_id, adoption_date, status)
VALUES (
  'ffffffff-0000-4000-8000-000000000303',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000021',
  '00000000-0000-4000-8000-000000000061',
  current_date,
  'ACTIVE'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}';

SELECT throws_ok(
  $$
    select public.return_adoption(
      'ffffffff-0000-4000-8000-000000000303',
      'Attempt to return another shelter adoption.',
      null
    )
  $$,
  'P0001',
  'Adoption is not available in the authenticated shelter',
  'an adoption from another shelter is rejected'
);

SELECT is(
  (
    select status
    from public.adoptions
    where id = 'ffffffff-0000-4000-8000-000000000303'
  ),
  null::text,
  'the authenticated shelter cannot observe the other adoption'
);

RESET ROLE;
RESET request.jwt.claims;

SELECT results_eq(
  $$
    select status
    from public.adoptions
    where id = 'ffffffff-0000-4000-8000-000000000303'
  $$,
  $$ values ('ACTIVE'::text) $$,
  'a cross-shelter rejection leaves the other adoption unchanged'
);

SELECT * FROM finish();
ROLLBACK;
