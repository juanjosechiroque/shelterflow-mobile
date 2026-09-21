export type AnimalStatus =
  | 'PREPARING'
  | 'READY'
  | 'IN_PROCESS'
  | 'ADOPTED'
  | 'REEVALUATION'
  | 'NOT_AVAILABLE';

export type AnimalSpecies = 'DOG' | 'CAT' | 'OTHER' | 'UNKNOWN';
export type AnimalSex = 'MALE' | 'FEMALE' | 'UNKNOWN';
export type AnimalSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'UNKNOWN';

export type CandidateStatus =
  | 'NEEDS_EVALUATION'
  | 'EVALUATED'
  | 'CONTACT_PENDING'
  | 'MEETING_SCHEDULED'
  | 'DECISION_PENDING'
  | 'SELECTED'
  | 'NOT_SELECTED'
  | 'WITHDRAWN';

export type TimelineEventType =
  | 'ANIMAL_READY'
  | 'CANDIDATE_CREATED'
  | 'EVALUATION_RECORDED'
  | 'MEETING_SCHEDULED'
  | 'ANIMAL_IN_PROCESS'
  | 'DECISION_PENDING'
  | 'ADOPTION_CONFIRMED'
  | 'FOLLOW_UPS_PLANNED'
  | 'ADOPTION_RETURNED'
  | 'REEVALUATION_REQUIRED';

export interface MockAnimal {
  id: string;
  name: string;
  species: AnimalSpecies;
  sex: AnimalSex;
  approximateAgeMonths: number | null;
  size: AnimalSize;
  status: AnimalStatus;
  visualTone: 'forest' | 'sky' | 'sand' | 'rose';
}

export interface MockCandidate {
  id: string;
  animalId: string;
  personName: string;
  status: CandidateStatus;
}

export interface MockTimelineEvent {
  id: string;
  animalId: string;
  type: TimelineEventType;
  occurredOn: string;
  personName?: string;
}
