import type { MockAnimal } from './types';

export const mockShelter = {
  id: 'huellitas-rescue',
  name: 'Huellitas Rescue',
} as const;

export const mockAnimals: readonly MockAnimal[] = [
  {
    id: 'luna',
    name: 'Luna',
    species: 'DOG',
    sex: 'FEMALE',
    approximateAgeMonths: 24,
    size: 'MEDIUM',
    status: 'IN_PROCESS',
    visualTone: 'forest',
  },
  {
    id: 'toby',
    name: 'Toby',
    species: 'DOG',
    sex: 'MALE',
    approximateAgeMonths: 18,
    size: 'SMALL',
    status: 'READY',
    visualTone: 'sand',
  },
  {
    id: 'mia',
    name: 'Mia',
    species: 'CAT',
    sex: 'FEMALE',
    approximateAgeMonths: 36,
    size: 'SMALL',
    status: 'ADOPTED',
    visualTone: 'rose',
  },
  {
    id: 'bruno',
    name: 'Bruno',
    species: 'DOG',
    sex: 'MALE',
    approximateAgeMonths: 72,
    size: 'LARGE',
    status: 'REEVALUATION',
    visualTone: 'sky',
  },
  {
    id: 'nala',
    name: 'Nala',
    species: 'CAT',
    sex: 'FEMALE',
    approximateAgeMonths: null,
    size: 'MEDIUM',
    status: 'READY',
    visualTone: 'forest',
  },
];

export function getMockAnimalById(id: string): MockAnimal | undefined {
  return mockAnimals.find((animal) => animal.id === id);
}
