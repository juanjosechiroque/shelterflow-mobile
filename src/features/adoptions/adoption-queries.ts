import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  confirmAdoption,
  getAdoptionDecisionCandidate,
  listPendingAdoptionDecisions,
  type ConfirmAdoptionInput,
} from '@/features/adoptions/adoption-repository';
import type { Database } from '@/lib/database.types';

export const adoptionDecisionKeys = {
  detail: (shelterId: string, candidateId: string) =>
    ['adoption-decisions', shelterId, 'detail', candidateId] as const,
  list: (shelterId: string) =>
    ['adoption-decisions', shelterId, 'list'] as const,
};

export function usePendingAdoptionDecisions(
  client: SupabaseClient<Database> | null,
  shelterId: string | null,
) {
  return useQuery({
    queryKey: adoptionDecisionKeys.list(shelterId ?? ''),
    queryFn: () => {
      if (!client) throw new Error('supabase_client_unavailable');
      return listPendingAdoptionDecisions(client);
    },
    enabled: client !== null && shelterId !== null,
  });
}

export function useAdoptionDecisionCandidate(
  client: SupabaseClient<Database> | null,
  shelterId: string | null,
  candidateId: string | undefined,
) {
  return useQuery({
    queryKey: adoptionDecisionKeys.detail(shelterId ?? '', candidateId ?? ''),
    queryFn: () => {
      if (!client) throw new Error('supabase_client_unavailable');
      if (!candidateId) return null;
      return getAdoptionDecisionCandidate(client, candidateId);
    },
    enabled: client !== null && shelterId !== null && Boolean(candidateId),
  });
}

export function useConfirmAdoption(
  client: SupabaseClient<Database> | null,
  shelterId: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ConfirmAdoptionInput) => {
      if (!client) throw new Error('supabase_client_unavailable');
      return confirmAdoption(client, input);
    },
    onSuccess: async (_adoptionId, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: adoptionDecisionKeys.list(shelterId ?? ''),
        }),
        queryClient.invalidateQueries({
          queryKey: adoptionDecisionKeys.detail(
            shelterId ?? '',
            input.candidateId,
          ),
        }),
      ]);
    },
  });
}
