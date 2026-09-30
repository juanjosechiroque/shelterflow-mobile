-- ShelterFlow fictitious fixture set — the reference definition of the two
-- deterministic shelters. It is no longer applied automatically: there is no
-- local Supabase stack (see docs/decisions/026-remove-local-supabase-test-stack.md).
-- Keep it as the canonical description of the fixture data; the hosted
-- development project is loaded from hosted-dev-seed.sql instead.
--
-- All identities are invented. Emails use example.com and provide no login capability.
--
-- Two login-capable users are described:
--   * admin@shelter.com / shelter2026        belongs to Huellitas Rescue and
--                                             is the visible manual demo
--                                             account.
--   * rls-fixture@example.com / rls-fixture-2026  belongs to Patitas Felices
--                                             and exists so the cross-shelter
--                                             boundary can be exercised by hand.
--                                             It is NEVER used as a manual demo.
-- Both passwords are bcrypt-hashed with `extensions.crypt(..., bf)`. These
-- credentials are development fixtures only and must never be used in any other
-- environment.

begin;

insert into public.shelters (id, name, country, created_at)
values
  ('00000000-0000-4000-8000-000000000001', 'Huellitas Rescue', 'Peru', now() - interval '180 days'),
  ('00000000-0000-4000-8000-000000000002', 'Patitas Felices', 'Argentina', now() - interval '90 days');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change, email_change_token_current, email_change_token_new, email_change_confirm_status, phone_change, phone_change_token, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'helena.rios@example.com', null, now() - interval '180 days', '', '', '', '', '', 0, '', '', '', '{}', '{}', now() - interval '180 days', now() - interval '180 days'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rafael.silva@example.com', null, now() - interval '170 days', '', '', '', '', '', 0, '', '', '', '{}', '{}', now() - interval '170 days', now() - interval '170 days'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@shelter.com', extensions.crypt('shelter2026', extensions.gen_salt('bf')), now() - interval '180 days', '', '', '', '', '', 0, '', '', '', '{"provider":"email","providers":["email"]}', '{}', now() - interval '180 days', now() - interval '180 days'),
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'luisa.mejia@example.com', null, now() - interval '90 days', '', '', '', '', '', 0, '', '', '', '{}', '{}', now() - interval '90 days', now() - interval '90 days'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-fixture@example.com', extensions.crypt('rls-fixture-2026', extensions.gen_salt('bf')), now() - interval '90 days', '', '', '', '', '', 0, '', '', '', '{"provider":"email","providers":["email"]}', '{}', now() - interval '90 days', now() - interval '90 days');

-- Link an email identity for each login-capable local user so GoTrue can
-- resolve password grants and account linking lookups the same way it does
-- for users it provisions through its own signup flow.
insert into auth.identities (id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at)
values
  (gen_random_uuid(), '00000000-0000-4000-8000-000000000103', 'email', '00000000-0000-4000-8000-000000000103', '{"sub":"00000000-0000-4000-8000-000000000103","email":"admin@shelter.com","email_verified":true}', null, now() - interval '180 days', now() - interval '180 days'),
  (gen_random_uuid(), '00000000-0000-4000-8000-000000000202', 'email', '00000000-0000-4000-8000-000000000202', '{"sub":"00000000-0000-4000-8000-000000000202","email":"rls-fixture@example.com","email_verified":true}', null, now() - interval '90 days', now() - interval '90 days');

insert into public.profiles (id, shelter_id, display_name, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'Helena Rios', now() - interval '180 days', now() - interval '180 days'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', 'Rafael Silva', now() - interval '170 days', now() - interval '170 days'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001', 'Administrador Huellitas', now() - interval '180 days', now() - interval '180 days'),
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000002', 'Luisa Mejia', now() - interval '90 days', now() - interval '90 days'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000002', 'Fixture Aislamiento', now() - interval '90 days', now() - interval '90 days');

