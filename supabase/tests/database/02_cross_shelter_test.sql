BEGIN;
SELECT plan(8);

SELECT throws_ok(
  $$
  insert into public.candidates (id, shelter_id, person_id, animal_id, status)
  values (
    'ffffffff-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000041',
    '00000000-0000-4000-8000-000000000011',
    'NEEDS_EVALUATION'
  )
  $$,
  '23503',
  null,
  'candidate with a person from another shelter is rejected'
);

SELECT throws_ok(
  $$
  insert into public.candidates (id, shelter_id, person_id, animal_id, status)
  values (
    'ffffffff-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000021',
    'NEEDS_EVALUATION'
  )
  $$,
  '23503',
  null,
  'candidate with an animal from another shelter is rejected'
);

SELECT throws_ok(
  $$
  insert into public.candidates (id, shelter_id, person_id, animal_id, status)
  values (
    'ffffffff-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000021',
    'NEEDS_EVALUATION'
  )
  $$,
  '23503',
  null,
  'candidate in shelter B with a person from shelter A is rejected'
);

SELECT throws_ok(
  $$
  insert into public.adoptions (id, shelter_id, animal_id, candidate_id, adoption_date, status)
  values (
    'ffffffff-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000021',
    '00000000-0000-4000-8000-000000000051',
    current_date,
    'ACTIVE'
  )
  $$,
  '23503',
  null,
  'adoption referencing an animal from another shelter is rejected'
);

SELECT throws_ok(
  $$
  insert into public.adoptions (id, shelter_id, animal_id, candidate_id, adoption_date, status)
  values (
    'ffffffff-0000-4000-8000-000000000005',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000013',
    '00000000-0000-4000-8000-000000000061',
    current_date,
    'ACTIVE'
  )
  $$,
  '23503',
  null,
  'adoption referencing a candidate from another shelter is rejected'
);

SELECT throws_ok(
  $$
  insert into public.timeline_events (id, shelter_id, animal_id, event_type, occurred_at)
  values (
    'ffffffff-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000011',
    'ANIMAL_READY',
    now()
  )
  $$,
  '23503',
  null,
  'timeline event in shelter B for an animal from shelter A is rejected'
);

SELECT throws_ok(
  $$
  insert into public.evaluations (id, shelter_id, candidate_id, overall_fit, recommendation, created_by_user_id)
  values (
    'ffffffff-0000-4000-8000-000000000007',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000053',
    'STRONG',
    'CONTINUE',
    '00000000-0000-4000-8000-000000000201'
  )
  $$,
  '23503',
  null,
  'an evaluation attributed to a user from another shelter is rejected'
);

SELECT throws_ok(
  $$
  insert into public.adoption_returns (id, shelter_id, adoption_id, returned_at, reason, created_by_user_id)
  values (
    'ffffffff-0000-4000-8000-000000000008',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000091',
    now(),
    'Cross-shelter attribution test',
    '00000000-0000-4000-8000-000000000201'
  )
  $$,
  '23503',
  null,
  'an adoption return attributed to a user from another shelter is rejected'
);

SELECT * FROM finish();
ROLLBACK;