import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/database.types';

export interface AdoptionDecisionCandidate {
  id: string;
  status: string;
  personName: string;
  animal: {
    id: string;
    name: string;
    status: string;
  };
}

interface CandidateRow {
  id: string;
  status: string;
  people: { name: string } | { name: string }[] | null;
  animals:
    | { id: string; name: string; status: string }
    | { id: string; name: string; status: string }[]
    | null;
}

function one<Row>(value: Row | Row[] | null): Row | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toDecisionCandidate(
  row: CandidateRow,
): AdoptionDecisionCandidate | null {
  const person = one(row.people);
  const animal = one(row.animals);

  if (!person || !animal) return null;

  return {
    id: row.id,
    status: row.status,
    personName: person.name,
    animal: {
      id: animal.id,
      name: animal.name,
      status: animal.status,
    },
  };
}

function isAdoptionDecisionCandidate(
  candidate: AdoptionDecisionCandidate | null,
): candidate is AdoptionDecisionCandidate {
  return candidate !== null;
}

const candidateFields =
  'id, status, people ( name ), animals ( id, name, status )';

export async function listPendingAdoptionDecisions(
  client: SupabaseClient<Database>,
): Promise<AdoptionDecisionCandidate[]> {
  const { data, error } = await client
    .from('candidates')
    .select(candidateFields)
    .eq('status', 'DECISION_PENDING')
    .order('updated_at', { ascending: true });

  if (error) throw error;

  return ((data ?? []) as unknown as CandidateRow[])
    .map(toDecisionCandidate)
    .filter(isAdoptionDecisionCandidate);
}

export async function getAdoptionDecisionCandidate(
  client: SupabaseClient<Database>,
  candidateId: string,
): Promise<AdoptionDecisionCandidate | null> {
  const { data, error } = await client
    .from('candidates')
    .select(candidateFields)
    .eq('id', candidateId)
    .maybeSingle();

  if (error) throw error;
  return data ? toDecisionCandidate(data as unknown as CandidateRow) : null;
}

export interface ConfirmAdoptionInput {
  candidateId: string;
  adoptionDate: string;
  handoverNotes: null;
  followupDueDates: string[];
}

export async function confirmAdoption(
  client: SupabaseClient<Database>,
  input: ConfirmAdoptionInput,
): Promise<string> {
  const { data, error } = await client.rpc('confirm_adoption', {
    p_candidate_id: input.candidateId,
    p_adoption_date: input.adoptionDate,
    p_handover_notes: input.handoverNotes,
    p_followup_due_dates: input.followupDueDates,
  });

  if (error) throw error;
  return data;
}
