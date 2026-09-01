import type { TFunction } from 'i18next';

import type {
  AnimalSex,
  AnimalSize,
  AnimalSpecies,
  AnimalStatus,
  CandidateStatus,
  MockAnimal,
  MockTimelineEvent,
  TimelineEventType,
} from './types';

const advancedCandidateStatuses: ReadonlySet<CandidateStatus> = new Set([
  'MEETING_SCHEDULED',
  'DECISION_PENDING',
]);

const terminalCandidateStatuses: ReadonlySet<CandidateStatus> = new Set([
  'SELECTED',
  'NOT_SELECTED',
  'WITHDRAWN',
]);

export type AnimalFilter =
  'ALL' | 'READY' | 'IN_PROCESS' | 'ADOPTED' | 'REEVALUATION';

const statusKeys: Record<
  AnimalStatus,
  | 'animals.status.preparing'
  | 'animals.status.ready'
  | 'animals.status.inProcess'
  | 'animals.status.adopted'
  | 'animals.status.reevaluation'
  | 'animals.status.notAvailable'
> = {
  ADOPTED: 'animals.status.adopted',
  IN_PROCESS: 'animals.status.inProcess',
  NOT_AVAILABLE: 'animals.status.notAvailable',
  PREPARING: 'animals.status.preparing',
  READY: 'animals.status.ready',
  REEVALUATION: 'animals.status.reevaluation',
};

const speciesKeys: Record<
  AnimalSpecies,
  | 'animals.species.dog'
  | 'animals.species.cat'
  | 'animals.species.other'
  | 'animals.species.unknown'
> = {
  CAT: 'animals.species.cat',
  DOG: 'animals.species.dog',
  OTHER: 'animals.species.other',
  UNKNOWN: 'animals.species.unknown',
};

const sexKeys: Record<
  AnimalSex,
  'animals.sex.male' | 'animals.sex.female' | 'animals.sex.unknown'
> = {
  FEMALE: 'animals.sex.female',
  MALE: 'animals.sex.male',
  UNKNOWN: 'animals.sex.unknown',
};

const sizeKeys: Record<
  AnimalSize,
  | 'animals.size.small'
  | 'animals.size.medium'
  | 'animals.size.large'
  | 'animals.size.unknown'
> = {
  LARGE: 'animals.size.large',
  MEDIUM: 'animals.size.medium',
  SMALL: 'animals.size.small',
  UNKNOWN: 'animals.size.unknown',
};

export function getAnimalStatusLabel(
  t: TFunction,
  status: AnimalStatus,
): string {
  return t(statusKeys[status]);
}

export function getAnimalSpeciesLabel(
  t: TFunction,
  species: AnimalSpecies,
): string {
  return t(speciesKeys[species]);
}

export function getAnimalSexLabel(t: TFunction, sex: AnimalSex): string {
  return t(sexKeys[sex]);
}

export function getAnimalSizeLabel(t: TFunction, size: AnimalSize): string {
  return t(sizeKeys[size]);
}

export function getApproximateAgeLabel(
  t: TFunction,
  approximateAgeMonths: number | null,
): string {
  if (approximateAgeMonths === null) {
    return t('animals.age.unknown');
  }

  if (approximateAgeMonths < 24) {
    return t('animals.age.months', { count: approximateAgeMonths });
  }

  return t('animals.age.years', {
    count: Math.floor(approximateAgeMonths / 12),
  });
}

export function filterAnimals(
  animals: readonly MockAnimal[],
  filter: AnimalFilter,
): readonly MockAnimal[] {
  return filter === 'ALL'
    ? animals
    : animals.filter((animal) => animal.status === filter);
}

const candidateStatusKeys: Record<
  CandidateStatus,
  | 'animals.candidates.status.needsEvaluation'
  | 'animals.candidates.status.evaluated'
  | 'animals.candidates.status.contactPending'
  | 'animals.candidates.status.meetingScheduled'
  | 'animals.candidates.status.decisionPending'
  | 'animals.candidates.status.selected'
  | 'animals.candidates.status.notSelected'
  | 'animals.candidates.status.withdrawn'
> = {
  CONTACT_PENDING: 'animals.candidates.status.contactPending',
  DECISION_PENDING: 'animals.candidates.status.decisionPending',
  EVALUATED: 'animals.candidates.status.evaluated',
  MEETING_SCHEDULED: 'animals.candidates.status.meetingScheduled',
  NEEDS_EVALUATION: 'animals.candidates.status.needsEvaluation',
  NOT_SELECTED: 'animals.candidates.status.notSelected',
  SELECTED: 'animals.candidates.status.selected',
  WITHDRAWN: 'animals.candidates.status.withdrawn',
};

const timelineEventKeys: Record<
  TimelineEventType,
  | 'animals.timeline.events.animalReady'
  | 'animals.timeline.events.candidateCreated'
  | 'animals.timeline.events.evaluationRecorded'
  | 'animals.timeline.events.meetingScheduled'
  | 'animals.timeline.events.animalInProcess'
  | 'animals.timeline.events.decisionPending'
  | 'animals.timeline.events.adoptionConfirmed'
  | 'animals.timeline.events.followUpsPlanned'
  | 'animals.timeline.events.adoptionReturned'
  | 'animals.timeline.events.reevaluationRequired'
> = {
  ADOPTION_CONFIRMED: 'animals.timeline.events.adoptionConfirmed',
  ADOPTION_RETURNED: 'animals.timeline.events.adoptionReturned',
  ANIMAL_IN_PROCESS: 'animals.timeline.events.animalInProcess',
  ANIMAL_READY: 'animals.timeline.events.animalReady',
  CANDIDATE_CREATED: 'animals.timeline.events.candidateCreated',
  DECISION_PENDING: 'animals.timeline.events.decisionPending',
  EVALUATION_RECORDED: 'animals.timeline.events.evaluationRecorded',
  FOLLOW_UPS_PLANNED: 'animals.timeline.events.followUpsPlanned',
  MEETING_SCHEDULED: 'animals.timeline.events.meetingScheduled',
  REEVALUATION_REQUIRED: 'animals.timeline.events.reevaluationRequired',
};

export function getCandidateStatusLabel(
  t: TFunction,
  status: CandidateStatus,
): string {
  return t(candidateStatusKeys[status]);
}

export function getTimelineEventLabel(
  t: TFunction,
  event: MockTimelineEvent,
  animalName: string,
): string {
  return t(timelineEventKeys[event.type], {
    animalName,
    personName: event.personName ?? '',
  });
}

export function parseOccurredOn(occurredOn: string): Date {
  const [year, month, day] = occurredOn.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function hasAdvancedCandidate(
  candidates: readonly { status: CandidateStatus }[],
): boolean {
  return candidates.some((candidate) =>
    advancedCandidateStatuses.has(candidate.status),
  );
}

export function hasActiveCandidate(
  candidates: readonly { status: CandidateStatus }[],
): boolean {
  return candidates.some(
    (candidate) => !terminalCandidateStatuses.has(candidate.status),
  );
}
