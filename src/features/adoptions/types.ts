export interface MockAdoption {
  id: string;
  animalId: string;
  candidateId: string;
  adoptionDate: string;
  status: 'ACTIVE' | 'RETURNED';
  handoverNotes?: string;
}
