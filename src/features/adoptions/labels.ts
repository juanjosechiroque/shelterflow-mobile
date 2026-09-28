import type { TFunction } from 'i18next';

export type FollowupStatus =
  'PENDING' | 'COMPLETED' | 'RESCHEDULED' | 'MISSED' | 'CANCELLED';
export type FollowupOutcome =
  'EXCELLENT' | 'GOOD' | 'CONCERNS' | 'INTERVENTION_REQUIRED';

export const followupOutcomes: readonly FollowupOutcome[] = [
  'EXCELLENT',
  'GOOD',
  'CONCERNS',
  'INTERVENTION_REQUIRED',
];

export function getFollowupStatusLabel(t: TFunction, status: string): string {
  switch (status) {
    case 'PENDING':
      return t('followups.status.pending');
    case 'COMPLETED':
      return t('followups.status.completed');
    case 'RESCHEDULED':
      return t('followups.status.rescheduled');
    case 'MISSED':
      return t('followups.status.missed');
    case 'CANCELLED':
      return t('followups.status.cancelled');
    default:
      return status;
  }
}

export function getFollowupOutcomeLabel(t: TFunction, outcome: string): string {
  switch (outcome) {
    case 'EXCELLENT':
      return t('followups.outcomes.excellent');
    case 'GOOD':
      return t('followups.outcomes.good');
    case 'CONCERNS':
      return t('followups.outcomes.concerns');
    case 'INTERVENTION_REQUIRED':
      return t('followups.outcomes.interventionRequired');
    default:
      return outcome;
  }
}

export function getAdoptionStatusLabel(t: TFunction, status: string): string {
  switch (status) {
    case 'ACTIVE':
      return t('adoptions.detail.activeBadge');
    case 'RETURNED':
      return t('adoptions.detail.returnedBadge');
    default:
      return status;
  }
}
