import type { TFunction } from 'i18next';

import type { FollowUpOutcome, FollowUpStatus } from './types';

const followUpStatusKeys: Record<
  FollowUpStatus,
  | 'followups.status.pending'
  | 'followups.status.completed'
  | 'followups.status.rescheduled'
  | 'followups.status.missed'
> = {
  COMPLETED: 'followups.status.completed',
  MISSED: 'followups.status.missed',
  PENDING: 'followups.status.pending',
  RESCHEDULED: 'followups.status.rescheduled',
};

const followUpOutcomeKeys: Record<
  FollowUpOutcome,
  | 'followups.outcomes.excellent'
  | 'followups.outcomes.good'
  | 'followups.outcomes.concerns'
  | 'followups.outcomes.interventionRequired'
> = {
  CONCERNS: 'followups.outcomes.concerns',
  EXCELLENT: 'followups.outcomes.excellent',
  GOOD: 'followups.outcomes.good',
  INTERVENTION_REQUIRED: 'followups.outcomes.interventionRequired',
};

export function getFollowUpStatusLabel(
  t: TFunction,
  status: FollowUpStatus,
): string {
  return t(followUpStatusKeys[status]);
}

export function getFollowUpOutcomeLabel(
  t: TFunction,
  outcome: FollowUpOutcome,
): string {
  return t(followUpOutcomeKeys[outcome]);
}
