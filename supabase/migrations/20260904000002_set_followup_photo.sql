-- Set a follow-up's photo path.
-- This function records the path on followups.photo_path after validating
-- shelter ownership. It does NOT insert a timeline_events row (attaching a
-- photo is not a domain transition).
--
-- Lock ordering matches complete_followup and return_adoption: adoption row
-- locked first, then follow-up row, so a concurrent return_adoption() cannot
-- silently cancel follow-ups between our status check and the update.
--
-- Object-key convention:
--   <shelter_id>/followups/<followup_id>/<uuid>.<ext>

create or replace function public.set_followup_photo(
  p_followup_id uuid,
  p_path text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shelter_id uuid;
  v_adoption_id uuid;
  v_adoption public.adoptions%rowtype;
  v_followup public.followups%rowtype;
begin
  v_shelter_id := public.auth_shelter_id();

  if v_shelter_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authenticated user does not have a shelter profile';
  end if;

  -- First read the follow-up row (without locking) to discover its adoption
  -- and to verify that the caller operates within the authenticated shelter.
  select f.adoption_id
    into v_adoption_id
    from public.followups f
    where f.id = p_followup_id
      and f.shelter_id = v_shelter_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Follow-up is not available in the authenticated shelter';
  end if;

  -- Lock the adoption row first so a concurrent return_adoption() cannot
  -- cancel pending follow-ups between our status check and the follow-up update.
  select *
    into v_adoption
    from public.adoptions
    where id = v_adoption_id
      and shelter_id = v_shelter_id
    for update;

  if not found or v_adoption.status <> 'ACTIVE' then
    raise exception using
      errcode = 'P0001',
      message = 'Adoption must be in ACTIVE status';
  end if;

  -- Lock the follow-up after the adoption so return_adoption() cancels
  -- pending follow-ups first when both transactions race on the same row.
  select *
    into v_followup
    from public.followups
    where id = p_followup_id
      and shelter_id = v_shelter_id
      and adoption_id = v_adoption.id
    for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Follow-up is not available in the authenticated shelter';
  end if;

  if v_followup.status = 'CANCELLED' then
    raise exception using
      errcode = 'P0001',
      message = 'Follow-up cannot be cancelled';
  end if;

  -- Validate p_path starts with the shelter prefix as defense in depth
  if p_path is null
    or not (p_path like (v_shelter_id::text || '/followups/%')) then
    raise exception using
      errcode = 'P0001',
      message = 'Follow-up is not available in the authenticated shelter';
  end if;

  update public.followups
    set photo_path = p_path, updated_at = now()
    where id = v_followup.id
      and shelter_id = v_shelter_id;

  return v_followup.id;
end;
$$;

revoke all on function public.set_followup_photo(uuid, text) from public, anon;
grant execute on function public.set_followup_photo(uuid, text) to authenticated;
