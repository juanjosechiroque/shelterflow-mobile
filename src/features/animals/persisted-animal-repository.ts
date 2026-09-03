import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Json } from '@/lib/database.types';

export interface PersistedAnimal {
  id: string;
  name: string;
  species: string;
  sex: string;
  size: string;
  status: string;
  approximateAgeMonths: number | null;
  notes: string | null;
  primaryPhotoPath: string | null;
  updatedAt: string;
}

export interface PersistedTimelineEvent {
  id: string;
  eventType: string;
  occurredAt: string;
  data: Json | null;
}

interface AnimalRow {
  id: string;
  name: string;
  species: string;
  sex: string;
  size: string;
  status: string;
  approximate_age_months: number | null;
  notes: string | null;
  primary_photo_path: string | null;
  updated_at: string;
}

interface TimelineRow {
  id: string;
  event_type: string;
  occurred_at: string;
  data: Json | null;
}

function toAnimal(row: AnimalRow): PersistedAnimal {
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    sex: row.sex,
    size: row.size,
    status: row.status,
    approximateAgeMonths: row.approximate_age_months,
    notes: row.notes,
    primaryPhotoPath: row.primary_photo_path,
    updatedAt: row.updated_at,
  };
}

function toTimelineEvent(row: TimelineRow): PersistedTimelineEvent {
  return {
    id: row.id,
    eventType: row.event_type,
    occurredAt: row.occurred_at,
    data: row.data,
  };
}

const animalFields =
  'id, name, species, sex, size, status, approximate_age_months, notes, primary_photo_path, updated_at';

const timelineFields = 'id, event_type, occurred_at, data';

export async function listAnimalsForShelter(
  client: SupabaseClient<Database>,
  shelterId: string,
): Promise<PersistedAnimal[]> {
  const { data, error } = await client
    .from('animals')
    .select(animalFields)
    .eq('shelter_id', shelterId)
    .is('archived_at', null)
    .order('name', { ascending: true });

  if (error) throw error;

  return ((data ?? []) as unknown as AnimalRow[]).map(toAnimal);
}

export async function getAnimalById(
  client: SupabaseClient<Database>,
  animalId: string,
): Promise<PersistedAnimal | null> {
  const { data, error } = await client
    .from('animals')
    .select(animalFields)
    .eq('id', animalId)
    .maybeSingle();

  if (error) throw error;
  return data ? toAnimal(data as unknown as AnimalRow) : null;
}

export async function listTimelineForAnimal(
  client: SupabaseClient<Database>,
  animalId: string,
): Promise<PersistedTimelineEvent[]> {
  const { data, error } = await client
    .from('timeline_events')
    .select(timelineFields)
    .eq('animal_id', animalId)
    .order('occurred_at', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as TimelineRow[]).map(toTimelineEvent);
}

export type ReevaluationNextStatus = 'READY' | 'NOT_AVAILABLE';

export interface CompleteReevaluationInput {
  animalId: string;
  nextStatus: ReevaluationNextStatus;
}

export async function completeReevaluation(
  client: SupabaseClient<Database>,
  input: CompleteReevaluationInput,
): Promise<string> {
  const { data, error } = await client.rpc('complete_reevaluation', {
    p_animal_id: input.animalId,
    p_next_status: input.nextStatus,
  });

  if (error) throw error;
  if (data === null) throw new Error('supabase_rpc_result_missing');
  return data;
}
