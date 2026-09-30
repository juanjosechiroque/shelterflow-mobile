import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/database.types';
import type { Candidate } from './types';

interface PersonRow {
  id: string;
  shelter_id: string;
  name: string;
  phone: string;
  email: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AnimalRow {
  id: string;
  shelter_id: string;
  name: string;
  species: Candidate['animal']['species'];
  sex: Candidate['animal']['sex'];
  size: Candidate['animal']['size'];
  approximate_age_months: number | null;
  notes: string | null;
  primary_photo_path: string | null;
  status: Candidate['animal']['status'];
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CandidateRow {
  id: string;
  shelter_id: string;
  person_id: string;
  animal_id: string;
  source: string | null;
  notes: string | null;
  status: Candidate['status'];
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  person: PersonRow | PersonRow[] | null;
  animal: AnimalRow | AnimalRow[] | null;
}

const candidateFields = `
  id, shelter_id, person_id, animal_id, source, notes, status, archived_at, created_at, updated_at,
  person:people ( id, shelter_id, name, phone, email, archived_at, created_at, updated_at ),
  animal:animals ( id, shelter_id, name, species, sex, size, approximate_age_months, notes, primary_photo_path, status, archived_at, created_at, updated_at )
`;

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toCandidate(row: CandidateRow): Candidate | null {
  const person = one(row.person);
  const animal = one(row.animal);
  if (!person || !animal) return null;

  return { ...row, person, animal };
}

export async function listCandidates(
  client: SupabaseClient<Database>,
  shelterId: string,
): Promise<Candidate[]> {
  const { data, error } = await client
    .from('candidates')
    .select(candidateFields)
    .eq('shelter_id', shelterId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as CandidateRow[])
    .map(toCandidate)
    .filter((candidate): candidate is Candidate => candidate !== null);
}

export async function getCandidate(
  client: SupabaseClient<Database>,
  shelterId: string,
  candidateId: string,
): Promise<Candidate | null> {
  const { data, error } = await client
    .from('candidates')
    .select(candidateFields)
    .eq('shelter_id', shelterId)
    .eq('id', candidateId)
    .maybeSingle();

  if (error) throw error;
  return data ? toCandidate(data as unknown as CandidateRow) : null;
}

export async function listCandidatesByAnimal(
  client: SupabaseClient<Database>,
  shelterId: string,
  animalId: string,
): Promise<Candidate[]> {
  const { data, error } = await client
    .from('candidates')
    .select(candidateFields)
    .eq('shelter_id', shelterId)
    .eq('animal_id', animalId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as CandidateRow[])
    .map(toCandidate)
    .filter((candidate): candidate is Candidate => candidate !== null);
}
