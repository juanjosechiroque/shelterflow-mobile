export type EvaluationOverallFit = 'STRONG' | 'POSSIBLE' | 'CONCERNS';
export type EvaluationRecommendation =
  'CONTINUE' | 'MORE_INFORMATION' | 'DO_NOT_CONTINUE';

export interface MockEvaluation {
  id: string;
  candidateId: string;
  overallFit: EvaluationOverallFit;
  positiveFactors: string[];
  concerns: string[];
  notes?: string;
  recommendation: EvaluationRecommendation;
  recordedOn: string;
}
