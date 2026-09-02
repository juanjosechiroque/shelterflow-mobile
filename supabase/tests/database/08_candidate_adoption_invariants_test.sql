BEGIN;
SELECT plan(14);

SELECT ok(
  to_regclass('public.adoptions_one_per_candidate_idx') is not null,
  'adoptions has a unique index for candidate_id'
);

SELECT is(
  (
    select count(*)::int
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('candidates', 'adoptions')
      and t.tgname like '%validate_%'
      and t.tgdeferrable
      and t.tginitdeferred
  ),
  5::int,
  'candidate and adoption consistency triggers are deferred until transaction validation'
);

-- Nala has no adoption in the fixture. The existing RPC changes the candidate
-- and creates its adoption in the same transaction, which the deferred
-- triggers must accept.
UPDATE public.candidates
SET status = 'DECISION_PENDING'
WHERE id = '00000000-0000-4000-8000-000000000055';

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}';

SELECT isnt(
  public.confirm_adoption(
    '00000000-0000-4000-8000-000000000055',
    current_date,
    null,
    array[current_date + 7]::date[]
  ),
  null::uuid,
  'confirm_adoption still succeeds with deferred candidate checks'
);

SELECT lives_ok(
  $$ set constraints all immediate $$,
  'confirm_adoption produces a consistent candidate and adoption pair'
);

SELECT isnt(
  public.return_adoption(
    (
      select id
      from public.adoptions
      where candidate_id = '00000000-0000-4000-8000-000000000055'
    ),
    'The adopter could not continue providing care.',
    null
  ),
  null::uuid,
  'return_adoption still succeeds after candidate adoption validation'
);

SELECT results_eq(
  $$
    select status
    from public.adoptions
    where candidate_id = '00000000-0000-4000-8000-000000000055'
  $$,
  $$ values ('RETURNED'::text) $$,
  'the returned adoption remains associated with its selected candidate'
);

RESET ROLE;
RESET request.jwt.claims;

SET CONSTRAINTS ALL DEFERRED;
SAVEPOINT selected_without_adoption;
UPDATE public.candidates
SET status = 'SELECTED'
WHERE id = '00000000-0000-4000-8000-000000000056';

SELECT throws_ok(
  $$ set constraints all immediate $$,
  '23514',
  'Selected candidate must have an adoption',
  'a selected candidate without an adoption fails transaction validation'
);

ROLLBACK TO SAVEPOINT selected_without_adoption;

SET CONSTRAINTS ALL DEFERRED;
SAVEPOINT adoption_with_unselected_candidate;
INSERT INTO public.adoptions (id, shelter_id, animal_id, candidate_id, adoption_date, status)
VALUES (
  'ffffffff-0000-4000-8000-000000000401',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000014',
  '00000000-0000-4000-8000-000000000056',
  current_date,
  'RETURNED'
);

SELECT throws_ok(
  $$ set constraints all immediate $$,
  '23514',
  'Adoption candidate must be SELECTED',
  'an adoption with an unselected candidate fails transaction validation'
);

ROLLBACK TO SAVEPOINT adoption_with_unselected_candidate;

INSERT INTO public.people (id, shelter_id, name, phone)
VALUES (
  'ffffffff-0000-4000-8000-000000000406',
  '00000000-0000-4000-8000-000000000001',
  'Reassignment Test Person',
  '+51 900 000 406'
);

SET CONSTRAINTS ALL DEFERRED;
INSERT INTO public.candidates (id, shelter_id, person_id, animal_id, status)
VALUES (
  'ffffffff-0000-4000-8000-000000000407',
  '00000000-0000-4000-8000-000000000001',
  'ffffffff-0000-4000-8000-000000000406',
  '00000000-0000-4000-8000-000000000015',
  'DECISION_PENDING'
);

SELECT throws_ok(
  $$
    insert into public.adoptions (id, shelter_id, animal_id, candidate_id, adoption_date, status)
    values (
      'ffffffff-0000-4000-8000-000000000402',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000011',
      '00000000-0000-4000-8000-000000000051',
      current_date,
      'RETURNED'
    )
  $$,
  '23505',
  null,
  'a candidate cannot have a second historical adoption'
);

INSERT INTO public.people (id, shelter_id, name, phone)
VALUES (
  'ffffffff-0000-4000-8000-000000000403',
  '00000000-0000-4000-8000-000000000001',
  'Invariant Test Person',
  '+51 900 000 403'
);

SET CONSTRAINTS ALL DEFERRED;
INSERT INTO public.candidates (id, shelter_id, person_id, animal_id, status)
VALUES (
  'ffffffff-0000-4000-8000-000000000404',
  '00000000-0000-4000-8000-000000000001',
  'ffffffff-0000-4000-8000-000000000403',
  '00000000-0000-4000-8000-000000000015',
  'SELECTED'
);

INSERT INTO public.adoptions (id, shelter_id, animal_id, candidate_id, adoption_date, status)
VALUES (
  'ffffffff-0000-4000-8000-000000000405',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000015',
  'ffffffff-0000-4000-8000-000000000404',
  current_date,
  'RETURNED'
);

SELECT lives_ok(
  $$ set constraints all immediate $$,
  'a selected candidate with one adoption is valid'
);

SET CONSTRAINTS ALL DEFERRED;
SAVEPOINT delete_only_adoption;
DELETE FROM public.adoptions
WHERE id = 'ffffffff-0000-4000-8000-000000000405';

SELECT throws_ok(
  $$ set constraints all immediate $$,
  '23514',
  'Selected candidate must have an adoption',
  'deleting the only adoption of a selected candidate fails transaction validation'
);

ROLLBACK TO SAVEPOINT delete_only_adoption;

SET CONSTRAINTS ALL DEFERRED;
SAVEPOINT reassign_only_adoption;
UPDATE public.adoptions
SET candidate_id = 'ffffffff-0000-4000-8000-000000000407'
WHERE id = 'ffffffff-0000-4000-8000-000000000405';

SELECT throws_ok(
  $$ set constraints all immediate $$,
  '23514',
  null,
  'reassigning the only adoption of a selected candidate fails transaction validation'
);

ROLLBACK TO SAVEPOINT reassign_only_adoption;

SELECT results_eq(
  $$
    select count(*)::int
    from public.candidates c
    where c.status = 'SELECTED'
      and not exists (
        select 1
        from public.adoptions a
        where a.candidate_id = c.id
      )
  $$,
  $$ values (0::int) $$,
  'the seed and test fixtures have no selected candidate without an adoption'
);

SELECT results_eq(
  $$
    select count(*)::int
    from public.adoptions a
    join public.candidates c on c.id = a.candidate_id
    where c.status <> 'SELECTED'
  $$,
  $$ values (0::int) $$,
  'the seed and test fixtures have no adoption with an unselected candidate'
);

SELECT * FROM finish();
ROLLBACK;
