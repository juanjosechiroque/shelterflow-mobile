import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';

import { animalKeys } from '@/features/animals/persisted-animal-queries';
import { candidateQueryKeys } from '@/features/candidates/candidate-queries';
import type { Database } from '@/lib/database.types';
import {
  getEvaluationForCandidate,
  recordEvaluation,
  type RecordEvaluationInput,
} from './evaluation-repository';

export const evaluationQueryKeys = {
  byCandidate: (shelterId: string, candidateId: string) =>
    ['evaluations', 'shelter', shelterId, 'candidate', candidateId] as const,
};

export function useEvaluationByCandidate(
  client: SupabaseClient<Database> | null,
  shelterId: string,
  candidateId: string,
) {
  return useQuery({
    queryKey: evaluationQueryKeys.byCandidate(shelterId, candidateId),
    queryFn: () => {
      if (!client) throw new Error('supabase_client_unavailable');
      return getEvaluationForCandidate(client, shelterId, candidateId);
    },
    enabled: client !== null && Boolean(shelterId) && Boolean(candidateId),
  });
}

export function useRecordEvaluationMutation(
  client: SupabaseClient<Database> | null,
  shelterId: string,
  candidateId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<RecordEvaluationInput, 'candidateId'>) => {
      if (!client) throw new Error('supabase_client_unavailable');
      return recordEvaluation(client, { ...input, candidateId });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: evaluationQueryKeys.byCandidate(shelterId, candidateId),
        }),
        queryClient.invalidateQueries({
          queryKey: candidateQueryKeys.byId(shelterId, candidateId),
        }),
        queryClient.invalidateQueries({
          queryKey: candidateQueryKeys.byShelter(shelterId),
        }),
        // record_evaluation appends an EVALUATION_RECORDED timeline event.
        queryClient.invalidateQueries({
          queryKey: animalKeys.all(shelterId),
        }),
      ]);
    },
  });
}
