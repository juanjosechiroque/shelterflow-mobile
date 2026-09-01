BEGIN;
SELECT plan(50);

SELECT is(
  (select count(*)::int from pg_tables where schemaname = 'public' and tablename = 'shelters'),
  1,
  'shelters table exists'
);
SELECT is(
  (select count(*)::int from pg_tables where schemaname = 'public' and tablename = 'profiles'),
  1,
  'profiles table exists'
);
SELECT is(
  (select count(*)::int from pg_tables where schemaname = 'public' and tablename = 'animals'),
  1,
  'animals table exists'
);
SELECT is(
  (select count(*)::int from pg_tables where schemaname = 'public' and tablename = 'people'),
  1,
  'people table exists'
);
SELECT is(
  (select count(*)::int from pg_tables where schemaname = 'public' and tablename = 'candidates'),
  1,
  'candidates table exists'
);
SELECT is(
  (select count(*)::int from pg_tables where schemaname = 'public' and tablename = 'evaluations'),
  1,
  'evaluations table exists'
);
SELECT is(
  (select count(*)::int from pg_tables where schemaname = 'public' and tablename = 'meetings'),
  1,
  'meetings table exists'
);
SELECT is(
  (select count(*)::int from pg_tables where schemaname = 'public' and tablename = 'adoptions'),
  1,
  'adoptions table exists'
);
SELECT is(
  (select count(*)::int from pg_tables where schemaname = 'public' and tablename = 'adoption_returns'),
  1,
  'adoption_returns table exists'
);
SELECT is(
  (select count(*)::int from pg_tables where schemaname = 'public' and tablename = 'followups'),
  1,
  'followups table exists'
);
SELECT is(
  (select count(*)::int from pg_tables where schemaname = 'public' and tablename = 'timeline_events'),
  1,
  'timeline_events table exists'
);

