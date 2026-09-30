import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/database.types';
import type { EvaluationOverallFit, EvaluationRecommendation } from './types';

export interface PersistedEvaluation {
  id: string;
  candidateId: string;
  overallFit: EvaluationOverallFit;
  positiveFactors: string[];
  concerns: string[];
  recommendation: EvaluationRecommendation;
  notes: string | null;
  createdAt: string;
}

export interface RecordEvaluationInput {
  candidateId: string;
  overallFit: EvaluationOverallFit;
  positiveFactors: string[];
  concerns: string[];
  recommendation: EvaluationRecommendation;
  notes: string | null;
}

interface EvaluationRow {
  id: string;
  candidate_id: string;
  overall_fit: EvaluationOverallFit;
  positive_factors: string[];
  concerns: string[];
  recommendation: EvaluationRecommendation;
  notes: string | null;
  created_at: string;
}

function toPersistedEvaluation(row: EvaluationRow): PersistedEvaluation {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    overallFit: row.overall_fit,
    positiveFactors: row.positive_factors,
    concerns: row.concerns,
    recommendation: row.recommendation,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

const evaluationFields =
  'id, candidate_id, overall_fit, positive_factors, concerns, recommendation, notes, created_at';

export async function getEvaluationForCandidate(
  client: SupabaseClient<Database>,
  shelterId: string,
  candidateId: string,
): Promise<PersistedEvaluation | null> {
  const { data, error } = await client
    .from('evaluations')
    .select(evaluationFields)
    .eq('shelter_id', shelterId)
    .eq('candidate_id', candidateId)
    .maybeSingle();

  if (error) throw error;
  return data ? toPersistedEvaluation(data as unknown as EvaluationRow) : null;
}

export async function recordEvaluation(
  client: SupabaseClient<Database>,
  input: RecordEvaluationInput,
): Promise<string> {
  const { data, error } = await client.rpc('record_evaluation', {
    p_candidate_id: input.candidateId,
    p_overall_fit: input.overallFit,
    p_positive_factors: input.positiveFactors,
    p_concerns: input.concerns,
    p_recommendation: input.recommendation,
    p_notes: input.notes,
  });

  if (error) throw error;
  if (data === null) throw new Error('supabase_rpc_result_missing');
  return data;
}
