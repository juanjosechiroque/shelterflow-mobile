import type { MockAdoption } from './types';

export const mockAdoptions: readonly MockAdoption[] = [
  {
    id: 'adoption-mia',
    animalId: 'mia',
    candidateId: 'mia-lucia',
    adoptionDate: '2026-06-15',
    status: 'ACTIVE',
    handoverNotes: 'Entrega pactada en el refugio.',
  },
  {
    id: 'adoption-bruno',
    animalId: 'bruno',
    candidateId: 'bruno-diego',
    adoptionDate: '2026-03-08',
    status: 'RETURNED',
    handoverNotes: 'Dificultades de convivencia con otros animales.',
  },
];

export function getActiveAdoptionForAnimal(
  animalId: string,
): MockAdoption | undefined {
  return mockAdoptions.find(
    (adoption) =>
      adoption.animalId === animalId && adoption.status === 'ACTIVE',
  );
}
