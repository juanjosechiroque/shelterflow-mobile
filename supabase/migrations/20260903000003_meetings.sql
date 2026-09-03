-- One candidate can have at most one active scheduled meeting. The partial
-- unique index is the concurrency backstop: if two `schedule_meeting()` calls
-- race past the status check below, only the first insert commits and the
-- second fails with a unique-violation instead of creating a duplicate.
create unique index if not exists meetings_one_scheduled_per_candidate_idx
  on public.meetings (candidate_id)
  where status = 'SCHEDULED';

create or replace function public.schedule_meeting(
  p_candidate_id uuid,
  p_type text,
  p_scheduled_at timestamptz,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shelter_id uuid;
  v_candidate public.candidates%rowtype;
  v_animal public.animals%rowtype;
  v_meeting_id uuid;
begin
  v_shelter_id := public.auth_shelter_id();

  if v_shelter_id is null then
    raise exception using errcode = '42501',
      message = 'Authenticated user does not have a shelter profile';
  end if;

  if p_type not in ('INTERVIEW', 'VISIT', 'MEET_AND_GREET', 'HOME_VISIT')
    or p_scheduled_at is null then
    raise exception using errcode = 'P0001',
      message = 'Meeting type and scheduled time are required';
  end if;

  select * into v_candidate
  from public.candidates
  where id = p_candidate_id and shelter_id = v_shelter_id
  for update;

  if not found then
    raise exception using errcode = 'P0001',
      message = 'Candidate is not available in the authenticated shelter';
  end if;

  if v_candidate.status <> 'CONTACT_PENDING' then
    raise exception using errcode = 'P0001',
      message = 'Candidate must be in CONTACT_PENDING status';
  end if;

  select * into v_animal
  from public.animals
  where id = v_candidate.animal_id and shelter_id = v_shelter_id
  for update;

  if not found or v_animal.status not in ('READY', 'IN_PROCESS') then
    raise exception using errcode = 'P0001',
      message = 'Candidate animal is not available for a meeting';
  end if;

  -- Explicit guard for a clear error; `meetings_one_scheduled_per_candidate_idx`
  -- still enforces this under concurrency.
  if exists (
    select 1 from public.meetings
    where candidate_id = v_candidate.id
      and shelter_id = v_shelter_id
      and status = 'SCHEDULED'
  ) then
    raise exception using errcode = 'P0001',
      message = 'Candidate already has a scheduled meeting';
  end if;

  insert into public.meetings (
    shelter_id, candidate_id, type, scheduled_at, status, notes
  ) values (
    v_shelter_id, v_candidate.id, p_type, p_scheduled_at, 'SCHEDULED', p_notes
  ) returning id into v_meeting_id;

  update public.candidates
  set status = 'MEETING_SCHEDULED', updated_at = now()
  where id = v_candidate.id;

  insert into public.timeline_events (
    shelter_id, animal_id, event_type, domain_record_type, domain_record_id, data, occurred_at
  ) values (
    v_shelter_id, v_animal.id, 'MEETING_SCHEDULED', 'meeting', v_meeting_id, null, now()
  );

  if v_animal.status = 'READY' then
    update public.animals
    set status = 'IN_PROCESS', updated_at = now()
    where id = v_animal.id;

    insert into public.timeline_events (
      shelter_id, animal_id, event_type, domain_record_type, domain_record_id, data, occurred_at
    ) values (
      v_shelter_id, v_animal.id, 'ANIMAL_IN_PROCESS', 'animal', v_animal.id, null, now()
    );
  end if;

  return v_meeting_id;
end;
$$;

create or replace function public.complete_meeting(
  p_meeting_id uuid,
  p_result text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shelter_id uuid;
  v_meeting public.meetings%rowtype;
  v_candidate public.candidates%rowtype;
  v_animal public.animals%rowtype;
begin
  v_shelter_id := public.auth_shelter_id();

  if v_shelter_id is null then
    raise exception using errcode = '42501',
      message = 'Authenticated user does not have a shelter profile';
  end if;

  if p_result not in ('STRONG_MATCH', 'GOOD', 'CONCERNS', 'NOT_RECOMMENDED') then
    raise exception using errcode = 'P0001', message = 'Meeting result is not valid';
  end if;

  select * into v_meeting
  from public.meetings
  where id = p_meeting_id and shelter_id = v_shelter_id
  for update;

  if not found or v_meeting.status <> 'SCHEDULED' then
    raise exception using errcode = 'P0001', message = 'Meeting must be in SCHEDULED status';
  end if;

  select * into v_candidate
  from public.candidates
  where id = v_meeting.candidate_id and shelter_id = v_shelter_id
  for update;

  if not found or v_candidate.status <> 'MEETING_SCHEDULED' then
    raise exception using errcode = 'P0001', message = 'Candidate must be in MEETING_SCHEDULED status';
  end if;

  select * into v_animal
  from public.animals
  where id = v_candidate.animal_id and shelter_id = v_shelter_id
  for update;

  if not found then
    raise exception using errcode = 'P0001',
      message = 'Candidate animal is not available in the authenticated shelter';
  end if;

  update public.meetings
  set status = 'COMPLETED',
      result = p_result,
      notes = coalesce(p_notes, v_meeting.notes),
      updated_at = now()
  where id = v_meeting.id;

  insert into public.timeline_events (
    shelter_id, animal_id, event_type, domain_record_type, domain_record_id, data, occurred_at
  ) values (
    v_shelter_id, v_animal.id, 'MEETING_COMPLETED', 'meeting', v_meeting.id, null, now()
  );

  return v_meeting.id;
end;
$$;

create or replace function public.mark_decision_pending(
  p_candidate_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shelter_id uuid;
  v_candidate public.candidates%rowtype;
  v_animal public.animals%rowtype;
begin
  v_shelter_id := public.auth_shelter_id();

  if v_shelter_id is null then
    raise exception using errcode = '42501',
      message = 'Authenticated user does not have a shelter profile';
  end if;

  select * into v_candidate
  from public.candidates
  where id = p_candidate_id and shelter_id = v_shelter_id
  for update;

  if not found or v_candidate.status <> 'MEETING_SCHEDULED' then
    raise exception using errcode = 'P0001', message = 'Candidate must be in MEETING_SCHEDULED status';
  end if;

  select * into v_animal
  from public.animals
  where id = v_candidate.animal_id and shelter_id = v_shelter_id
  for update;

  if not found then
    raise exception using errcode = 'P0001',
      message = 'Candidate animal is not available in the authenticated shelter';
  end if;

  if not exists (
    select 1 from public.meetings
    where candidate_id = v_candidate.id
      and shelter_id = v_shelter_id
      and status = 'COMPLETED'
  ) then
    raise exception using errcode = 'P0001',
      message = 'At least one meeting must be completed before marking for decision';
  end if;

  update public.candidates
  set status = 'DECISION_PENDING', updated_at = now()
  where id = v_candidate.id;

  insert into public.timeline_events (
    shelter_id, animal_id, event_type, domain_record_type, domain_record_id, data, occurred_at
  ) values (
    v_shelter_id, v_animal.id, 'DECISION_PENDING', 'candidate', v_candidate.id, null, now()
  );

  return v_candidate.id;
end;
$$;

revoke all on function public.schedule_meeting(uuid, text, timestamptz, text) from public, anon;
revoke all on function public.complete_meeting(uuid, text, text) from public, anon;
revoke all on function public.mark_decision_pending(uuid) from public, anon;
grant execute on function public.schedule_meeting(uuid, text, timestamptz, text) to authenticated;
grant execute on function public.complete_meeting(uuid, text, text) to authenticated;
grant execute on function public.mark_decision_pending(uuid) to authenticated;
