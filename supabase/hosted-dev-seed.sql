-- ShelterFlow hosted-development fixture data.
--
-- Run this manually in the linked hosted project's SQL Editor. It is not a
-- migration and must never be applied with `supabase db push`.
--
-- Safety boundaries:
--   * the target project must contain exactly one shelter named Huellitas Peru;
--   * the existing admin@shelter.com profile is used as the only actor;
--   * this script never creates auth users, profiles, shelters, or storage
--     objects;
--   * all operational records are fictitious and use example.com addresses.
--
-- The fixture IDs are stable, so rerunning the script updates the same core
-- records. It deliberately does not delete records created by manual tests.

begin;

do $seed$
declare
  v_user_id uuid;
  v_shelter_id uuid;
  v_shelter_name text;
begin
  if (select count(*) from public.shelters) <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'Hosted development seed requires exactly one shelter';
  end if;

  select p.id, p.shelter_id, s.name
    into v_user_id, v_shelter_id, v_shelter_name
    from public.profiles p
    join auth.users u on u.id = p.id
    join public.shelters s on s.id = p.shelter_id
   where u.email = 'admin@shelter.com';

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Hosted development seed requires the existing admin@shelter.com profile';
  end if;

  if v_shelter_name <> 'Huellitas Peru' then
    raise exception using
      errcode = 'P0001',
      message = 'Hosted development seed requires the Huellitas Peru shelter';
  end if;

  insert into public.animals (
    id, shelter_id, name, species, sex, approximate_age_months, size,
    primary_photo_path, notes, status, created_at, updated_at
  )
  values
    ('00000000-0000-4000-8000-000000000011', v_shelter_id, 'Luna', 'DOG', 'FEMALE', 24, 'MEDIUM', null, 'Calm and affectionate mixed-breed dog.', 'ADOPTED', now() - interval '78 days', now() - interval '31 days'),
    ('00000000-0000-4000-8000-000000000012', v_shelter_id, 'Mia', 'CAT', 'FEMALE', 36, 'SMALL', null, 'Quiet indoor cat that returned after an adoption trial.', 'REEVALUATION', now() - interval '120 days', now() - interval '28 days'),
    ('00000000-0000-4000-8000-000000000013', v_shelter_id, 'Nala', 'CAT', 'FEMALE', null, 'MEDIUM', null, 'Shy at first, warms up slowly.', 'IN_PROCESS', now() - interval '45 days', now() - interval '3 days'),
    ('00000000-0000-4000-8000-000000000014', v_shelter_id, 'Bruno', 'DOG', 'MALE', 72, 'LARGE', null, 'Senior dog looking for a calm home.', 'READY', now() - interval '60 days', now() - interval '28 days'),
    ('00000000-0000-4000-8000-000000000015', v_shelter_id, 'Toby', 'DOG', 'MALE', 18, 'SMALL', null, 'Energetic small dog.', 'READY', now() - interval '50 days', now() - interval '45 days')
  on conflict (id) do update
    set shelter_id = excluded.shelter_id,
        name = excluded.name,
        species = excluded.species,
        sex = excluded.sex,
        approximate_age_months = excluded.approximate_age_months,
        size = excluded.size,
        primary_photo_path = excluded.primary_photo_path,
        notes = excluded.notes,
        status = excluded.status,
        updated_at = excluded.updated_at;

  insert into public.people (
    id, shelter_id, name, phone, email, created_at, updated_at
  )
  values
    ('00000000-0000-4000-8000-000000000031', v_shelter_id, 'Andrea Perez', '+51 900 111 222', 'andrea.perez@example.com', now() - interval '68 days', now() - interval '68 days'),
    ('00000000-0000-4000-8000-000000000032', v_shelter_id, 'Carlos Ruiz', '+51 900 333 444', 'carlos.ruiz@example.com', now() - interval '67 days', now() - interval '67 days'),
    ('00000000-0000-4000-8000-000000000033', v_shelter_id, 'Elena Vargas', '+51 900 555 666', 'elena.vargas@example.com', now() - interval '65 days', now() - interval '65 days'),
    ('00000000-0000-4000-8000-000000000034', v_shelter_id, 'Maria Fernandez', '+51 900 777 888', 'maria.fernandez@example.com', now() - interval '100 days', now() - interval '100 days'),
    ('00000000-0000-4000-8000-000000000035', v_shelter_id, 'Lucia Torres', '+51 900 999 000', 'lucia.torres@example.com', now() - interval '38 days', now() - interval '38 days'),
    ('00000000-0000-4000-8000-000000000036', v_shelter_id, 'Jorge Soto', '+51 900 123 456', 'jorge.soto@example.com', now() - interval '30 days', now() - interval '30 days')
  on conflict (id) do update
    set shelter_id = excluded.shelter_id,
        name = excluded.name,
        phone = excluded.phone,
        email = excluded.email,
        updated_at = excluded.updated_at;

  insert into public.candidates (
    id, shelter_id, person_id, animal_id, source, notes, status, created_at,
    updated_at
  )
  values
    ('00000000-0000-4000-8000-000000000051', v_shelter_id, '00000000-0000-4000-8000-000000000031', '00000000-0000-4000-8000-000000000011', 'Instagram', 'References reviewed by the shelter.', 'SELECTED', now() - interval '68 days', now() - interval '31 days'),
    ('00000000-0000-4000-8000-000000000052', v_shelter_id, '00000000-0000-4000-8000-000000000032', '00000000-0000-4000-8000-000000000011', 'Web form', null, 'NOT_SELECTED', now() - interval '67 days', now() - interval '31 days'),
    ('00000000-0000-4000-8000-000000000053', v_shelter_id, '00000000-0000-4000-8000-000000000033', '00000000-0000-4000-8000-000000000011', 'Web form', 'Applicant withdrew before evaluation.', 'WITHDRAWN', now() - interval '65 days', now() - interval '62 days'),
    ('00000000-0000-4000-8000-000000000054', v_shelter_id, '00000000-0000-4000-8000-000000000034', '00000000-0000-4000-8000-000000000012', 'Adoption event', null, 'SELECTED', now() - interval '100 days', now() - interval '90 days'),
    ('00000000-0000-4000-8000-000000000055', v_shelter_id, '00000000-0000-4000-8000-000000000035', '00000000-0000-4000-8000-000000000013', 'Web form', 'Positive first impression.', 'DECISION_PENDING', now() - interval '38 days', now() - interval '3 days'),
    ('00000000-0000-4000-8000-000000000056', v_shelter_id, '00000000-0000-4000-8000-000000000036', '00000000-0000-4000-8000-000000000014', 'Referral', 'Large yard available.', 'EVALUATED', now() - interval '30 days', now() - interval '28 days')
  on conflict (id) do update
    set shelter_id = excluded.shelter_id,
        person_id = excluded.person_id,
        animal_id = excluded.animal_id,
        source = excluded.source,
        notes = excluded.notes,
        status = excluded.status,
        updated_at = excluded.updated_at;

  insert into public.evaluations (
    id, shelter_id, candidate_id, overall_fit, positive_factors, concerns,
    notes, recommendation, created_by_user_id, created_at, updated_at
  )
  values
    ('00000000-0000-4000-8000-000000000071', v_shelter_id, '00000000-0000-4000-8000-000000000051', 'STRONG', array['Prior pet experience', 'Stable schedule']::text[], array[]::text[], 'Adopter lives close to the shelter.', 'CONTINUE', v_user_id, now() - interval '66 days', now() - interval '66 days'),
    ('00000000-0000-4000-8000-000000000072', v_shelter_id, '00000000-0000-4000-8000-000000000052', 'POSSIBLE', array['Interested in training']::text[], array['Limited availability']::text[], null, 'MORE_INFORMATION', v_user_id, now() - interval '64 days', now() - interval '64 days'),
    ('00000000-0000-4000-8000-000000000073', v_shelter_id, '00000000-0000-4000-8000-000000000054', 'STRONG', array['Home visit passed', 'Quiet household']::text[], array[]::text[], null, 'CONTINUE', v_user_id, now() - interval '98 days', now() - interval '98 days'),
    ('00000000-0000-4000-8000-000000000074', v_shelter_id, '00000000-0000-4000-8000-000000000055', 'STRONG', array['Cat experience']::text[], array[]::text[], 'Asked for follow-up material.', 'CONTINUE', v_user_id, now() - interval '36 days', now() - interval '36 days'),
    ('00000000-0000-4000-8000-000000000075', v_shelter_id, '00000000-0000-4000-8000-000000000056', 'POSSIBLE', array['Spacious home']::text[], array['Large dog experience unknown']::text[], null, 'CONTINUE', v_user_id, now() - interval '28 days', now() - interval '28 days')
  on conflict (id) do update
    set shelter_id = excluded.shelter_id,
        candidate_id = excluded.candidate_id,
        overall_fit = excluded.overall_fit,
        positive_factors = excluded.positive_factors,
        concerns = excluded.concerns,
        notes = excluded.notes,
        recommendation = excluded.recommendation,
        created_by_user_id = excluded.created_by_user_id,
        updated_at = excluded.updated_at;

  insert into public.meetings (
    id, shelter_id, candidate_id, type, scheduled_at, status, result, notes,
    rescheduled_from_meeting_id, created_at, updated_at
  )
  values
    ('00000000-0000-4000-8000-000000000081', v_shelter_id, '00000000-0000-4000-8000-000000000051', 'MEET_AND_GREET', now() - interval '61 days', 'RESCHEDULED', null, 'Original meeting postponed by the applicant.', null, now() - interval '61 days', now() - interval '60 days'),
    ('00000000-0000-4000-8000-000000000082', v_shelter_id, '00000000-0000-4000-8000-000000000051', 'MEET_AND_GREET', now() - interval '58 days', 'COMPLETED', 'STRONG_MATCH', 'Luna and Andrea interacted well.', '00000000-0000-4000-8000-000000000081', now() - interval '58 days', now() - interval '56 days'),
    ('00000000-0000-4000-8000-000000000083', v_shelter_id, '00000000-0000-4000-8000-000000000054', 'HOME_VISIT', now() - interval '95 days', 'COMPLETED', 'STRONG_MATCH', 'Suitable home observed.', null, now() - interval '95 days', now() - interval '94 days'),
    ('00000000-0000-4000-8000-000000000084', v_shelter_id, '00000000-0000-4000-8000-000000000055', 'MEET_AND_GREET', now() - interval '4 days', 'COMPLETED', 'GOOD', 'Nala and Lucia had a calm, positive meeting.', null, now() - interval '20 days', now() - interval '3 days')
  on conflict (id) do update
    set shelter_id = excluded.shelter_id,
        candidate_id = excluded.candidate_id,
        type = excluded.type,
        scheduled_at = excluded.scheduled_at,
        status = excluded.status,
        result = excluded.result,
        notes = excluded.notes,
        rescheduled_from_meeting_id = excluded.rescheduled_from_meeting_id,
        updated_at = excluded.updated_at;

  insert into public.adoptions (
    id, shelter_id, animal_id, candidate_id, adoption_date, handover_notes,
    adoption_photo_path, status, created_at
  )
  values
    ('00000000-0000-4000-8000-000000000091', v_shelter_id, '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000051', current_date - interval '31 days', 'Handover included food and leash.', null, 'ACTIVE', now() - interval '31 days'),
    ('00000000-0000-4000-8000-000000000092', v_shelter_id, '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000054', current_date - interval '90 days', 'Standard handover checklist.', null, 'RETURNED', now() - interval '90 days')
  on conflict (id) do update
    set shelter_id = excluded.shelter_id,
        animal_id = excluded.animal_id,
        candidate_id = excluded.candidate_id,
        adoption_date = excluded.adoption_date,
        handover_notes = excluded.handover_notes,
        adoption_photo_path = excluded.adoption_photo_path,
        status = excluded.status;

  insert into public.adoption_returns (
    id, shelter_id, adoption_id, returned_at, reason, notes,
    created_by_user_id, created_at
  )
  values
    ('00000000-0000-4000-8000-000000000101', v_shelter_id, '00000000-0000-4000-8000-000000000092', now() - interval '28 days', 'The adopter could not keep Mia after a household change.', 'Mia returned in good health.', v_user_id, now() - interval '28 days')
  on conflict (id) do update
    set shelter_id = excluded.shelter_id,
        adoption_id = excluded.adoption_id,
        returned_at = excluded.returned_at,
        reason = excluded.reason,
        notes = excluded.notes,
        created_by_user_id = excluded.created_by_user_id;

  insert into public.followups (
    id, shelter_id, adoption_id, due_date, status, outcome, notes, photo_path,
    completed_at, cancelled_at, cancellation_reason, rescheduled_from_followup_id,
    created_at, updated_at
  )
  values
    ('00000000-0000-4000-8000-000000000111', v_shelter_id, '00000000-0000-4000-8000-000000000091', current_date - interval '24 days', 'COMPLETED', 'EXCELLENT', 'Luna is settling in well.', null, now() - interval '23 days', null, null, null, now() - interval '31 days', now() - interval '23 days'),
    ('00000000-0000-4000-8000-000000000112', v_shelter_id, '00000000-0000-4000-8000-000000000091', current_date + interval '7 days', 'PENDING', null, null, null, null, null, null, null, now() - interval '31 days', now() - interval '31 days')
  on conflict (id) do update
    set shelter_id = excluded.shelter_id,
        adoption_id = excluded.adoption_id,
        due_date = excluded.due_date,
        status = excluded.status,
        outcome = excluded.outcome,
        notes = excluded.notes,
        photo_path = excluded.photo_path,
        completed_at = excluded.completed_at,
        cancelled_at = excluded.cancelled_at,
        cancellation_reason = excluded.cancellation_reason,
        rescheduled_from_followup_id = excluded.rescheduled_from_followup_id,
        updated_at = excluded.updated_at;

  insert into public.timeline_events (
    id, shelter_id, animal_id, event_type, domain_record_type, domain_record_id,
    data, occurred_at, created_at
  )
  values
    ('00000000-0000-4000-8000-000000000121', v_shelter_id, '00000000-0000-4000-8000-000000000011', 'ADOPTION_CONFIRMED', 'adoption', '00000000-0000-4000-8000-000000000091', '{}'::jsonb, now() - interval '31 days', now() - interval '31 days'),
    ('00000000-0000-4000-8000-000000000122', v_shelter_id, '00000000-0000-4000-8000-000000000011', 'FOLLOW_UPS_PLANNED', 'adoption', '00000000-0000-4000-8000-000000000091', jsonb_build_object('followup_count', 2), now() - interval '31 days', now() - interval '31 days'),
    ('00000000-0000-4000-8000-000000000129', v_shelter_id, '00000000-0000-4000-8000-000000000012', 'ADOPTION_CONFIRMED', 'adoption', '00000000-0000-4000-8000-000000000092', '{}'::jsonb, now() - interval '90 days', now() - interval '90 days'),
    ('00000000-0000-4000-8000-000000000130', v_shelter_id, '00000000-0000-4000-8000-000000000012', 'ADOPTION_RETURNED', 'adoption', '00000000-0000-4000-8000-000000000092', '{}'::jsonb, now() - interval '28 days', now() - interval '28 days'),
    ('00000000-0000-4000-8000-000000000131', v_shelter_id, '00000000-0000-4000-8000-000000000012', 'REEVALUATION_REQUIRED', 'animal', '00000000-0000-4000-8000-000000000012', '{}'::jsonb, now() - interval '28 days', now() - interval '28 days'),
    ('00000000-0000-4000-8000-000000000141', v_shelter_id, '00000000-0000-4000-8000-000000000013', 'CANDIDATE_CREATED', 'candidate', '00000000-0000-4000-8000-000000000055', jsonb_build_object('person', 'Lucia Torres'), now() - interval '38 days', now() - interval '38 days'),
    ('00000000-0000-4000-8000-000000000142', v_shelter_id, '00000000-0000-4000-8000-000000000013', 'EVALUATION_RECORDED', 'evaluation', '00000000-0000-4000-8000-000000000074', '{}'::jsonb, now() - interval '36 days', now() - interval '36 days'),
    ('00000000-0000-4000-8000-000000000150', v_shelter_id, '00000000-0000-4000-8000-000000000013', 'DECISION_PENDING', 'candidate', '00000000-0000-4000-8000-000000000055', '{}'::jsonb, now() - interval '3 days', now() - interval '3 days')
  on conflict (id) do update
    set shelter_id = excluded.shelter_id,
        animal_id = excluded.animal_id,
        event_type = excluded.event_type,
        domain_record_type = excluded.domain_record_type,
        domain_record_id = excluded.domain_record_id,
        data = excluded.data,
        occurred_at = excluded.occurred_at;
end;
$seed$;

commit;