insert into public.animals (id, shelter_id, name, species, sex, approximate_age_months, size, primary_photo_path, notes, status, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 'Luna', 'DOG', 'FEMALE', 24, 'MEDIUM', 'animals/luna/primary.jpg', 'Calm and affectionate mixed-breed dog.', 'ADOPTED', now() - interval '78 days', now() - interval '31 days'),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', 'Mia', 'CAT', 'FEMALE', 36, 'SMALL', 'animals/mia/primary.jpg', 'Quiet indoor cat that returned after an adoption trial.', 'REEVALUATION', now() - interval '120 days', now() - interval '28 days'),
  ('00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000001', 'Nala', 'CAT', 'FEMALE', null, 'MEDIUM', null, 'Shy at first, warms up slowly.', 'IN_PROCESS', now() - interval '45 days', now() - interval '20 days'),
  ('00000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000001', 'Bruno', 'DOG', 'MALE', 72, 'LARGE', 'animals/bruno/primary.jpg', 'Senior dog looking for a calm home.', 'READY', now() - interval '60 days', now() - interval '28 days'),
  ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000001', 'Toby', 'DOG', 'MALE', 18, 'SMALL', null, 'Energetic small dog.', 'READY', now() - interval '50 days', now() - interval '45 days'),
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000002', 'Coco', 'DOG', 'MALE', 14, 'SMALL', 'animals/coco/primary.jpg', null, 'READY', now() - interval '20 days', now() - interval '15 days');

