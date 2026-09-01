import type { MockCandidate } from './types';

export const mockCandidates: readonly MockCandidate[] = [
  {
    id: 'luna-ana',
    animalId: 'luna',
    personName: 'Ana Pérez',
    status: 'DECISION_PENDING',
  },
  {
    id: 'luna-carlos',
    animalId: 'luna',
    personName: 'Carlos Ruiz',
    status: 'MEETING_SCHEDULED',
  },
  {
    id: 'luna-marta',
    animalId: 'luna',
    personName: 'Marta Díaz',
    status: 'NEEDS_EVALUATION',
  },
  {
    id: 'nala-jorge',
    animalId: 'nala',
    personName: 'Jorge Soto',
    status: 'EVALUATED',
  },
  {
    id: 'nala-elena',
    animalId: 'nala',
    personName: 'Elena Vargas',
    status: 'CONTACT_PENDING',
  },
  {
    id: 'mia-lucia',
    animalId: 'mia',
    personName: 'Lucía Torres',
    status: 'SELECTED',
  },
  {
    id: 'bruno-diego',
    animalId: 'bruno',
    personName: 'Diego Ramos',
    status: 'SELECTED',
  },
];

export function getCandidatesForAnimal(
  animalId: string,
): readonly MockCandidate[] {
  return mockCandidates.filter((candidate) => candidate.animalId === animalId);
}
