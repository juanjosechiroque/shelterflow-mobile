import type { TFunction } from 'i18next';

import type { CandidateSource } from './types';

const sourceKeys: Record<
  CandidateSource,
  | 'candidates.sourceLabels.referral'
  | 'candidates.sourceLabels.application'
  | 'candidates.sourceLabels.walkIn'
  | 'candidates.sourceLabels.previousAdopter'
  | 'candidates.sourceLabels.unknown'
> = {
  APPLICATION: 'candidates.sourceLabels.application',
  PREVIOUS_ADOPTER: 'candidates.sourceLabels.previousAdopter',
  REFERRAL: 'candidates.sourceLabels.referral',
  UNKNOWN: 'candidates.sourceLabels.unknown',
  WALK_IN: 'candidates.sourceLabels.walkIn',
};

export function getCandidateSourceLabel(
  t: TFunction,
  source: CandidateSource,
): string {
  return t(sourceKeys[source]);
}
