BEGIN;
SELECT plan(20);

SELECT throws_ok(
  $$
  insert into public.adoptions (id, shelter_id, animal_id, candidate_id, adoption_date, status)
  values (
    'ffffffff-0000-4000-8000-000000000010',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000051',
    current_date,
    'ACTIVE'
  )
  $$,
  '23505',
  null,
  'a second ACTIVE adoption for the same animal is rejected'
);

SELECT throws_ok(
  $$
  insert into public.adoption_returns (id, shelter_id, adoption_id, returned_at, reason)
  values (
    'ffffffff-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000092',
    now(),
    'Duplicate return'
  )
  $$,
  '23505',
  null,
  'a second adoption return for the same adoption is rejected'
);

SELECT throws_ok(
  $$
  insert into public.animals (id, shelter_id, name, species, sex, size, status)
  values (
    'ffffffff-0000-4000-8000-000000000012',
    '00000000-0000-4000-8000-000000000001',
    'Invalid',
    'BIRD',
    'MALE',
    'SMALL',
    'READY'
  )
  $$,
  '23514',
  null,
  'an invalid animal species is rejected'
);

SELECT throws_ok(
  $$
  insert into public.animals (id, shelter_id, name, species, sex, size, status)
  values (
    'ffffffff-0000-4000-8000-000000000013',
    '00000000-0000-4000-8000-000000000001',
    'Invalid',
    'DOG',
    'MALE',
    'SMALL',
    'RETURNED'
  )
  $$,
  '23514',
  null,
  'an invalid animal status is rejected'
);

SELECT throws_ok(
  $$
  insert into public.animals (id, shelter_id, name, species, sex, size, status, approximate_age_months)
  values (
    'ffffffff-0000-4000-8000-000000000014',
    '00000000-0000-4000-8000-000000000001',
    'Invalid',
    'DOG',
    'MALE',
    'SMALL',
    'READY',
    -3
  )
  $$,
  '23514',
  null,
  'a negative approximate age in months is rejected'
);

SELECT throws_ok(
  $$
  insert into public.candidates (id, shelter_id, person_id, animal_id, status)
  values (
    'ffffffff-0000-4000-8000-000000000015',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000011',
    'PENDING'
  )
  $$,
  '23514',
  null,
  'an invalid candidate status is rejected'
);

SELECT throws_ok(
  $$
  insert into public.candidates (id, shelter_id, person_id, animal_id, status)
  values (
    'ffffffff-0000-4000-8000-000000000016',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000011',
    'NEEDS_EVALUATION'
  )
  $$,
  '23505',
  null,
  'a second candidate process for the same person and animal is rejected'
);

SELECT throws_ok(
  $$
  insert into public.meetings (id, shelter_id, candidate_id, type, scheduled_at, status)
  values (
    'ffffffff-0000-4000-8000-000000000017',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000051',
    'PHONE_CALL',
    now(),
    'SCHEDULED'
  )
  $$,
  '23514',
  null,
  'an invalid meeting type is rejected'
);

SELECT throws_ok(
  $$
  insert into public.followups (id, shelter_id, adoption_id, due_date, status)
  values (
    'ffffffff-0000-4000-8000-000000000018',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000091',
    current_date,
    'OPEN'
  )
  $$,
  '23514',
  null,
  'an invalid follow-up status is rejected'
);

SELECT throws_ok(
  $$
  insert into public.followups (id, shelter_id, adoption_id, due_date, status, completed_at)
  values (
    'ffffffff-0000-4000-8000-000000000019',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000091',
    current_date,
    'PENDING',
    now()
  )
  $$,
  '23514',
  null,
  'a completed_at timestamp on a non-completed follow-up is rejected'
);

SELECT throws_ok(
  $$
  insert into public.adoptions (id, shelter_id, animal_id, candidate_id, adoption_date, status)
  values (
    'ffffffff-0000-4000-8000-000000000020',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000013',
    '00000000-0000-4000-8000-000000000055',
    current_date,
    'CLOSED'
  )
  $$,
  '23514',
  null,
  'an invalid adoption status is rejected'
);

