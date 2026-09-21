import type { MockFollowUp } from './types';

export const mockFollowUps: readonly MockFollowUp[] = [
  {
    id: 'mia-fu-7',
    animalId: 'mia',
    adoptionId: 'adoption-mia',
    dueDate: '2026-06-22',
    status: 'COMPLETED',
    outcome: 'EXCELLENT',
    notes: 'Adaptación correcta.',
    completedAt: '2026-06-22',
  },
  {
    id: 'mia-fu-30',
    animalId: 'mia',
    adoptionId: 'adoption-mia',
    dueDate: '2026-07-15',
    status: 'COMPLETED',
    outcome: 'GOOD',
    notes: 'Se adaptó al nuevo hogar.',
    completedAt: '2026-07-16',
  },
  {
    id: 'mia-fu-60',
    animalId: 'mia',
    adoptionId: 'adoption-mia',
    dueDate: '2026-08-14',
    status: 'PENDING',
  },
];

export function getFollowUpsForAnimal(
  animalId: string,
): readonly MockFollowUp[] {
  return mockFollowUps.filter((followUp) => followUp.animalId === animalId);
}
