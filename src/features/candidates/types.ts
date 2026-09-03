export type CandidateStatus =
  | 'NEEDS_EVALUATION'
  | 'EVALUATED'
  | 'CONTACT_PENDING'
  | 'MEETING_SCHEDULED'
  | 'DECISION_PENDING'
  | 'SELECTED'
  | 'NOT_SELECTED'
  | 'WITHDRAWN';

export type CandidateSource =
  'REFERRAL' | 'APPLICATION' | 'WALK_IN' | 'PREVIOUS_ADOPTER' | 'UNKNOWN';

export interface Person {
  id: string;
  shelter_id: string;
  name: string;
  phone: string;
  email: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Animal {
  id: string;
  shelter_id: string;
  name: string;
  species: AnimalSpecies;
  sex: AnimalSex;
  size: AnimalSize;
  approximate_age_months: number | null;
  notes: string | null;
  primary_photo_path: string | null;
  status: AnimalStatus;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export type AnimalSpecies = 'DOG' | 'CAT' | 'OTHER' | 'UNKNOWN';
export type AnimalSex = 'MALE' | 'FEMALE' | 'UNKNOWN';
export type AnimalSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'UNKNOWN';
export type AnimalStatus =
  | 'PREPARING'
  | 'READY'
  | 'IN_PROCESS'
  | 'ADOPTED'
  | 'REEVALUATION'
  | 'NOT_AVAILABLE';

export interface MockPerson {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

export interface MockCandidateDetail {
  id: string;
  animalId: string;
  person: MockPerson;
  status: CandidateStatus;
  source: string | null;
  applicationDate: string;
  notes?: string;
}

export interface Candidate {
  id: string;
  shelter_id: string;
  person_id: string;
  animal_id: string;
  // `candidates.source` is free-form text in the schema (no CHECK constraint);
  // presenters map known `CandidateSource` values and fall back for the rest.
  source: string | null;
  notes: string | null;
  status: CandidateStatus;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  person: Person;
  animal: Animal;
}
