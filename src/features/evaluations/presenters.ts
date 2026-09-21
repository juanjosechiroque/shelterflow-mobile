import type { TFunction } from 'i18next';

import type { EvaluationOverallFit, EvaluationRecommendation } from './types';

const overallFitKeys: Record<
  EvaluationOverallFit,
  | 'evaluations.fits.strong'
  | 'evaluations.fits.possible'
  | 'evaluations.fits.concerns'
> = {
  CONCERNS: 'evaluations.fits.concerns',
  POSSIBLE: 'evaluations.fits.possible',
  STRONG: 'evaluations.fits.strong',
};

const recommendationKeys: Record<
  EvaluationRecommendation,
  | 'evaluations.recommendations.continue'
  | 'evaluations.recommendations.moreInformation'
  | 'evaluations.recommendations.doNotContinue'
> = {
  CONTINUE: 'evaluations.recommendations.continue',
  DO_NOT_CONTINUE: 'evaluations.recommendations.doNotContinue',
  MORE_INFORMATION: 'evaluations.recommendations.moreInformation',
};

export function getEvaluationFitLabel(
  t: TFunction,
  fit: EvaluationOverallFit,
): string {
  return t(overallFitKeys[fit]);
}

export function getEvaluationRecommendationLabel(
  t: TFunction,
  recommendation: EvaluationRecommendation,
): string {
  return t(recommendationKeys[recommendation]);
}
