-- Atomically advance an evaluated candidate to contact pending.
--
-- This is the explicit shelter decision that follows `record_evaluation()`.
-- `record_evaluation()` only moves the candidate to EVALUATED; a recommendation
-- never advances the process on its own. Keeping this transition in its own RPC
-- (rather than folding it into evaluation recording) matches the domain's
-- `EVALUATED -> CONTACT_PENDING` step and avoids duplicating the evaluation flow.
create or replace function public.bridge_evaluated_to_contact_pending(
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

  select *
  into v_candidate
  from public.candidates
  where id = p_candidate_id and shelter_id = v_shelter_id
  for update;

  if not found then
    raise exception using errcode = 'P0001',
      message = 'Candidate is not available in the authenticated shelter';
  end if;

  if v_candidate.status <> 'EVALUATED' then
    raise exception using errcode = 'P0001',
      message = 'Candidate must be in EVALUATED status';
  end if;

  select *
  into v_animal
  from public.animals
  where id = v_candidate.animal_id and shelter_id = v_shelter_id
  for update;

  if not found then
    raise exception using errcode = 'P0001',
      message = 'Candidate animal is not available in the authenticated shelter';
  end if;

  update public.candidates
  set status = 'CONTACT_PENDING', updated_at = now()
  where id = v_candidate.id;

  insert into public.timeline_events (
    shelter_id, animal_id, event_type, domain_record_type, domain_record_id, data, occurred_at
  ) values (
    v_shelter_id, v_animal.id, 'CONTACT_PENDING', 'candidate', v_candidate.id, null, now()
  );

  return v_candidate.id;
end;
$$;

revoke all on function public.bridge_evaluated_to_contact_pending(uuid) from public, anon;
grant execute on function public.bridge_evaluated_to_contact_pending(uuid) to authenticated;
