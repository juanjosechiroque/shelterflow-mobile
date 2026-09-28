-- Atomically complete a pending follow-up.
--
-- This RPC derives shelter ownership and the authenticated actor from the
-- session, validates every precondition in the transaction that performs the
-- state change, and creates the matching timeline event.
--
-- To avoid races with `return_adoption()`, the adoption row is locked first
-- and the follow-up is re-read under that lock. A concurrent return that
-- cancels pending follow-ups therefore wins, and this RPC rejects any
-- follow-up that is no longer `PENDING`.

create or replace function public.complete_followup(
  p_followup_id uuid,
  p_outcome text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shelter_id uuid;
  v_adoption_id uuid;
  v_animal_id uuid;
  v_adoption public.adoptions%rowtype;
  v_followup public.followups%rowtype;
begin
  v_shelter_id := public.auth_shelter_id();

  if v_shelter_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authenticated user does not have a shelter profile';
  end if;

  if p_outcome is null
    or p_outcome not in ('EXCELLENT', 'GOOD', 'CONCERNS', 'INTERVENTION_REQUIRED') then
    raise exception using
      errcode = 'P0001',
      message = 'Outcome must be one of EXCELLENT, GOOD, CONCERNS, INTERVENTION_REQUIRED';
  end if;

  -- First read the follow-up row (without locking) to discover its adoption
  -- and to verify that the caller operates within the authenticated shelter.
  select f.adoption_id, a.animal_id, a.status
    into v_adoption_id, v_animal_id, v_adoption.status
    from public.followups f
    join public.adoptions a
      on a.shelter_id = f.shelter_id
     and a.id = f.adoption_id
    where f.id = p_followup_id
      and f.shelter_id = v_shelter_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Follow-up is not available in the authenticated shelter';
  end if;

  -- Lock the adoption row first so a concurrent `return_adoption()` cannot
  -- silently cancel pending follow-ups between our status check and the
  -- follow-up update.
  select *
    into v_adoption
    from public.adoptions
    where id = v_adoption_id
      and shelter_id = v_shelter_id
    for update;

  if v_adoption.status <> 'ACTIVE' then
    raise exception using
      errcode = 'P0001',
      message = 'Adoption must be in ACTIVE status';
  end if;

  -- Lock the follow-up after the adoption so `return_adoption()` cancels
  -- pending follow-ups first when both transactions race on the same row.
  select *
    into v_followup
    from public.followups
    where id = p_followup_id
      and shelter_id = v_shelter_id
      and adoption_id = v_adoption.id
    for update;

  if v_followup.status <> 'PENDING' then
    raise exception using
      errcode = 'P0001',
      message = 'Follow-up must be in PENDING status';
  end if;

  update public.followups
    set status = 'COMPLETED',
        outcome = p_outcome,
        notes = p_notes,
        completed_at = now(),
        updated_at = now()
    where id = v_followup.id
      and shelter_id = v_shelter_id;

  insert into public.timeline_events (
    shelter_id,
    animal_id,
    event_type,
    domain_record_type,
    domain_record_id,
    data,
    occurred_at
  )
  values (
    v_shelter_id,
    v_adoption.animal_id,
    'FOLLOW_UP_COMPLETED',
    'followup',
    v_followup.id,
    jsonb_build_object('outcome', p_outcome),
    now()
  );

  return v_followup.id;
end;
$$;

revoke all on function public.complete_followup(uuid, text, text) from public, anon;
grant execute on function public.complete_followup(uuid, text, text) to authenticated;
