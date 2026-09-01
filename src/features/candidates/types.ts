export type CandidateSource =
  'REFERRAL' | 'APPLICATION' | 'WALK_IN' | 'PREVIOUS_ADOPTER' | 'UNKNOWN';

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
  status: import('@/features/animals/types').CandidateStatus;
  source: CandidateSource;
  applicationDate: string;
  notes?: string;
}
