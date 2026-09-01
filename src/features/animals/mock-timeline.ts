import type { MockTimelineEvent } from './types';

export const mockTimelineEvents: readonly MockTimelineEvent[] = [
  {
    id: 'luna-ready',
    animalId: 'luna',
    type: 'ANIMAL_READY',
    occurredOn: '2026-07-12',
  },
  {
    id: 'luna-ana-created',
    animalId: 'luna',
    type: 'CANDIDATE_CREATED',
    occurredOn: '2026-07-20',
    personName: 'Ana Pérez',
  },
  {
    id: 'luna-ana-evaluated',
    animalId: 'luna',
    type: 'EVALUATION_RECORDED',
    occurredOn: '2026-07-24',
    personName: 'Ana Pérez',
  },
  {
    id: 'luna-meeting',
    animalId: 'luna',
    type: 'MEETING_SCHEDULED',
    occurredOn: '2026-08-01',
    personName: 'Ana Pérez',
  },
  {
    id: 'luna-in-process',
    animalId: 'luna',
    type: 'ANIMAL_IN_PROCESS',
    occurredOn: '2026-08-01',
  },
  {
    id: 'luna-decision',
    animalId: 'luna',
    type: 'DECISION_PENDING',
    occurredOn: '2026-08-18',
    personName: 'Ana Pérez',
  },
  {
    id: 'toby-ready',
    animalId: 'toby',
    type: 'ANIMAL_READY',
    occurredOn: '2026-08-05',
  },
  {
    id: 'nala-ready',
    animalId: 'nala',
    type: 'ANIMAL_READY',
    occurredOn: '2026-08-10',
  },
  {
    id: 'nala-jorge-created',
    animalId: 'nala',
    type: 'CANDIDATE_CREATED',
    occurredOn: '2026-08-20',
    personName: 'Jorge Soto',
  },
  {
    id: 'nala-jorge-evaluated',
    animalId: 'nala',
    type: 'EVALUATION_RECORDED',
    occurredOn: '2026-08-22',
    personName: 'Jorge Soto',
  },
  {
    id: 'mia-ready',
    animalId: 'mia',
    type: 'ANIMAL_READY',
    occurredOn: '2026-05-04',
  },
  {
    id: 'mia-lucia-created',
    animalId: 'mia',
    type: 'CANDIDATE_CREATED',
    occurredOn: '2026-05-12',
    personName: 'Lucía Torres',
  },
  {
    id: 'mia-adopted',
    animalId: 'mia',
    type: 'ADOPTION_CONFIRMED',
    occurredOn: '2026-06-15',
    personName: 'Lucía Torres',
  },
  {
    id: 'mia-followups',
    animalId: 'mia',
    type: 'FOLLOW_UPS_PLANNED',
    occurredOn: '2026-06-15',
  },
  {
    id: 'bruno-adopted',
    animalId: 'bruno',
    type: 'ADOPTION_CONFIRMED',
    occurredOn: '2026-03-08',
    personName: 'Diego Ramos',
  },
  {
    id: 'bruno-returned',
    animalId: 'bruno',
    type: 'ADOPTION_RETURNED',
    occurredOn: '2026-08-02',
    personName: 'Diego Ramos',
  },
  {
    id: 'bruno-reevaluation',
    animalId: 'bruno',
    type: 'REEVALUATION_REQUIRED',
    occurredOn: '2026-08-02',
  },
];

export function getTimelineForAnimal(
  animalId: string,
): readonly MockTimelineEvent[] {
  return mockTimelineEvents.filter((event) => event.animalId === animalId);
}