SELECT throws_ok(
  $$
  insert into public.profiles (id, shelter_id, display_name, created_at, updated_at)
  values (
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000001',
    'Invalid Profile',
    now(),
    now() - interval '1 day'
  )
  $$,
  '23514',
  null,
  'a profile whose updated_at precedes created_at is rejected'
);

SELECT throws_ok(
  $$
  insert into public.adoptions (id, shelter_id, animal_id, candidate_id, adoption_date, status)
  values (
    'ffffffff-0000-4000-8000-000000000130',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000013',
    '00000000-0000-4000-8000-000000000056',
    current_date,
    'ACTIVE'
  )
  $$,
  '23503',
  null,
  'an adoption using a same-shelter candidate for a different animal is rejected'
);

SELECT throws_ok(
  $$
  insert into public.meetings (id, shelter_id, candidate_id, type, scheduled_at, status, rescheduled_from_meeting_id)
  values (
    'ffffffff-0000-4000-8000-000000000131',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000054',
    'HOME_VISIT',
    now(),
    'SCHEDULED',
    '00000000-0000-4000-8000-000000000081'
  )
  $$,
  '23503',
  null,
  'a meeting rescheduled from another candidate meeting in the same shelter is rejected'
);

SELECT throws_ok(
  $$
  insert into public.followups (id, shelter_id, adoption_id, due_date, status, rescheduled_from_followup_id)
  values (
    'ffffffff-0000-4000-8000-000000000132',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000091',
    current_date,
    'PENDING',
    '00000000-0000-4000-8000-000000000115'
  )
  $$,
  '23503',
  null,
  'a follow-up rescheduled from another adoption follow-up in the same shelter is rejected'
);

SELECT throws_ok(
  $$
  insert into public.meetings (id, shelter_id, candidate_id, type, scheduled_at, status, rescheduled_from_meeting_id)
  values (
    'ffffffff-0000-4000-8000-000000000133',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000051',
    'MEET_AND_GREET',
    now(),
    'SCHEDULED',
    'ffffffff-0000-4000-8000-000000000133'
  )
  $$,
  '23514',
  null,
  'a meeting rescheduled from itself is rejected'
);

SELECT throws_ok(
  $$
  insert into public.followups (id, shelter_id, adoption_id, due_date, status, rescheduled_from_followup_id)
  values (
    'ffffffff-0000-4000-8000-000000000134',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000091',
    current_date,
    'PENDING',
    'ffffffff-0000-4000-8000-000000000134'
  )
  $$,
  '23514',
  null,
  'a follow-up rescheduled from itself is rejected'
);

SELECT throws_ok(
  $$
  insert into public.followups (id, shelter_id, adoption_id, due_date, status)
  values (
    'ffffffff-0000-4000-8000-000000000135',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000091',
    current_date,
    'CANCELLED'
  )
  $$,
  '23514',
  null,
  'a cancelled follow-up without cancellation metadata is rejected'
);

SELECT throws_ok(
  $$
  insert into public.followups (id, shelter_id, adoption_id, due_date, status, cancelled_at, cancellation_reason)
  values (
    'ffffffff-0000-4000-8000-000000000136',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000091',
    current_date,
    'CANCELLED',
    now(),
    'Arbitrary reason'
  )
  $$,
  '23514',
  null,
  'a cancelled follow-up with an arbitrary cancellation reason is rejected'
);

SELECT throws_ok(
  $$
  insert into public.followups (id, shelter_id, adoption_id, due_date, status, cancelled_at, cancellation_reason)
  values (
    'ffffffff-0000-4000-8000-000000000137',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000091',
    current_date,
    'PENDING',
    now(),
    'ADOPTION_RETURNED'
  )
  $$,
  '23514',
  null,
  'a non-cancelled follow-up with cancellation metadata is rejected'
);

SELECT * FROM finish();
ROLLBACK;
