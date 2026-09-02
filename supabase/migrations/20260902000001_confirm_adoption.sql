-- Atomically confirm an adoption.
--
-- This RPC derives shelter ownership from the authenticated profile and
-- performs every related state change in the transaction that executes it.

create or replace function public.confirm_adoption(
  p_candidate_id uuid,
  p_adoption_date date,
  p_handover_notes text,
  p_followup_due_dates date[]
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
  v_adoption_id uuid;
begin
  v_shelter_id := public.auth_shelter_id();

  if v_shelter_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authenticated user does not have a shelter profile';
  end if;

  if p_adoption_date is null then
    raise exception using
      errcode = 'P0001',
      message = 'Adoption date is required';
  end if;

  if coalesce(cardinality(p_followup_due_dates), 0) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'At least one follow-up due date is required';
  end if;

  if array_position(p_followup_due_dates, null::date) is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Follow-up due dates cannot contain null values';
  end if;

  if (
    select count(*)
    from unnest(p_followup_due_dates) as followup_due_date
  ) <> (
    select count(distinct followup_due_date)
    from unnest(p_followup_due_dates) as followup_due_date
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Follow-up due dates cannot contain duplicates';
  end if;

  if exists (
    select 1
    from unnest(p_followup_due_dates) as followup_due_date
    where followup_due_date <= p_adoption_date
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Every follow-up due date must be after the adoption date';
  end if;

  select *
  into v_candidate
  from public.candidates
  where id = p_candidate_id
    and shelter_id = v_shelter_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Candidate is not available in the authenticated shelter';
  end if;

  if v_candidate.status <> 'DECISION_PENDING' then
    raise exception using
      errcode = 'P0001',
      message = 'Candidate must be in DECISION_PENDING status';
  end if;

  select *
  into v_animal
  from public.animals
  where id = v_candidate.animal_id
    and shelter_id = v_shelter_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Candidate animal is not available in the authenticated shelter';
  end if;

  if v_animal.status <> 'IN_PROCESS' then
    raise exception using
      errcode = 'P0001',
      message = 'Animal must be in IN_PROCESS status';
  end if;

  if exists (
    select 1
    from public.adoptions
    where animal_id = v_animal.id
      and status = 'ACTIVE'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Animal already has an active adoption';
  end if;

  insert into public.adoptions (
    shelter_id,
    animal_id,
    candidate_id,
    adoption_date,
    handover_notes,
    status
  )
  values (
    v_shelter_id,
    v_animal.id,
    v_candidate.id,
    p_adoption_date,
    p_handover_notes,
    'ACTIVE'
  )
  returning id into v_adoption_id;

  update public.candidates
  set status = 'SELECTED', updated_at = now()
  where id = v_candidate.id
    and shelter_id = v_shelter_id;

  update public.candidates
  set status = 'NOT_SELECTED', updated_at = now()
  where shelter_id = v_shelter_id
    and animal_id = v_animal.id
    and id <> v_candidate.id
    and status in (
      'NEEDS_EVALUATION',
      'EVALUATED',
      'CONTACT_PENDING',
      'MEETING_SCHEDULED',
      'DECISION_PENDING'
    );

  update public.animals
  set status = 'ADOPTED', updated_at = now()
  where id = v_animal.id
    and shelter_id = v_shelter_id;

  insert into public.followups (shelter_id, adoption_id, due_date, status)
  select v_shelter_id, v_adoption_id, followup_due_date, 'PENDING'
  from unnest(p_followup_due_dates) as followup_due_date;

  insert into public.timeline_events (
    shelter_id,
    animal_id,
    event_type,
    domain_record_type,
    domain_record_id,
    data,
    occurred_at
  )
  values
    (
      v_shelter_id,
      v_animal.id,
      'ADOPTION_CONFIRMED',
      'adoption',
      v_adoption_id,
      '{}'::jsonb,
      now()
    ),
    (
      v_shelter_id,
      v_animal.id,
      'FOLLOW_UPS_PLANNED',
      'adoption',
      v_adoption_id,
      jsonb_build_object('followup_count', cardinality(p_followup_due_dates)),
      now()
    );

  return v_adoption_id;
end;
$$;

revoke all on function public.confirm_adoption(uuid, date, text, date[]) from public;
grant execute on function public.confirm_adoption(uuid, date, text, date[]) to authenticated;
