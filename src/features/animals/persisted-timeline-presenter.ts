import type { TFunction } from 'i18next';

import type { PersistedTimelineEvent } from './persisted-animal-repository';

export type PersistedTimelineEventType =
  | 'ANIMAL_READY'
  | 'ANIMAL_NOT_AVAILABLE'
  | 'CANDIDATE_CREATED'
  | 'EVALUATION_RECORDED'
  | 'MEETING_SCHEDULED'
  | 'ANIMAL_IN_PROCESS'
  | 'DECISION_PENDING'
  | 'ADOPTION_CONFIRMED'
  | 'FOLLOW_UPS_PLANNED'
  | 'FOLLOW_UP_COMPLETED'
  | 'ADOPTION_RETURNED'
  | 'REEVALUATION_REQUIRED';

const persistedTimelineEventKeys: Record<
  PersistedTimelineEventType,
  | 'animals.timeline.events.animalReady'
  | 'animals.timeline.events.animalNotAvailable'
  | 'animals.timeline.events.candidateCreated'
  | 'animals.timeline.events.evaluationRecorded'
  | 'animals.timeline.events.meetingScheduled'
  | 'animals.timeline.events.animalInProcess'
  | 'animals.timeline.events.decisionPending'
  | 'animals.timeline.events.adoptionConfirmed'
  | 'animals.timeline.events.followUpsPlanned'
  | 'animals.timeline.events.followUpCompleted'
  | 'animals.timeline.events.adoptionReturned'
  | 'animals.timeline.events.reevaluationRequired'
> = {
  ADOPTION_CONFIRMED: 'animals.timeline.events.adoptionConfirmed',
  ADOPTION_RETURNED: 'animals.timeline.events.adoptionReturned',
  ANIMAL_IN_PROCESS: 'animals.timeline.events.animalInProcess',
  ANIMAL_NOT_AVAILABLE: 'animals.timeline.events.animalNotAvailable',
  ANIMAL_READY: 'animals.timeline.events.animalReady',
  CANDIDATE_CREATED: 'animals.timeline.events.candidateCreated',
  DECISION_PENDING: 'animals.timeline.events.decisionPending',
  EVALUATION_RECORDED: 'animals.timeline.events.evaluationRecorded',
  FOLLOW_UP_COMPLETED: 'animals.timeline.events.followUpCompleted',
  FOLLOW_UPS_PLANNED: 'animals.timeline.events.followUpsPlanned',
  MEETING_SCHEDULED: 'animals.timeline.events.meetingScheduled',
  REEVALUATION_REQUIRED: 'animals.timeline.events.reevaluationRequired',
};

function extractPersonName(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  const value = record['person'];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function getPersistedTimelineEventLabel(
  t: TFunction,
  event: PersistedTimelineEvent,
  animalName: string,
): string {
  const key =
    persistedTimelineEventKeys[event.eventType as PersistedTimelineEventType];
  if (!key) return event.eventType;
  const personName = extractPersonName(event.data) ?? '';
  return t(key, { animalName, personName });
}