SELECT is(
  (select count(*)::int from pg_attribute a join pg_class c on a.attrelid = c.oid join pg_namespace n on c.relnamespace = n.oid where n.nspname = 'public' and c.relname = 'shelters' and a.attname = 'id' and not a.attisdropped),
  1,
  'shelters has id column'
);
SELECT is(
  (select count(*)::int from pg_attribute a join pg_class c on a.attrelid = c.oid join pg_namespace n on c.relnamespace = n.oid where n.nspname = 'public' and c.relname = 'shelters' and a.attname = 'name' and not a.attisdropped),
  1,
  'shelters has name column'
);
SELECT is(
  (select count(*)::int from pg_attribute a join pg_class c on a.attrelid = c.oid join pg_namespace n on c.relnamespace = n.oid where n.nspname = 'public' and c.relname = 'shelters' and a.attname = 'country' and not a.attisdropped),
  1,
  'shelters has country column'
);
SELECT is(
  (select count(*)::int from pg_attribute a join pg_class c on a.attrelid = c.oid join pg_namespace n on c.relnamespace = n.oid where n.nspname = 'public' and c.relname = 'profiles' and a.attname = 'id' and not a.attisdropped),
  1,
  'profiles has id column'
);
SELECT is(
  (select count(*)::int from pg_attribute a join pg_class c on a.attrelid = c.oid join pg_namespace n on c.relnamespace = n.oid where n.nspname = 'public' and c.relname = 'profiles' and a.attname = 'shelter_id' and not a.attisdropped),
  1,
  'profiles has shelter_id column'
);
SELECT is(
  (select count(*)::int from pg_attribute a join pg_class c on a.attrelid = c.oid join pg_namespace n on c.relnamespace = n.oid where n.nspname = 'public' and c.relname = 'animals' and a.attname = 'primary_photo_path' and not a.attisdropped),
  1,
  'animals has primary_photo_path column'
);
SELECT is(
  (select count(*)::int from pg_attribute a join pg_class c on a.attrelid = c.oid join pg_namespace n on c.relnamespace = n.oid where n.nspname = 'public' and c.relname = 'animals' and a.attname = 'status' and not a.attisdropped),
  1,
  'animals has status column'
);
SELECT is(
  (select count(*)::int from pg_attribute a join pg_class c on a.attrelid = c.oid join pg_namespace n on c.relnamespace = n.oid where n.nspname = 'public' and c.relname = 'people' and a.attname = 'name' and not a.attisdropped),
  1,
  'people has name column'
);
SELECT is(
  (select count(*)::int from pg_attribute a join pg_class c on a.attrelid = c.oid join pg_namespace n on c.relnamespace = n.oid where n.nspname = 'public' and c.relname = 'candidates' and a.attname = 'person_id' and not a.attisdropped),
  1,
  'candidates has person_id column'
);
SELECT is(
  (select count(*)::int from pg_attribute a join pg_class c on a.attrelid = c.oid join pg_namespace n on c.relnamespace = n.oid where n.nspname = 'public' and c.relname = 'candidates' and a.attname = 'animal_id' and not a.attisdropped),
  1,
  'candidates has animal_id column'
);
SELECT is(
  (select count(*)::int from pg_attribute a join pg_class c on a.attrelid = c.oid join pg_namespace n on c.relnamespace = n.oid where n.nspname = 'public' and c.relname = 'evaluations' and a.attname = 'overall_fit' and not a.attisdropped),
  1,
  'evaluations has overall_fit column'
);
SELECT is(
  (select count(*)::int from pg_attribute a join pg_class c on a.attrelid = c.oid join pg_namespace n on c.relnamespace = n.oid where n.nspname = 'public' and c.relname = 'evaluations' and a.attname = 'recommendation' and not a.attisdropped),
  1,
  'evaluations has recommendation column'
);
SELECT is(
  (select count(*)::int from pg_attribute a join pg_class c on a.attrelid = c.oid join pg_namespace n on c.relnamespace = n.oid where n.nspname = 'public' and c.relname = 'meetings' and a.attname = 'scheduled_at' and not a.attisdropped),
  1,
  'meetings has scheduled_at column'
);
SELECT is(
  (select count(*)::int from pg_attribute a join pg_class c on a.attrelid = c.oid join pg_namespace n on c.relnamespace = n.oid where n.nspname = 'public' and c.relname = 'adoptions' and a.attname = 'adoption_photo_path' and not a.attisdropped),
  1,
  'adoptions has adoption_photo_path column'
);
SELECT is(
  (select count(*)::int from pg_attribute a join pg_class c on a.attrelid = c.oid join pg_namespace n on c.relnamespace = n.oid where n.nspname = 'public' and c.relname = 'adoption_returns' and a.attname = 'reason' and not a.attisdropped),
  1,
  'adoption_returns has reason column'
);
SELECT is(
  (select count(*)::int from pg_attribute a join pg_class c on a.attrelid = c.oid join pg_namespace n on c.relnamespace = n.oid where n.nspname = 'public' and c.relname = 'followups' and a.attname = 'due_date' and not a.attisdropped),
  1,
  'followups has due_date column'
);
SELECT is(
  (select count(*)::int from pg_attribute a join pg_class c on a.attrelid = c.oid join pg_namespace n on c.relnamespace = n.oid where n.nspname = 'public' and c.relname = 'followups' and a.attname = 'cancelled_at' and not a.attisdropped),
  1,
  'followups has cancelled_at column'
);
SELECT is(
  (select count(*)::int from pg_attribute a join pg_class c on a.attrelid = c.oid join pg_namespace n on c.relnamespace = n.oid where n.nspname = 'public' and c.relname = 'followups' and a.attname = 'cancellation_reason' and not a.attisdropped),
  1,
  'followups has cancellation_reason column'
);
SELECT is(
  (select count(*)::int from pg_attribute a join pg_class c on a.attrelid = c.oid join pg_namespace n on c.relnamespace = n.oid where n.nspname = 'public' and c.relname = 'timeline_events' and a.attname = 'occurred_at' and not a.attisdropped),
  1,
  'timeline_events has occurred_at column'
);

SELECT is(
  (select format_type(a.atttypid, a.atttypmod)
   from pg_attribute a
   join pg_class c on a.attrelid = c.oid
   join pg_namespace n on c.relnamespace = n.oid
   where n.nspname = 'public' and c.relname = 'animals' and a.attname = 'species'),
  'text',
  'animals.species is text'
);

SELECT is(
  (select format_type(a.atttypid, a.atttypmod)
   from pg_attribute a
   join pg_class c on a.attrelid = c.oid
   join pg_namespace n on c.relnamespace = n.oid
   where n.nspname = 'public' and c.relname = 'animals' and a.attname = 'approximate_age_months'),
  'integer',
  'animals.approximate_age_months is integer'
);

SELECT is(
  (select format_type(a.atttypid, a.atttypmod)
   from pg_attribute a
   join pg_class c on a.attrelid = c.oid
   join pg_namespace n on c.relnamespace = n.oid
   where n.nspname = 'public' and c.relname = 'animals' and a.attname = 'created_at'),
  'timestamp with time zone',
  'animals.created_at is timestamptz'
);

SELECT is(
  (select format_type(a.atttypid, a.atttypmod)
   from pg_attribute a
   join pg_class c on a.attrelid = c.oid
   join pg_namespace n on c.relnamespace = n.oid
   where n.nspname = 'public' and c.relname = 'followups' and a.attname = 'due_date'),
  'date',
  'followups.due_date is date'
);

SELECT is(
  (select format_type(a.atttypid, a.atttypmod)
   from pg_attribute a
   join pg_class c on a.attrelid = c.oid
   join pg_namespace n on c.relnamespace = n.oid
   where n.nspname = 'public' and c.relname = 'adoptions' and a.attname = 'adoption_date'),
  'date',
  'adoptions.adoption_date is date'
);

