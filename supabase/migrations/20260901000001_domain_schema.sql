create table public.shelters (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  country text not null check (length(trim(country)) > 0),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  shelter_id uuid not null references public.shelters (id) on delete restrict,
  display_name text not null check (length(trim(display_name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_updated_at_after_created_at check (updated_at >= created_at),
  unique (shelter_id, id)
);

create index profiles_shelter_id_idx on public.profiles (shelter_id);

create table public.animals (
  id uuid primary key default gen_random_uuid(),
  shelter_id uuid not null references public.shelters (id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  species text not null check (species in ('DOG', 'CAT', 'OTHER', 'UNKNOWN')),
  sex text not null check (sex in ('MALE', 'FEMALE', 'UNKNOWN')),
  approximate_age_months integer check (
    approximate_age_months is null or approximate_age_months >= 0
  ),
  size text not null check (size in ('SMALL', 'MEDIUM', 'LARGE', 'UNKNOWN')),
  primary_photo_path text,
  notes text,
  status text not null default 'PREPARING' check (
    status in ('PREPARING', 'READY', 'IN_PROCESS', 'ADOPTED', 'REEVALUATION', 'NOT_AVAILABLE')
  ),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint animals_updated_at_after_created_at check (updated_at >= created_at),
  unique (shelter_id, id)
);

create index animals_shelter_status_idx on public.animals (shelter_id, status);
create index animals_shelter_name_idx on public.animals (shelter_id, name);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  shelter_id uuid not null references public.shelters (id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  phone text not null check (length(trim(phone)) > 0),
  email text check (email is null or email ~ '^[^@ ]+@[^@ ]+$'),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint people_updated_at_after_created_at check (updated_at >= created_at),
  unique (shelter_id, id)
);

create index people_shelter_name_idx on public.people (shelter_id, name);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  shelter_id uuid not null references public.shelters (id) on delete restrict,
  person_id uuid not null,
  animal_id uuid not null,
  source text,
  notes text,
  status text not null default 'NEEDS_EVALUATION' check (
    status in (
      'NEEDS_EVALUATION',
      'EVALUATED',
      'CONTACT_PENDING',
      'MEETING_SCHEDULED',
      'DECISION_PENDING',
      'SELECTED',
      'NOT_SELECTED',
      'WITHDRAWN'
    )
  ),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint candidates_updated_at_after_created_at check (updated_at >= created_at),
  foreign key (shelter_id, person_id) references public.people (shelter_id, id),
  foreign key (shelter_id, animal_id) references public.animals (shelter_id, id),
  unique (shelter_id, id),
  unique (shelter_id, id, animal_id),
  unique (shelter_id, person_id, animal_id)
);

create index candidates_shelter_status_idx on public.candidates (shelter_id, status);
create index candidates_shelter_animal_idx on public.candidates (shelter_id, animal_id);
create index candidates_shelter_person_idx on public.candidates (shelter_id, person_id);

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  shelter_id uuid not null references public.shelters (id) on delete restrict,
  candidate_id uuid not null,
  overall_fit text not null check (overall_fit in ('STRONG', 'POSSIBLE', 'CONCERNS')),
  positive_factors text[] not null default '{}',
  concerns text[] not null default '{}',
  notes text,
  recommendation text not null check (
    recommendation in ('CONTINUE', 'MORE_INFORMATION', 'DO_NOT_CONTINUE')
  ),
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evaluations_updated_at_after_created_at check (updated_at >= created_at),
  foreign key (shelter_id, candidate_id) references public.candidates (shelter_id, id),
  foreign key (shelter_id, created_by_user_id) references public.profiles (shelter_id, id),
  unique (shelter_id, id),
  unique (candidate_id)
);

create index evaluations_shelter_candidate_idx on public.evaluations (shelter_id, candidate_id);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  shelter_id uuid not null references public.shelters (id) on delete restrict,
  candidate_id uuid not null,
  type text not null check (type in ('INTERVIEW', 'VISIT', 'MEET_AND_GREET', 'HOME_VISIT')),
  scheduled_at timestamptz not null,
  status text not null default 'SCHEDULED' check (
    status in ('SCHEDULED', 'COMPLETED', 'CANCELED', 'RESCHEDULED')
  ),
  result text check (
    result is null or result in ('STRONG_MATCH', 'GOOD', 'CONCERNS', 'NOT_RECOMMENDED')
  ),
  notes text,
  rescheduled_from_meeting_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meetings_updated_at_after_created_at check (updated_at >= created_at),
  constraint meetings_rescheduled_not_self check (
    rescheduled_from_meeting_id is null or rescheduled_from_meeting_id <> id
  ),
  foreign key (shelter_id, candidate_id) references public.candidates (shelter_id, id),
  foreign key (shelter_id, candidate_id, rescheduled_from_meeting_id)
    references public.meetings (shelter_id, candidate_id, id),
  unique (shelter_id, id),
  unique (shelter_id, candidate_id, id)
);

create index meetings_shelter_candidate_idx on public.meetings (shelter_id, candidate_id);
create index meetings_shelter_scheduled_at_idx on public.meetings (shelter_id, scheduled_at);

create table public.adoptions (
  id uuid primary key default gen_random_uuid(),
  shelter_id uuid not null references public.shelters (id) on delete restrict,
  animal_id uuid not null,
  candidate_id uuid not null,
  adoption_date date not null,
  handover_notes text,
  adoption_photo_path text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'RETURNED')),
  created_at timestamptz not null default now(),
  foreign key (shelter_id, animal_id) references public.animals (shelter_id, id),
  foreign key (shelter_id, candidate_id, animal_id) references public.candidates (shelter_id, id, animal_id),
  unique (shelter_id, id)
);

