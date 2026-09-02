BEGIN;
SELECT plan(18);

SELECT is(
  (
    select prosecdef
    from pg_proc
    where oid = 'public.confirm_adoption(uuid, date, text, date[])'::regprocedure
  ),
  true,
  'confirm_adoption runs as SECURITY DEFINER'
);

SELECT results_eq(
  $$
    select has_function_privilege(
      'authenticated',
      'public.confirm_adoption(uuid, date, text, date[])',
      'EXECUTE'
    )
  $$,
  $$ values (true) $$,
  'authenticated may execute confirm_adoption'
);

SELECT results_eq(
  $$
    select has_function_privilege(
      'anon',
      'public.confirm_adoption(uuid, date, text, date[])',
      'EXECUTE'
    )
  $$,
  $$ values (false) $$,
  'anon may not execute confirm_adoption'
);

-- Nala has no adoption in the deterministic fixture. Prepare the chosen
-- candidate and a second active candidate without changing seed data.
update public.candidates
set status = 'DECISION_PENDING'
where id = '00000000-0000-4000-8000-000000000055';

insert into public.candidates (id, shelter_id, person_id, animal_id, status)
values (
  'ffffffff-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000036',
  '00000000-0000-4000-8000-000000000013',
  'CONTACT_PENDING'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}';

SELECT isnt(
  public.confirm_adoption(
    '00000000-0000-4000-8000-000000000055',
    current_date,
    'Handover checklist completed.',
    array[current_date + 7, current_date + 30]::date[]
  ),
  null::uuid,
  'confirm_adoption returns the new adoption id'
);

SELECT results_eq(
  $$
    select status
    from public.adoptions
    where candidate_id = '00000000-0000-4000-8000-000000000055'
  $$,
  $$ values ('ACTIVE'::text) $$,
  'the RPC creates an ACTIVE adoption'
);

SELECT results_eq(
  $$
    select status
    from public.candidates
    where id = '00000000-0000-4000-8000-000000000055'
  $$,
  $$ values ('SELECTED'::text) $$,
  'the chosen candidate becomes SELECTED'
);

SELECT results_eq(
  $$
    select status
    from public.candidates
    where id = 'ffffffff-0000-4000-8000-000000000201'
  $$,
  $$ values ('NOT_SELECTED'::text) $$,
  'the other nonterminal candidate becomes NOT_SELECTED'
);

SELECT results_eq(
  $$
    select status
    from public.animals
    where id = '00000000-0000-4000-8000-000000000013'
  $$,
  $$ values ('ADOPTED'::text) $$,
  'the animal becomes ADOPTED'
);

SELECT results_eq(
  $$
    select count(*)::int
    from public.followups f
    join public.adoptions a on a.id = f.adoption_id
    where a.candidate_id = '00000000-0000-4000-8000-000000000055'
      and f.status = 'PENDING'
  $$,
  $$ values (2::int) $$,
  'the RPC creates one pending follow-up for each due date'
);

SELECT results_eq(
  $$
    select array_agg(f.due_date order by f.due_date)
    from public.followups f
    join public.adoptions a on a.id = f.adoption_id
    where a.candidate_id = '00000000-0000-4000-8000-000000000055'
  $$,
  $$ values (array[current_date + 7, current_date + 30]::date[]) $$,
  'the follow-ups preserve the requested due dates'
);

SELECT results_eq(
  $$
    select array_agg(event_type order by event_type)
    from public.timeline_events t
    join public.adoptions a on a.id = t.domain_record_id
    where a.candidate_id = '00000000-0000-4000-8000-000000000055'
      and t.domain_record_type = 'adoption'
  $$,
  $$ values (array['ADOPTION_CONFIRMED', 'FOLLOW_UPS_PLANNED']::text[]) $$,
  'the RPC creates both adoption timeline events'
);

SELECT throws_ok(
  $$
    select public.confirm_adoption(
      '00000000-0000-4000-8000-000000000056',
      current_date,
      null,
      array[current_date + 7]::date[]
    )
  $$,
  'P0001',
  'Candidate must be in DECISION_PENDING status',
  'a candidate in an invalid state is rejected'
);

SELECT results_eq(
  $$
    select count(*)::int
    from public.adoptions
    where candidate_id = '00000000-0000-4000-8000-000000000056'
  $$,
  $$ values (0::int) $$,
  'an invalid-state rejection creates no adoption'
);

SELECT results_eq(
  $$
    select status
    from public.candidates
    where id = '00000000-0000-4000-8000-000000000056'
  $$,
  $$ values ('EVALUATED'::text) $$,
  'an invalid-state rejection leaves the candidate unchanged'
);

RESET ROLE;
RESET request.jwt.claims;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}';

SELECT throws_ok(
  $$
    select public.confirm_adoption(
      '00000000-0000-4000-8000-000000000061',
      current_date,
      null,
      array[current_date + 7]::date[]
    )
  $$,
  'P0001',
  'Candidate is not available in the authenticated shelter',
  'a candidate from another shelter is rejected'
);

SELECT results_eq(
  $$
    select count(*)::int
    from public.adoptions
    where candidate_id = '00000000-0000-4000-8000-000000000061'
  $$,
  $$ values (0::int) $$,
  'a cross-shelter rejection creates no adoption'
);

SELECT is(
  (
    select status
    from public.candidates
    where id = '00000000-0000-4000-8000-000000000061'
  ),
  null::text,
  'the authenticated shelter cannot observe the other candidate'
);

RESET ROLE;
RESET request.jwt.claims;

SELECT results_eq(
  $$
    select status
    from public.candidates
    where id = '00000000-0000-4000-8000-000000000061'
  $$,
  $$ values ('NEEDS_EVALUATION'::text) $$,
  'a cross-shelter rejection leaves the other candidate unchanged'
);

SELECT * FROM finish();
ROLLBACK;
