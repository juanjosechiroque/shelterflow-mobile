BEGIN;
SELECT plan(9);

SELECT is(
  (select count(*)::int from public.shelters),
  2,
  'seed creates two shelters'
);

SELECT cmp_ok(
  (select count(*)::int from public.animals where shelter_id = '00000000-0000-4000-8000-000000000001'),
  '>=',
  5,
  'shelter A has a coherent set of animals'
);

SELECT cmp_ok(
  (select count(*)::int from public.candidates where shelter_id = '00000000-0000-4000-8000-000000000001'),
  '>=',
  5,
  'shelter A has a coherent set of candidates'
);

SELECT is(
  (select count(*)::int from public.adoptions),
  2,
  'seed creates one active and one returned adoption'
);

SELECT is(
  (select count(*)::int from public.adoption_returns),
  1,
  'seed creates exactly one adoption return'
);

SELECT is(
  (select count(*)::int from public.adoptions where status = 'ACTIVE'),
  1,
  'seed creates exactly one ACTIVE adoption'
);

SELECT is(
  (select count(*)::int
   from (
     select animal_id
     from public.adoptions
     where status = 'ACTIVE'
     group by animal_id
     having count(*) > 1
   ) duplicates),
  0,
  'seed has at most one ACTIVE adoption per animal'
);

SELECT is(
  (select count(*)::int
   from public.candidates c
   where c.status = 'SELECTED'
     and not exists (
       select 1 from public.adoptions a where a.candidate_id = c.id
     )),
  0,
  'every SELECTED candidate in the seed has a corresponding adoption'
);

SELECT is(
  (select count(*)::int
   from public.followups
   where adoption_id = '00000000-0000-4000-8000-000000000092'
     and status = 'CANCELLED'
     and cancelled_at is not null
     and cancellation_reason is not null),
  1,
  'the returned adoption has a cancelled pending follow-up with cancellation data'
);

SELECT * FROM finish();
ROLLBACK;