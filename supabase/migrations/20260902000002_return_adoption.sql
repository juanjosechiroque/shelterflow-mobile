-- Atomically return an active adoption.
--
-- This RPC derives shelter ownership and actor identity from the authenticated
-- session and performs every related state change in the transaction that
-- executes it.

create or replace function public.return_adoption(
  p_adoption_id uuid,
  p_reason text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shelter_id uuid;
  v_adoption public.adoptions%rowtype;
  v_animal public.animals%rowtype;
  v_adoption_return_id uuid;
begin
  v_shelter_id := public.auth_shelter_id();

  if v_shelter_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authenticated user does not have a shelter profile';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Return reason is required';
  end if;

  select *
  into v_adoption
  from public.adoptions
  where id = p_adoption_id
    and shelter_id = v_shelter_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Adoption is not available in the authenticated shelter';
  end if;

  if v_adoption.status <> 'ACTIVE' then
    raise exception using
      errcode = 'P0001',
      message = 'Adoption must be in ACTIVE status';
  end if;

  select *
  into v_animal
  from public.animals
  where id = v_adoption.animal_id
    and shelter_id = v_shelter_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Adoption animal is not available in the authenticated shelter';
  end if;

  if v_animal.status <> 'ADOPTED' then
    raise exception using
      errcode = 'P0001',
      message = 'Animal must be in ADOPTED status';
  end if;

  if exists (
    select 1
    from public.adoption_returns
    where adoption_id = v_adoption.id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Adoption already has a return record';
  end if;

  insert into public.adoption_returns (
    shelter_id,
    adoption_id,
    returned_at,
    reason,
    notes,
    created_by_user_id
  )
  values (
    v_shelter_id,
    v_adoption.id,
    now(),
    p_reason,
    p_notes,
    auth.uid()
  )
  returning id into v_adoption_return_id;

  update public.adoptions
  set status = 'RETURNED'
  where id = v_adoption.id
    and shelter_id = v_shelter_id;

  update public.animals
  set status = 'REEVALUATION', updated_at = now()
  where id = v_animal.id
    and shelter_id = v_shelter_id;

  update public.followups
  set
    status = 'CANCELLED',
    cancelled_at = now(),
    cancellation_reason = 'ADOPTION_RETURNED',
    updated_at = now()
  where shelter_id = v_shelter_id
    and adoption_id = v_adoption.id
    and status = 'PENDING';

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
      'ADOPTION_RETURNED',
      'adoption',
      v_adoption.id,
      '{}'::jsonb,
      now()
    ),
    (
      v_shelter_id,
      v_animal.id,
      'REEVALUATION_REQUIRED',
      'animal',
      v_animal.id,
      '{}'::jsonb,
      now()
    );

  return v_adoption_return_id;
end;
$$;

revoke all on function public.return_adoption(uuid, text, text) from public, anon;
grant execute on function public.return_adoption(uuid, text, text) to authenticated;
