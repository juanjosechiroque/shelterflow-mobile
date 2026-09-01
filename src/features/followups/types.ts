export type FollowUpStatus = 'PENDING' | 'COMPLETED' | 'RESCHEDULED' | 'MISSED';
export type FollowUpOutcome =
  'EXCELLENT' | 'GOOD' | 'CONCERNS' | 'INTERVENTION_REQUIRED';

export interface MockFollowUp {
  id: string;
  animalId: string;
  adoptionId: string;
  dueDate: string;
  status: FollowUpStatus;
  outcome?: FollowUpOutcome;
  notes?: string;
  completedAt?: string;
}