SELECT is(
  (select format_type(a.atttypid, a.atttypmod)
   from pg_attribute a
   join pg_class c on a.attrelid = c.oid
   join pg_namespace n on c.relnamespace = n.oid
   where n.nspname = 'public' and c.relname = 'meetings' and a.attname = 'scheduled_at'),
  'timestamp with time zone',
  'meetings.scheduled_at is timestamptz'
);

SELECT is(
  (select format_type(a.atttypid, a.atttypmod)
   from pg_attribute a
   join pg_class c on a.attrelid = c.oid
   join pg_namespace n on c.relnamespace = n.oid
   where n.nspname = 'public' and c.relname = 'evaluations' and a.attname = 'positive_factors'),
  'text[]',
  'evaluations.positive_factors is a text array'
);

SELECT is(
  (select format_type(a.atttypid, a.atttypmod)
   from pg_attribute a
   join pg_class c on a.attrelid = c.oid
   join pg_namespace n on c.relnamespace = n.oid
   where n.nspname = 'public' and c.relname = 'evaluations' and a.attname = 'concerns'),
  'text[]',
  'evaluations.concerns is a text array'
);

SELECT is(
  (select a.attnotnull
   from pg_attribute a
   join pg_class c on a.attrelid = c.oid
   join pg_namespace n on c.relnamespace = n.oid
   where n.nspname = 'public' and c.relname = 'animals' and a.attname = 'shelter_id'),
  true,
  'animals.shelter_id is not null'
);

SELECT is(
  (select a.attnotnull
   from pg_attribute a
   join pg_class c on a.attrelid = c.oid
   join pg_namespace n on c.relnamespace = n.oid
   where n.nspname = 'public' and c.relname = 'animals' and a.attname = 'species'),
  true,
  'animals.species is not null'
);

SELECT is(
  (select a.attnotnull
   from pg_attribute a
   join pg_class c on a.attrelid = c.oid
   join pg_namespace n on c.relnamespace = n.oid
   where n.nspname = 'public' and c.relname = 'candidates' and a.attname = 'shelter_id'),
  true,
  'candidates.shelter_id is not null'
);

SELECT is(
  (select a.attnotnull
   from pg_attribute a
   join pg_class c on a.attrelid = c.oid
   join pg_namespace n on c.relnamespace = n.oid
   where n.nspname = 'public' and c.relname = 'adoptions' and a.attname = 'shelter_id'),
  true,
  'adoptions.shelter_id is not null'
);

SELECT is(
  (select a.attnotnull
   from pg_attribute a
   join pg_class c on a.attrelid = c.oid
   join pg_namespace n on c.relnamespace = n.oid
   where n.nspname = 'public' and c.relname = 'followups' and a.attname = 'adoption_id'),
  true,
  'followups.adoption_id is not null'
);

SELECT is(
  (select count(*)::int from pg_indexes where schemaname = 'public' and tablename = 'adoptions' and indexname = 'adoptions_one_active_per_animal_idx'),
  1,
  'adoptions_one_active_per_animal_idx index exists'
);
SELECT is(
  (select count(*)::int from pg_indexes where schemaname = 'public' and tablename = 'adoption_returns' and indexname = 'adoption_returns_one_per_adoption_idx'),
  1,
  'adoption_returns_one_per_adoption_idx index exists'
);
SELECT is(
  (select count(*)::int from pg_indexes where schemaname = 'public' and tablename = 'animals' and indexname = 'animals_shelter_status_idx'),
  1,
  'animals_shelter_status_idx index exists'
);
SELECT is(
  (select count(*)::int from pg_indexes where schemaname = 'public' and tablename = 'followups' and indexname = 'followups_shelter_status_due_date_idx'),
  1,
  'followups_shelter_status_due_date_idx index exists'
);
SELECT is(
  (select count(*)::int from pg_indexes where schemaname = 'public' and tablename = 'timeline_events' and indexname = 'timeline_events_shelter_animal_occurred_at_idx'),
  1,
  'timeline_events_shelter_animal_occurred_at_idx index exists'
);

SELECT is(
  (select i.indisunique
   from pg_index i
   join pg_class c on i.indexrelid = c.oid
   join pg_namespace n on c.relnamespace = n.oid
   where n.nspname = 'public' and c.relname = 'adoptions_one_active_per_animal_idx'),
  true,
  'adoptions_one_active_per_animal_idx is unique'
);

SELECT is(
  (select i.indisunique
   from pg_index i
   join pg_class c on i.indexrelid = c.oid
   join pg_namespace n on c.relnamespace = n.oid
   where n.nspname = 'public' and c.relname = 'adoption_returns_one_per_adoption_idx'),
  true,
  'adoption_returns_one_per_adoption_idx is unique'
);

SELECT * FROM finish();
ROLLBACK;