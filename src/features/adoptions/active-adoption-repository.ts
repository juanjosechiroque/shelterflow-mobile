import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/database.types';

export interface AdoptionRecord {
  id: string;
  status: string;
  adoptionDate: string;
  handoverNotes: string | null;
  animal: {
    id: string;
    name: string;
    status: string;
  };
  candidate: {
    id: string;
    status: string;
    person: {
      id: string;
      name: string;
    };
  };
}

export interface AdoptionFollowupRecord {
  id: string;
  adoptionId: string;
  dueDate: string;
  status: string;
  outcome: string | null;
  notes: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
}

interface AdoptionRow {
  id: string;
  status: string;
  adoption_date: string;
  handover_notes: string | null;
  animal_id: string;
  animals:
    | {
        id: string;
        name: string;
        status: string;
      }
    | { id: string; name: string; status: string }[]
    | null;
  candidate_id: string;
  candidates:
    | {
        id: string;
        status: string;
        person_id: string;
        people:
          { id: string; name: string } | { id: string; name: string }[] | null;
      }
    | {
        id: string;
        status: string;
        person_id: string;
        people:
          { id: string; name: string } | { id: string; name: string }[] | null;
      }[]
    | null;
}

interface FollowupRow {
  id: string;
  adoption_id: string;
  due_date: string;
  status: string;
  outcome: string | null;
  notes: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toAdoptionRecord(row: AdoptionRow): AdoptionRecord | null {
  const animal = one(row.animals);
  const candidate = one(row.candidates);
  const person = candidate ? one(candidate.people) : null;

  if (!animal || !candidate || !person) return null;

  return {
    id: row.id,
    status: row.status,
    adoptionDate: row.adoption_date,
    handoverNotes: row.handover_notes,
    animal: {
      id: animal.id,
      name: animal.name,
      status: animal.status,
    },
    candidate: {
      id: candidate.id,
      status: candidate.status,
      person: {
        id: person.id,
        name: person.name,
      },
    },
  };
}

function toFollowupRecord(row: FollowupRow): AdoptionFollowupRecord {
  return {
    id: row.id,
    adoptionId: row.adoption_id,
    dueDate: row.due_date,
    status: row.status,
    outcome: row.outcome,
    notes: row.notes,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    cancellationReason: row.cancellation_reason,
  };
}

const adoptionFields =
  'id, status, adoption_date, handover_notes, animal_id, animals ( id, name, status ), candidate_id, candidates ( id, status, person_id, people ( id, name ) )';

const followupFields =
  'id, adoption_id, due_date, status, outcome, notes, completed_at, cancelled_at, cancellation_reason';

export async function listActiveAdoptions(
  client: SupabaseClient<Database>,
): Promise<AdoptionRecord[]> {
  const { data, error } = await client
    .from('adoptions')
    .select(adoptionFields)
    .eq('status', 'ACTIVE')
    .order('adoption_date', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as AdoptionRow[])
    .map(toAdoptionRecord)
    .filter((record): record is AdoptionRecord => record !== null);
}

export async function getAdoptionById(
  client: SupabaseClient<Database>,
  adoptionId: string,
): Promise<AdoptionRecord | null> {
  const { data, error } = await client
    .from('adoptions')
    .select(adoptionFields)
    .eq('id', adoptionId)
    .maybeSingle();

  if (error) throw error;
  return data ? toAdoptionRecord(data as unknown as AdoptionRow) : null;
}

export async function getActiveAdoptionByAnimal(
  client: SupabaseClient<Database>,
  animalId: string,
): Promise<AdoptionRecord | null> {
  const { data, error } = await client
    .from('adoptions')
    .select(adoptionFields)
    .eq('animal_id', animalId)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (error) throw error;
  return data ? toAdoptionRecord(data as unknown as AdoptionRow) : null;
}

export async function listFollowupsForAdoption(
  client: SupabaseClient<Database>,
  adoptionId: string,
): Promise<AdoptionFollowupRecord[]> {
  const { data, error } = await client
    .from('followups')
    .select(followupFields)
    .eq('adoption_id', adoptionId)
    .order('due_date', { ascending: true });

  if (error) throw error;

  return ((data ?? []) as unknown as FollowupRow[]).map(toFollowupRecord);
}

export interface CompleteFollowupInput {
  followupId: string;
  adoptionId: string;
  outcome: string;
  notes: string | null;
}

export async function completeFollowup(
  client: SupabaseClient<Database>,
  input: CompleteFollowupInput,
): Promise<string> {
  const { data, error } = await client.rpc('complete_followup', {
    p_followup_id: input.followupId,
    p_outcome: input.outcome,
    p_notes:
      input.notes as Database['public']['Functions']['complete_followup']['Args']['p_notes'],
  });

  if (error) throw error;
  if (data === null) throw new Error('supabase_rpc_result_missing');
  return data;
}

export interface ReturnAdoptionInput {
  adoptionId: string;
  reason: string;
  notes: string | null;
}

export async function returnAdoption(
  client: SupabaseClient<Database>,
  input: ReturnAdoptionInput,
): Promise<string> {
  const { data, error } = await client.rpc('return_adoption', {
    p_adoption_id: input.adoptionId,
    p_reason: input.reason,
    p_notes:
      input.notes as Database['public']['Functions']['return_adoption']['Args']['p_notes'],
  });

  if (error) throw error;
  if (data === null) throw new Error('supabase_rpc_result_missing');
  return data;
}
