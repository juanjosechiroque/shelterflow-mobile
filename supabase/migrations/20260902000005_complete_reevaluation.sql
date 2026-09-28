-- Atomically complete a reevaluation for an animal that has returned to the
-- shelter. This RPC derives shelter ownership from the authenticated profile,
-- validates every precondition in the transaction that performs the state
-- change, and creates the matching timeline event.
--
-- The transition is triggered only after a human decision. The RPC never
-- infers readiness from timers or other side effects.

create or replace function public.complete_reevaluation(
  p_animal_id uuid,
  p_next_status text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shelter_id uuid;
  v_animal public.animals%rowtype;
  v_event_type text;
begin
  v_shelter_id := public.auth_shelter_id();

  if v_shelter_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authenticated user does not have a shelter profile';
  end if;

  if p_next_status is null
    or p_next_status not in ('READY', 'NOT_AVAILABLE') then
    raise exception using
      errcode = 'P0001',
      message = 'Next status must be READY or NOT_AVAILABLE';
  end if;

  select *
    into v_animal
    from public.animals
    where id = p_animal_id
      and shelter_id = v_shelter_id
    for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Animal is not available in the authenticated shelter';
  end if;

  if v_animal.status <> 'REEVALUATION' then
    raise exception using
      errcode = 'P0001',
      message = 'Animal must be in REEVALUATION status';
  end if;

  if exists (
    select 1
    from public.adoptions
    where animal_id = v_animal.id
      and shelter_id = v_shelter_id
      and status = 'ACTIVE'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Animal still has an active adoption';
  end if;

  if p_next_status = 'READY' then
    v_event_type := 'ANIMAL_READY';
  else
    v_event_type := 'ANIMAL_NOT_AVAILABLE';
  end if;

  update public.animals
    set status = p_next_status, updated_at = now()
    where id = v_animal.id
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
    v_animal.id,
    v_event_type,
    'animal',
    v_animal.id,
    '{}'::jsonb,
    now()
  );

  return v_animal.id;
end;
$$;

revoke all on function public.complete_reevaluation(uuid, text) from public, anon;
grant execute on function public.complete_reevaluation(uuid, text) to authenticated;