create unique index adoptions_one_active_per_animal_idx
  on public.adoptions (animal_id)
  where status = 'ACTIVE';

create index adoptions_shelter_status_idx on public.adoptions (shelter_id, status);
create index adoptions_shelter_animal_idx on public.adoptions (shelter_id, animal_id);

create table public.adoption_returns (
  id uuid primary key default gen_random_uuid(),
  shelter_id uuid not null references public.shelters (id) on delete restrict,
  adoption_id uuid not null,
  returned_at timestamptz not null,
  reason text not null check (length(trim(reason)) > 0),
  notes text,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  foreign key (shelter_id, adoption_id) references public.adoptions (shelter_id, id),
  foreign key (shelter_id, created_by_user_id) references public.profiles (shelter_id, id),
  unique (shelter_id, id)
);

create unique index adoption_returns_one_per_adoption_idx on public.adoption_returns (adoption_id);
create index adoption_returns_shelter_idx on public.adoption_returns (shelter_id);

create table public.followups (
  id uuid primary key default gen_random_uuid(),
  shelter_id uuid not null references public.shelters (id) on delete restrict,
  adoption_id uuid not null,
  due_date date not null,
  status text not null default 'PENDING' check (
    status in ('PENDING', 'COMPLETED', 'RESCHEDULED', 'MISSED', 'CANCELLED')
  ),
  outcome text check (
    outcome is null or outcome in ('EXCELLENT', 'GOOD', 'CONCERNS', 'INTERVENTION_REQUIRED')
  ),
  notes text,
  photo_path text,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  rescheduled_from_followup_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint followups_updated_at_after_created_at check (updated_at >= created_at),
  constraint followups_completed_at_consistency check (
    status = 'COMPLETED' or completed_at is null
  ),
  constraint followups_cancelled_at_consistency check (
    (status = 'CANCELLED' and cancelled_at is not null and cancellation_reason = 'ADOPTION_RETURNED')
    or
    (status <> 'CANCELLED' and cancelled_at is null and cancellation_reason is null)
  ),
  constraint followups_outcome_consistency check (status = 'COMPLETED' or outcome is null),
  constraint followups_rescheduled_not_self check (
    rescheduled_from_followup_id is null or rescheduled_from_followup_id <> id
  ),
  foreign key (shelter_id, adoption_id) references public.adoptions (shelter_id, id),
  foreign key (shelter_id, adoption_id, rescheduled_from_followup_id)
    references public.followups (shelter_id, adoption_id, id),
  unique (shelter_id, id),
  unique (shelter_id, adoption_id, id)
);

create index followups_shelter_status_due_date_idx on public.followups (shelter_id, status, due_date);
create index followups_shelter_adoption_idx on public.followups (shelter_id, adoption_id);

create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  shelter_id uuid not null references public.shelters (id) on delete restrict,
  animal_id uuid not null,
  event_type text not null,
  domain_record_type text,
  domain_record_id uuid,
  data jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (shelter_id, animal_id) references public.animals (shelter_id, id),
  unique (shelter_id, id)
);

create index timeline_events_shelter_animal_occurred_at_idx
  on public.timeline_events (shelter_id, animal_id, occurred_at desc);

create index timeline_events_shelter_idx on public.timeline_events (shelter_id);