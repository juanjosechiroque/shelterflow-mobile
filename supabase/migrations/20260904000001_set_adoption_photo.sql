-- Set an adoption's handover photo path.
-- This function records the path on adoptions.adoption_photo_path after
-- validating shelter ownership. It does NOT insert a timeline_events row
-- (attaching a photo is not a domain transition).
--
-- Object-key convention:
--   <shelter_id>/adoptions/<adoption_id>/<uuid>.<ext>

create or replace function public.set_adoption_photo(
  p_adoption_id uuid,
  p_path text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shelter_id uuid;
  v_adoption public.adoptions%rowtype;
begin
  v_shelter_id := public.auth_shelter_id();

  if v_shelter_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authenticated user does not have a shelter profile';
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

  -- Validate p_path starts with the shelter prefix as defense in depth
  if p_path is null
    or not (p_path like (v_shelter_id::text || '/adoptions/%')) then
    raise exception using
      errcode = 'P0001',
      message = 'Adoption is not available in the authenticated shelter';
  end if;

  -- adoptions has no updated_at column, so we only set adoption_photo_path
  update public.adoptions
    set adoption_photo_path = p_path
    where id = v_adoption.id
      and shelter_id = v_shelter_id;

  return v_adoption.id;
end;
$$;

revoke all on function public.set_adoption_photo(uuid, text) from public, anon;
grant execute on function public.set_adoption_photo(uuid, text) to authenticated;
