-- Require the photo-attach RPCs to record only a path that actually exists
-- in Storage.
--
-- Required outcome 5 in docs/internal/phases/PHASE_08_IMAGES.md promises: an
-- interrupted upload "can only ever leave an orphan object in Storage — never
-- a domain row that references a missing object." That guarantee rested
-- entirely on client-side ordering (upload, then attach): set_animal_primary_photo,
-- set_adoption_photo, and set_followup_photo validated only that p_path's
-- shelter-prefix segment matched the caller's shelter, never that the object
-- named by p_path actually exists. Per SECURITY.md#domain-mutation-security
-- ("it can only invoke operations whose preconditions are checked
-- server-side"), a client-side ordering convention is not a server-side
-- precondition: a caller invoking one of these RPCs directly with a path
-- that was never uploaded would produce exactly the dangling reference the
-- phase's own risk register rules out.
--
-- This migration adds one additional check to each function: p_path must
-- name an object that exists in the shelter-media bucket. The check also
-- subsumes set_animal_primary_photo's pre-existing gap where a NULL p_path
-- passed the `like` prefix check as vacuously true-when-null-under-`not`
-- (PL/pgSQL treats a NULL IF condition as false) and silently cleared the
-- column; a NULL path never matches storage.objects.name, so it is now
-- rejected the same way as any other unowned or nonexistent path.

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
  if p_path is null
    or not (p_path like (v_shelter_id::text || '/animals/%')) then
    raise exception using
      errcode = 'P0001',
      message = 'Animal is not available in the authenticated shelter';
  end if;

  -- The path must name an object that was actually uploaded; a client-side
  -- upload-then-attach ordering is not a server-side precondition.
  if not exists (
    select 1
      from storage.objects
      where bucket_id = 'shelter-media'
        and name = p_path
  ) then
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

  -- The path must name an object that was actually uploaded; a client-side
  -- upload-then-attach ordering is not a server-side precondition.
  if not exists (
    select 1
      from storage.objects
      where bucket_id = 'shelter-media'
        and name = p_path
  ) then
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

  -- The path must name an object that was actually uploaded; a client-side
  -- upload-then-attach ordering is not a server-side precondition.
  if not exists (
    select 1
      from storage.objects
      where bucket_id = 'shelter-media'
        and name = p_path
  ) then
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
