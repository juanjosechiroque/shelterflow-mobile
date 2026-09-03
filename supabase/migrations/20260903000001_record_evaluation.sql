-- Atomically record an evaluation for a candidate.
--
-- This RPC derives shelter ownership and actor identity from the authenticated
-- session and performs every related state change in the transaction that
-- performs it.
--
-- Preconditions (validated inside the function):
--   - Candidate belongs to the authenticated shelter
--   - Candidate.status = NEEDS_EVALUATION
--   - Exactly one evaluation does not already exist for this candidate
--
-- Effects:
--   1. Inserts a new evaluation record with created_by_user_id from auth.uid()
--   2. Moves candidate from NEEDS_EVALUATION to EVALUATED
--   3. Inserts a EVALUATION_RECORDED timeline event on the associated animal
--
-- Any failure rolls back every change.

create or replace function public.record_evaluation(
  p_candidate_id uuid,
  p_overall_fit text,
  p_positive_factors text[],
  p_concerns text[],
  p_recommendation text,
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
  v_evaluation_id uuid;
begin
  v_shelter_id := public.auth_shelter_id();

  if v_shelter_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authenticated user does not have a shelter profile';
  end if;

  if p_overall_fit is null then
    raise exception using
      errcode = 'P0001',
      message = 'Overall fit is required';
  end if;

  if p_overall_fit not in ('STRONG', 'POSSIBLE', 'CONCERNS') then
    raise exception using
      errcode = 'P0001',
      message = 'Overall fit must be one of STRONG, POSSIBLE, CONCERNS';
  end if;

  if p_recommendation is null then
    raise exception using
      errcode = 'P0001',
      message = 'Recommendation is required';
  end if;

  if p_recommendation not in ('CONTINUE', 'MORE_INFORMATION', 'DO_NOT_CONTINUE') then
    raise exception using
      errcode = 'P0001',
      message = 'Recommendation must be one of CONTINUE, MORE_INFORMATION, DO_NOT_CONTINUE';
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

  if v_candidate.status <> 'NEEDS_EVALUATION' then
    raise exception using
      errcode = 'P0001',
      message = 'Candidate must be in NEEDS_EVALUATION status';
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

  -- Insert the evaluation record
  insert into public.evaluations (
    shelter_id,
    candidate_id,
    overall_fit,
    positive_factors,
    concerns,
    recommendation,
    notes,
    created_by_user_id
  )
  values (
    v_shelter_id,
    v_candidate.id,
    p_overall_fit,
    coalesce(p_positive_factors, '{}'),
    coalesce(p_concerns, '{}'),
    p_recommendation,
    p_notes,
    auth.uid()
  )
  returning id into v_evaluation_id;

  -- Move candidate from NEEDS_EVALUATION to EVALUATED
  update public.candidates
  set status = 'EVALUATED', updated_at = now()
  where id = v_candidate.id;

  -- Insert EVALUATION_RECORDED timeline event on the animal
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
    'EVALUATION_RECORDED',
    'evaluation',
    v_evaluation_id,
    null,
    now()
  );

  return v_evaluation_id;
end;
$$;

revoke all on function public.record_evaluation(uuid, text, text[], text[], text, text) from public, anon;
grant execute on function public.record_evaluation(uuid, text, text[], text[], text, text) to authenticated;