insert into public.people (id, shelter_id, name, phone, email, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000031', '00000000-0000-4000-8000-000000000001', 'Andrea Perez', '+51 900 111 222', 'andrea.perez@example.com', now() - interval '68 days', now() - interval '68 days'),
  ('00000000-0000-4000-8000-000000000032', '00000000-0000-4000-8000-000000000001', 'Carlos Ruiz', '+51 900 333 444', 'carlos.ruiz@example.com', now() - interval '67 days', now() - interval '67 days'),
  ('00000000-0000-4000-8000-000000000033', '00000000-0000-4000-8000-000000000001', 'Elena Vargas', '+51 900 555 666', 'elena.vargas@example.com', now() - interval '65 days', now() - interval '65 days'),
  ('00000000-0000-4000-8000-000000000034', '00000000-0000-4000-8000-000000000001', 'Maria Fernandez', '+51 900 777 888', 'maria.fernandez@example.com', now() - interval '100 days', now() - interval '100 days'),
  ('00000000-0000-4000-8000-000000000035', '00000000-0000-4000-8000-000000000001', 'Lucia Torres', '+51 900 999 000', 'lucia.torres@example.com', now() - interval '38 days', now() - interval '38 days'),
  ('00000000-0000-4000-8000-000000000036', '00000000-0000-4000-8000-000000000001', 'Jorge Soto', '+51 900 123 456', 'jorge.soto@example.com', now() - interval '30 days', now() - interval '30 days'),
  ('00000000-0000-4000-8000-000000000041', '00000000-0000-4000-8000-000000000002', 'Valeria Gomez', '+54 900 222 333', 'valeria.gomez@example.com', now() - interval '10 days', now() - interval '10 days');

insert into public.candidates (id, shelter_id, person_id, animal_id, source, notes, status, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000051', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000031', '00000000-0000-4000-8000-000000000011', 'Instagram', 'References reviewed by the shelter.', 'SELECTED', now() - interval '68 days', now() - interval '31 days'),
  ('00000000-0000-4000-8000-000000000052', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000032', '00000000-0000-4000-8000-000000000011', 'Web form', null, 'NOT_SELECTED', now() - interval '67 days', now() - interval '31 days'),
  ('00000000-0000-4000-8000-000000000053', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000033', '00000000-0000-4000-8000-000000000011', 'Web form', 'Applicant withdrew before evaluation.', 'WITHDRAWN', now() - interval '65 days', now() - interval '62 days'),
  ('00000000-0000-4000-8000-000000000054', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000034', '00000000-0000-4000-8000-000000000012', 'Adoption event', null, 'SELECTED', now() - interval '100 days', now() - interval '90 days'),
  ('00000000-0000-4000-8000-000000000055', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000035', '00000000-0000-4000-8000-000000000013', 'Web form', 'Positive first impression.', 'DECISION_PENDING', now() - interval '38 days', now() - interval '3 days'),
  ('00000000-0000-4000-8000-000000000056', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000036', '00000000-0000-4000-8000-000000000014', 'Referral', 'Large yard available.', 'EVALUATED', now() - interval '30 days', now() - interval '28 days'),
  ('00000000-0000-4000-8000-000000000061', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000041', '00000000-0000-4000-8000-000000000021', 'Web form', 'First-time applicant.', 'NEEDS_EVALUATION', now() - interval '10 days', now() - interval '10 days');

insert into public.evaluations (id, shelter_id, candidate_id, overall_fit, positive_factors, concerns, notes, recommendation, created_by_user_id, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000071', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000051', 'STRONG', array['Prior pet experience', 'Stable schedule']::text[], array[]::text[], 'Adopter lives close to the shelter.', 'CONTINUE', '00000000-0000-4000-8000-000000000101', now() - interval '66 days', now() - interval '66 days'),
  ('00000000-0000-4000-8000-000000000072', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000052', 'POSSIBLE', array['Interested in training']::text[], array['Limited availability']::text[], null, 'MORE_INFORMATION', '00000000-0000-4000-8000-000000000101', now() - interval '64 days', now() - interval '64 days'),
  ('00000000-0000-4000-8000-000000000073', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000054', 'STRONG', array['Home visit passed', 'Quiet household']::text[], array[]::text[], null, 'CONTINUE', '00000000-0000-4000-8000-000000000101', now() - interval '98 days', now() - interval '98 days'),
  ('00000000-0000-4000-8000-000000000074', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000055', 'STRONG', array['Cat experience']::text[], array[]::text[], 'Asked for follow-up material.', 'CONTINUE', '00000000-0000-4000-8000-000000000102', now() - interval '36 days', now() - interval '36 days'),
  ('00000000-0000-4000-8000-000000000075', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000056', 'POSSIBLE', array['Spacious home']::text[], array['Large dog experience unknown']::text[], null, 'CONTINUE', '00000000-0000-4000-8000-000000000101', now() - interval '28 days', now() - interval '28 days');

insert into public.meetings (id, shelter_id, candidate_id, type, scheduled_at, status, result, notes, rescheduled_from_meeting_id, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000081', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000051', 'MEET_AND_GREET', now() - interval '61 days', 'RESCHEDULED', null, 'Original meeting postponed by the applicant.', null, now() - interval '61 days', now() - interval '60 days'),
  ('00000000-0000-4000-8000-000000000082', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000051', 'MEET_AND_GREET', now() - interval '58 days', 'COMPLETED', 'STRONG_MATCH', 'Luna and Andrea interacted well.', '00000000-0000-4000-8000-000000000081', now() - interval '58 days', now() - interval '56 days'),
  ('00000000-0000-4000-8000-000000000083', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000054', 'HOME_VISIT', now() - interval '95 days', 'COMPLETED', 'STRONG_MATCH', 'Suitable home observed.', null, now() - interval '95 days', now() - interval '94 days'),
  ('00000000-0000-4000-8000-000000000084', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000055', 'MEET_AND_GREET', now() - interval '4 days', 'COMPLETED', 'GOOD', 'Nala and Lucia had a calm, positive meeting.', null, now() - interval '20 days', now() - interval '3 days');

insert into public.adoptions (id, shelter_id, animal_id, candidate_id, adoption_date, handover_notes, adoption_photo_path, status, created_at)
values
  ('00000000-0000-4000-8000-000000000091', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000051', current_date - interval '31 days', 'Handover included food and leash.', 'adoptions/00000000-0000-4000-8000-000000000091/handover.jpg', 'ACTIVE', now() - interval '31 days'),
  ('00000000-0000-4000-8000-000000000092', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000054', current_date - interval '90 days', 'Standard handover checklist.', null, 'RETURNED', now() - interval '90 days');

insert into public.adoption_returns (id, shelter_id, adoption_id, returned_at, reason, notes, created_by_user_id, created_at)
values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000092', now() - interval '28 days', 'The adopter could not keep Mia after a household change.', 'Mia returned in good health.', '00000000-0000-4000-8000-000000000101', now() - interval '28 days');

insert into public.followups (id, shelter_id, adoption_id, due_date, status, outcome, notes, photo_path, completed_at, cancelled_at, cancellation_reason, rescheduled_from_followup_id, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000111', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000091', current_date - interval '24 days', 'COMPLETED', 'EXCELLENT', 'Luna is settling in well.', 'followups/00000000-0000-4000-8000-000000000111/photo.jpg', now() - interval '23 days', null, null, null, now() - interval '31 days', now() - interval '23 days'),
  ('00000000-0000-4000-8000-000000000112', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000091', current_date - interval '1 day', 'COMPLETED', 'GOOD', 'On track.', null, now() - interval '1 day', null, null, null, now() - interval '31 days', now() - interval '1 day'),
  ('00000000-0000-4000-8000-000000000113', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000091', current_date + interval '29 days', 'PENDING', null, null, null, null, null, null, null, now() - interval '31 days', now() - interval '31 days'),
  ('00000000-0000-4000-8000-000000000114', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000092', current_date - interval '83 days', 'COMPLETED', 'GOOD', 'First check went well.', null, now() - interval '82 days', null, null, null, now() - interval '90 days', now() - interval '82 days'),
  ('00000000-0000-4000-8000-000000000115', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000092', current_date - interval '60 days', 'RESCHEDULED', null, 'Moved to a later date.', null, null, null, null, null, now() - interval '90 days', now() - interval '75 days'),
  ('00000000-0000-4000-8000-000000000116', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000092', current_date - interval '30 days', 'CANCELLED', null, null, null, null, now() - interval '28 days', 'ADOPTION_RETURNED', null, now() - interval '90 days', now() - interval '28 days'),
  ('00000000-0000-4000-8000-000000000117', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000092', current_date - interval '45 days', 'COMPLETED', 'GOOD', 'Rescheduled check completed.', null, now() - interval '44 days', null, null, '00000000-0000-4000-8000-000000000115', now() - interval '75 days', now() - interval '44 days');

insert into public.timeline_events (id, shelter_id, animal_id, event_type, domain_record_type, domain_record_id, data, occurred_at, created_at)
values
  ('00000000-0000-4000-8000-000000000121', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'ANIMAL_READY', 'animal', '00000000-0000-4000-8000-000000000011', '{}', now() - interval '75 days', now() - interval '75 days'),
  ('00000000-0000-4000-8000-000000000122', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'CANDIDATE_CREATED', 'candidate', '00000000-0000-4000-8000-000000000051', '{"person": "Andrea Perez"}', now() - interval '68 days', now() - interval '68 days'),
  ('00000000-0000-4000-8000-000000000123', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'EVALUATION_RECORDED', 'evaluation', '00000000-0000-4000-8000-000000000071', '{}', now() - interval '66 days', now() - interval '66 days'),
  ('00000000-0000-4000-8000-000000000124', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'MEETING_SCHEDULED', 'meeting', '00000000-0000-4000-8000-000000000082', '{}', now() - interval '58 days', now() - interval '58 days'),
  ('00000000-0000-4000-8000-000000000125', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'ANIMAL_IN_PROCESS', 'animal', '00000000-0000-4000-8000-000000000011', '{}', now() - interval '58 days', now() - interval '58 days'),
  ('00000000-0000-4000-8000-000000000126', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'DECISION_PENDING', 'candidate', '00000000-0000-4000-8000-000000000051', '{}', now() - interval '35 days', now() - interval '35 days'),
  ('00000000-0000-4000-8000-000000000127', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'ADOPTION_CONFIRMED', 'adoption', '00000000-0000-4000-8000-000000000091', '{}', now() - interval '31 days', now() - interval '31 days'),
  ('00000000-0000-4000-8000-000000000128', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'FOLLOW_UPS_PLANNED', 'adoption', '00000000-0000-4000-8000-000000000091', '{}', now() - interval '31 days', now() - interval '31 days'),
  ('00000000-0000-4000-8000-000000000129', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', 'ANIMAL_READY', 'animal', '00000000-0000-4000-8000-000000000012', '{}', now() - interval '115 days', now() - interval '115 days'),
  ('00000000-0000-4000-8000-000000000130', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', 'CANDIDATE_CREATED', 'candidate', '00000000-0000-4000-8000-000000000054', '{"person": "Maria Fernandez"}', now() - interval '100 days', now() - interval '100 days'),
  ('00000000-0000-4000-8000-000000000131', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', 'EVALUATION_RECORDED', 'evaluation', '00000000-0000-4000-8000-000000000073', '{}', now() - interval '98 days', now() - interval '98 days'),
  ('00000000-0000-4000-8000-000000000132', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', 'MEETING_SCHEDULED', 'meeting', '00000000-0000-4000-8000-000000000083', '{}', now() - interval '95 days', now() - interval '95 days'),
  ('00000000-0000-4000-8000-000000000133', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', 'ANIMAL_IN_PROCESS', 'animal', '00000000-0000-4000-8000-000000000012', '{}', now() - interval '95 days', now() - interval '95 days'),
  ('00000000-0000-4000-8000-000000000134', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', 'DECISION_PENDING', 'candidate', '00000000-0000-4000-8000-000000000054', '{}', now() - interval '92 days', now() - interval '92 days'),
  ('00000000-0000-4000-8000-000000000135', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', 'ADOPTION_CONFIRMED', 'adoption', '00000000-0000-4000-8000-000000000092', '{}', now() - interval '90 days', now() - interval '90 days'),
  ('00000000-0000-4000-8000-000000000136', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', 'FOLLOW_UPS_PLANNED', 'adoption', '00000000-0000-4000-8000-000000000092', '{}', now() - interval '90 days', now() - interval '90 days'),
  ('00000000-0000-4000-8000-000000000137', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', 'ADOPTION_RETURNED', 'adoption', '00000000-0000-4000-8000-000000000092', '{}', now() - interval '28 days', now() - interval '28 days'),
  ('00000000-0000-4000-8000-000000000138', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', 'REEVALUATION_REQUIRED', 'animal', '00000000-0000-4000-8000-000000000012', '{}', now() - interval '28 days', now() - interval '28 days'),
  ('00000000-0000-4000-8000-000000000139', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000013', 'ANIMAL_READY', 'animal', '00000000-0000-4000-8000-000000000013', '{}', now() - interval '40 days', now() - interval '40 days'),
  ('00000000-0000-4000-8000-000000000140', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000013', 'CANDIDATE_CREATED', 'candidate', '00000000-0000-4000-8000-000000000055', '{"person": "Lucia Torres"}', now() - interval '38 days', now() - interval '38 days'),
  ('00000000-0000-4000-8000-000000000141', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000013', 'EVALUATION_RECORDED', 'evaluation', '00000000-0000-4000-8000-000000000074', '{}', now() - interval '36 days', now() - interval '36 days'),
  ('00000000-0000-4000-8000-000000000142', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000013', 'MEETING_SCHEDULED', 'meeting', '00000000-0000-4000-8000-000000000084', '{}', now() - interval '20 days', now() - interval '20 days'),
  ('00000000-0000-4000-8000-000000000143', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000013', 'ANIMAL_IN_PROCESS', 'animal', '00000000-0000-4000-8000-000000000013', '{}', now() - interval '20 days', now() - interval '20 days'),
  ('00000000-0000-4000-8000-000000000144', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000014', 'ANIMAL_READY', 'animal', '00000000-0000-4000-8000-000000000014', '{}', now() - interval '55 days', now() - interval '55 days'),
  ('00000000-0000-4000-8000-000000000145', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000014', 'CANDIDATE_CREATED', 'candidate', '00000000-0000-4000-8000-000000000056', '{"person": "Jorge Soto"}', now() - interval '30 days', now() - interval '30 days'),
  ('00000000-0000-4000-8000-000000000146', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000014', 'EVALUATION_RECORDED', 'evaluation', '00000000-0000-4000-8000-000000000075', '{}', now() - interval '28 days', now() - interval '28 days'),
  ('00000000-0000-4000-8000-000000000147', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000015', 'ANIMAL_READY', 'animal', '00000000-0000-4000-8000-000000000015', '{}', now() - interval '45 days', now() - interval '45 days'),
  ('00000000-0000-4000-8000-000000000148', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000021', 'ANIMAL_READY', 'animal', '00000000-0000-4000-8000-000000000021', '{}', now() - interval '15 days', now() - interval '15 days'),
  ('00000000-0000-4000-8000-000000000149', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000021', 'CANDIDATE_CREATED', 'candidate', '00000000-0000-4000-8000-000000000061', '{"person": "Valeria Gomez"}', now() - interval '10 days', now() - interval '10 days'),
  ('00000000-0000-4000-8000-000000000150', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000013', 'DECISION_PENDING', 'candidate', '00000000-0000-4000-8000-000000000055', '{}', now() - interval '3 days', now() - interval '3 days');

commit;
