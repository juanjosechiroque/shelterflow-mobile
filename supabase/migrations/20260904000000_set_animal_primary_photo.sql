-- Set an animal's primary photo path.
-- This function records the path on animals.primary_photo_path after validating
-- shelter ownership. It does NOT insert a timeline_events row (attaching a photo
-- is not a domain transition).
--
-- Object-key convention (established by 8.1):
--   <shelter_id>/animals/<animal_id>/<uuid>.<ext>
-- The first path segment is the owning shelter id, enforced by the Storage policy.

create or replace function public.set_animal_primary_photo(
  p_animal_id uuid,
  p_path text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shelter_id uuid;
  v_animal public.animals%rowtype;
begin
  v_shelter_id := public.auth_shelter_id();

  if v_shelter_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authenticated user does not have a shelter profile';
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

  -- Validate p_path starts with the shelter prefix as defense in depth
  if not (p_path like (v_shelter_id::text || '/animals/%')) then
    raise exception using
      errcode = 'P0001',
      message = 'Animal is not available in the authenticated shelter';
  end if;

  update public.animals
    set primary_photo_path = p_path, updated_at = now()
    where id = v_animal.id
      and shelter_id = v_shelter_id;

  return v_animal.id;
end;
$$;

revoke all on function public.set_animal_primary_photo(uuid, text) from public, anon;
grant execute on function public.set_animal_primary_photo(uuid, text) to authenticated;