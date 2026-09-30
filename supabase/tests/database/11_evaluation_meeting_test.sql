BEGIN;
SELECT plan(20);

SELECT is(
  (select prosecdef from pg_proc where oid = 'public.record_evaluation(uuid, text, text[], text[], text, text)'::regprocedure),
  true,
  'record_evaluation runs as SECURITY DEFINER'
);

SELECT is(
  (select prosecdef from pg_proc where oid = 'public.schedule_meeting(uuid, text, timestamptz, text)'::regprocedure),
  true,
  'schedule_meeting runs as SECURITY DEFINER'
);

SELECT is(
  (select prosecdef from pg_proc where oid = 'public.complete_meeting(uuid, text, text)'::regprocedure),
  true,
  'complete_meeting runs as SECURITY DEFINER'
);

SELECT results_eq(
  $$ select has_function_privilege('authenticated', 'public.record_evaluation(uuid, text, text[], text[], text, text)', 'EXECUTE') $$,
  $$ values (true) $$,
  'authenticated may execute record_evaluation'
);

SELECT results_eq(
  $$ select has_function_privilege('anon', 'public.schedule_meeting(uuid, text, timestamptz, text)', 'EXECUTE') $$,
  $$ values (false) $$,
  'anon may not execute schedule_meeting'
);

INSERT INTO public.animals (id, shelter_id, name, species, sex, size, status)
VALUES ('00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000001', 'Workflow fixture', 'DOG', 'FEMALE', 'MEDIUM', 'READY');

INSERT INTO public.people (id, shelter_id, name, phone)
VALUES ('00000000-0000-4000-8000-000000000902', '00000000-0000-4000-8000-000000000001', 'Workflow person', '+51 900 000 901');

INSERT INTO public.candidates (id, shelter_id, person_id, animal_id, status)
VALUES ('00000000-0000-4000-8000-000000000903', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000902', '00000000-0000-4000-8000-000000000901', 'NEEDS_EVALUATION');

-- A user from another shelter cannot record an evaluation on this candidate.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000202","role":"authenticated"}';

SELECT throws_ok(
  $$ select public.record_evaluation('00000000-0000-4000-8000-000000000903', 'STRONG', array[]::text[], array[]::text[], 'CONTINUE', null) $$,
  'P0001',
  'Candidate is not available in the authenticated shelter',
  'record_evaluation rejects a candidate outside the authenticated shelter'
);

RESET request.jwt.claims;
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}';

SELECT isnt(
  public.record_evaluation('00000000-0000-4000-8000-000000000903', 'STRONG', array['Prepared'], array[]::text[], 'CONTINUE', 'Private evaluation note'),
  null::uuid,
  'record_evaluation returns the evaluation id'
);

SELECT results_eq(
  $$ select status from public.candidates where id = '00000000-0000-4000-8000-000000000903' $$,
  $$ values ('EVALUATED'::text) $$,
  'record_evaluation advances the candidate'
);

SELECT results_eq(
  $$ select data is null from public.timeline_events where domain_record_type = 'evaluation' and domain_record_id = (select id from public.evaluations where candidate_id = '00000000-0000-4000-8000-000000000903') $$,
  $$ values (true) $$,
  'evaluation timeline event does not expose private content'
);

SELECT throws_ok(
  $$ select public.record_evaluation('00000000-0000-4000-8000-000000000903', 'STRONG', array[]::text[], array[]::text[], 'CONTINUE', null) $$,
  'P0001',
  'Candidate must be in NEEDS_EVALUATION status',
  'a second evaluation for the same candidate is rejected'
);

SELECT isnt(
  public.bridge_evaluated_to_contact_pending('00000000-0000-4000-8000-000000000903'),
  null::uuid,
  'the explicit contact transition succeeds'
);

SELECT results_eq(
  $$ select status from public.candidates where id = '00000000-0000-4000-8000-000000000903' $$,
  $$ values ('CONTACT_PENDING'::text) $$,
  'the explicit contact transition advances the candidate'
);

SELECT isnt(
  public.schedule_meeting('00000000-0000-4000-8000-000000000903', 'MEET_AND_GREET', now() + interval '2 days', 'Private scheduling note'),
  null::uuid,
  'schedule_meeting returns the meeting id'
);

SELECT results_eq(
  $$ select c.status, a.status from public.candidates c join public.animals a on a.id = c.animal_id where c.id = '00000000-0000-4000-8000-000000000903' $$,
  $$ values ('MEETING_SCHEDULED'::text, 'IN_PROCESS'::text) $$,
  'scheduling advances the candidate and animal atomically'
);

SELECT throws_ok(
  $$ select public.schedule_meeting('00000000-0000-4000-8000-000000000903', 'VISIT', now() + interval '3 days', null) $$,
  'P0001',
  'Candidate must be in CONTACT_PENDING status',
  'a second scheduled meeting is rejected'
);

SELECT isnt(
  public.complete_meeting((select id from public.meetings where candidate_id = '00000000-0000-4000-8000-000000000903'), 'GOOD', 'Private completion note'),
  null::uuid,
  'complete_meeting returns the meeting id'
);

SELECT results_eq(
  $$ select status, result, notes from public.meetings where candidate_id = '00000000-0000-4000-8000-000000000903' $$,
  $$ values ('COMPLETED'::text, 'GOOD'::text, 'Private completion note'::text) $$,
  'completion updates only the meeting record and preserves private notes there'
);

SELECT results_eq(
  $$ select data is null from public.timeline_events where domain_record_type = 'meeting' and domain_record_id = (select id from public.meetings where candidate_id = '00000000-0000-4000-8000-000000000903') and event_type = 'MEETING_COMPLETED' $$,
  $$ values (true) $$,
  'meeting completion timeline event does not expose notes'
);

SELECT throws_ok(
  $$ select public.complete_meeting((select id from public.meetings where candidate_id = '00000000-0000-4000-8000-000000000903'), 'GOOD', null) $$,
  'P0001',
  'Meeting must be in SCHEDULED status',
  'a second completion of the same meeting is rejected'
);

SELECT isnt(
  public.mark_decision_pending('00000000-0000-4000-8000-000000000903'),
  null::uuid,
  'decision advancement remains explicit after meeting completion'
);

RESET ROLE;
RESET request.jwt.claims;
SELECT * FROM finish();
ROLLBACK;
