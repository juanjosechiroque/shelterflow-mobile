import {
  createAsyncStorageDraftStore,
  type DraftStore,
} from '@/lib/form-drafts';

import type { EvaluationOverallFit, EvaluationRecommendation } from './types';

export interface EvaluationDraft {
  overallFit: EvaluationOverallFit;
  recommendation: EvaluationRecommendation;
  positiveFactor: string;
  positiveFactors: string[];
  concern: string;
  concerns: string[];
  notes: string;
}

export const evaluationDraftStore: DraftStore<EvaluationDraft> =
  createAsyncStorageDraftStore<EvaluationDraft>();

export function evaluationDraftKey(candidateId: string): string {
  return `evaluation.${candidateId}`;
}
