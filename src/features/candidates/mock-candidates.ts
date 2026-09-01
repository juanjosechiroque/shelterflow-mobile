import type { MockCandidateDetail } from './types';

export const mockCandidateDetails: readonly MockCandidateDetail[] = [
  {
    id: 'luna-ana',
    animalId: 'luna',
    person: {
      id: 'ana-perez',
      name: 'Ana Pérez',
      phone: '+51 999 111 222',
      email: 'ana.perez@example.com',
      notes: 'Vive en un departamento con patio pequeño.',
    },
    status: 'DECISION_PENDING',
    source: 'APPLICATION',
    applicationDate: '2026-07-20',
    notes: 'Se acompañó del proceso de preselección del refugio.',
  },
  {
    id: 'luna-carlos',
    animalId: 'luna',
    person: {
      id: 'carlos-ruiz',
      name: 'Carlos Ruiz',
      phone: '+51 999 333 444',
      email: 'carlos.ruiz@example.com',
    },
    status: 'MEETING_SCHEDULED',
    source: 'REFERRAL',
    applicationDate: '2026-07-28',
  },
  {
    id: 'luna-marta',
    animalId: 'luna',
    person: {
      id: 'marta-diaz',
      name: 'Marta Díaz',
      phone: '+51 999 555 666',
    },
    status: 'NEEDS_EVALUATION',
    source: 'WALK_IN',
    applicationDate: '2026-08-15',
  },
  {
    id: 'nala-jorge',
    animalId: 'nala',
    person: {
      id: 'jorge-soto',
      name: 'Jorge Soto',
      phone: '+51 999 777 888',
    },
    status: 'EVALUATED',
    source: 'APPLICATION',
    applicationDate: '2026-08-20',
  },
  {
    id: 'nala-elena',
    animalId: 'nala',
    person: {
      id: 'elena-vargas',
      name: 'Elena Vargas',
      phone: '+51 999 999 000',
    },
    status: 'CONTACT_PENDING',
    source: 'REFERRAL',
    applicationDate: '2026-08-24',
  },
  {
    id: 'mia-lucia',
    animalId: 'mia',
    person: {
      id: 'lucia-torres',
      name: 'Lucía Torres',
      phone: '+51 998 111 222',
    },
    status: 'SELECTED',
    source: 'APPLICATION',
    applicationDate: '2026-05-12',
  },
  {
    id: 'bruno-diego',
    animalId: 'bruno',
    person: {
      id: 'diego-ramos',
      name: 'Diego Ramos',
      phone: '+51 998 333 444',
    },
    status: 'SELECTED',
    source: 'PREVIOUS_ADOPTER',
    applicationDate: '2026-02-20',
  },
];

export function getCandidateDetailById(
  candidateId: string,
): MockCandidateDetail | undefined {
  return mockCandidateDetails.find((candidate) => candidate.id === candidateId);
}

export function getCandidateDetailsForAnimal(
  animalId: string,
): readonly MockCandidateDetail[] {
  return mockCandidateDetails.filter(
    (candidate) => candidate.animalId === animalId,
  );
}
