BEGIN;
SELECT plan(14);

SELECT is(
  (
    select prosecdef
    from pg_proc
    where oid = 'public.complete_followup(uuid, text, text)'::regprocedure
  ),
  true,
  'complete_followup runs as SECURITY DEFINER'
);

SELECT is(
  (
    select 'search_path=""' = any(proconfig)
    from pg_proc
    where oid = 'public.complete_followup(uuid, text, text)'::regprocedure
  ),
  true,
  'complete_followup has an empty search_path'
);

SELECT results_eq(
  $$
    select has_function_privilege(
      'authenticated',
      'public.complete_followup(uuid, text, text)',
      'EXECUTE'
    )
  $$,
  $$ values (true) $$,
  'authenticated may execute complete_followup'
);

SELECT results_eq(
  $$
    select has_function_privilege(
      'anon',
      'public.complete_followup(uuid, text, text)',
      'EXECUTE'
    )
  $$,
  $$ values (false) $$,
  'anon may not execute complete_followup'
);

-- Establish a cross-shelter follow-up fixture before switching to the
-- authenticated primary shelter identity.
DO $$
BEGIN
  INSERT INTO public.adoptions (id, shelter_id, animal_id, candidate_id, adoption_date, status)
  VALUES (
    '00000000-0000-4000-8000-000000000402',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000021',
    '00000000-0000-4000-8000-000000000061',
    current_date,
    'ACTIVE'
  );

  INSERT INTO public.followups (id, shelter_id, adoption_id, due_date, status)
  VALUES (
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000402',
    current_date + 7,
    'PENDING'
  );
END;
$$;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}';

SELECT isnt(
  public.complete_followup(
    '00000000-0000-4000-8000-000000000113',
    'GOOD',
    'Luna is settling in well.'
  ),
  null::uuid,
  'complete_followup returns the follow-up id on success'
);

SELECT results_eq(
  $$
    select status, outcome, notes, completed_at is not null
    from public.followups
    where id = '00000000-0000-4000-8000-000000000113'
  $$,
  $$ values ('COMPLETED'::text, 'GOOD'::text, 'Luna is settling in well.'::text, true) $$,
  'the follow-up is marked completed with the provided outcome and notes'
);

SELECT results_eq(
  $$
    select count(*)::int
    from public.timeline_events
    where domain_record_type = 'followup'
      and domain_record_id = '00000000-0000-4000-8000-000000000113'
      and event_type = 'FOLLOW_UP_COMPLETED'
  $$,
  $$ values (1::int) $$,
  'a FOLLOW_UP_COMPLETED timeline event is recorded for the follow-up'
);

SELECT results_eq(
  $$
    select data->>'outcome'
    from public.timeline_events
    where domain_record_type = 'followup'
      and domain_record_id = '00000000-0000-4000-8000-000000000113'
      and event_type = 'FOLLOW_UP_COMPLETED'
  $$,
  $$ values ('GOOD'::text) $$,
  'the timeline event payload records the outcome'
);

SELECT throws_ok(
  $$
    select public.complete_followup(
      '00000000-0000-4000-8000-000000000114',
      'NOT_AN_OUTCOME',
      null
    )
  $$,
  'P0001',
  'Outcome must be one of EXCELLENT, GOOD, CONCERNS, INTERVENTION_REQUIRED',
  'an invalid outcome is rejected'
);

SELECT results_eq(
  $$
    select status
    from public.followups
    where id = '00000000-0000-4000-8000-000000000114'
  $$,
  $$ values ('COMPLETED'::text) $$,
  'an invalid outcome leaves the follow-up unchanged'
);

SELECT throws_ok(
  $$
    select public.complete_followup(
      '00000000-0000-4000-8000-000000000112',
      'EXCELLENT',
      null
    )
  $$,
  'P0001',
  'Follow-up must be in PENDING status',
  'a non-pending follow-up is rejected'
);

SELECT throws_ok(
  $$
    select public.complete_followup(
      '00000000-0000-4000-8000-000000000401',
      'GOOD',
      null
    )
  $$,
  'P0001',
  'Follow-up is not available in the authenticated shelter',
  'a follow-up from another shelter is rejected'
);

RESET ROLE;
RESET request.jwt.claims;

SELECT results_eq(
  $$
    select status
    from public.followups
    where id = '00000000-0000-4000-8000-000000000401'
  $$,
  $$ values ('PENDING'::text) $$,
  'a cross-shelter rejection leaves the follow-up unchanged'
);

-- A returned adoption cannot have follow-ups completed even when those
-- follow-ups are still pending, because the adoption is no longer ACTIVE.
DO $$
BEGIN
  INSERT INTO public.followups (id, shelter_id, adoption_id, due_date, status)
  VALUES (
    '00000000-0000-4000-8000-000000000403',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000092',
    current_date + 1,
    'PENDING'
  );
END;
$$;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}';

SELECT throws_ok(
  $$
    select public.complete_followup(
      '00000000-0000-4000-8000-000000000403',
      'GOOD',
      null
    )
  $$,
  'P0001',
  'Adoption must be in ACTIVE status',
  'a returned adoption prevents completing its follow-ups'
);

RESET ROLE;
RESET request.jwt.claims;

SELECT * FROM finish();
ROLLBACK;
