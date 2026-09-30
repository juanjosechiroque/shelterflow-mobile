-- ShelterFlow private Storage bucket and shelter-scoped object policies.
--
-- This migration provisions the `shelter-media` bucket and the Row Level
-- Security policies that confine every object operation to the caller's own
-- shelter. It does NOT create the upload UI, attach RPCs, or signed-URL read
-- path — those are later slices of Phase 8.
--
-- Object-key convention for this bucket for the whole phase:
--   <shelter_id>/<entity>/<entity_id>/<filename>
-- The first path segment is always the owning shelter id, so one predicate
-- covers every object type:
--   bucket_id = 'shelter-media'
--   and (storage.foldername(name))[1] = public.auth_shelter_id()::text
--
-- A caller whose profile has no shelter returns NULL from
-- public.auth_shelter_id(); the predicate then matches no row, which is the
-- intended posture and matches the domain-table policies.
--
-- Supabase's own storage migrations already enable RLS on storage.objects and
-- grant the base table privileges to authenticated. This migration adds only
-- the bucket and the policies; it does not toggle RLS or re-grant table
-- privileges.

-- =====================================================================
-- 1. Private bucket with image-only MIME allowlist and a size ceiling.
-- =====================================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'shelter-media',
  'shelter-media',
  false,
  10 * 1024 * 1024, -- 10 MiB; 8.2 may tune the number, not the isolation model
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- =====================================================================
-- 2. Shelter-scoped policies on storage.objects for role authenticated.
-- =====================================================================

create policy "shelter_media_objects_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'shelter-media'
    and (storage.foldername(name))[1] = public.auth_shelter_id()::text
  );

create policy "shelter_media_objects_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'shelter-media'
    and (storage.foldername(name))[1] = public.auth_shelter_id()::text
  );

create policy "shelter_media_objects_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'shelter-media'
    and (storage.foldername(name))[1] = public.auth_shelter_id()::text
  )
  with check (
    bucket_id = 'shelter-media'
    and (storage.foldername(name))[1] = public.auth_shelter_id()::text
  );

create policy "shelter_media_objects_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'shelter-media'
    and (storage.foldername(name))[1] = public.auth_shelter_id()::text
  );
