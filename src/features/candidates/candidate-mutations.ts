import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { candidateQueryKeys } from './candidate-queries';
import { animalKeys } from '@/features/animals/persisted-animal-queries';

export function useBridgeEvaluatedToContactPending(
  client: SupabaseClient<Database> | null,
  shelterId: string,
  candidateId: string,
  options: { onSuccess?: () => void; onError?: (error: Error) => void } = {},
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!client) throw new Error('supabase_client_unavailable');
      const { data, error } = await client.rpc(
        'bridge_evaluated_to_contact_pending',
        {
          p_candidate_id: candidateId,
        },
      );

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: candidateQueryKeys.byId(shelterId, candidateId),
      });
      queryClient.invalidateQueries({
        queryKey: candidateQueryKeys.byShelter(shelterId),
      });
      // Both RPCs append a timeline event on the candidate's animal.
      queryClient.invalidateQueries({
        queryKey: animalKeys.all(shelterId),
      });
      options.onSuccess?.();
    },
    onError: (error) => {
      options.onError?.(error);
    },
  });
}

export function useMarkDecisionPending(
  client: SupabaseClient<Database> | null,
  shelterId: string,
  candidateId: string,
  options: { onSuccess?: () => void; onError?: (error: Error) => void } = {},
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!client) throw new Error('supabase_client_unavailable');
      const { data, error } = await client.rpc('mark_decision_pending', {
        p_candidate_id: candidateId,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: candidateQueryKeys.byId(shelterId, candidateId),
      });
      queryClient.invalidateQueries({
        queryKey: candidateQueryKeys.byShelter(shelterId),
      });
      // Both RPCs append a timeline event on the candidate's animal.
      queryClient.invalidateQueries({
        queryKey: animalKeys.all(shelterId),
      });
      options.onSuccess?.();
    },
    onError: (error) => {
      options.onError?.(error);
    },
  });
}
