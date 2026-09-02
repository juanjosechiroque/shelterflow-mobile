import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  completeReevaluation,
  getAnimalById,
  listTimelineForAnimal,
  type CompleteReevaluationInput,
} from '@/features/animals/persisted-animal-repository';
import { adoptionKeys } from '@/features/adoptions/active-adoption-queries';
import { adoptionDecisionKeys } from '@/features/adoptions/adoption-queries';
import type { Database } from '@/lib/database.types';

export const animalKeys = {
  detail: (shelterId: string, animalId: string) =>
    ['animals', shelterId, 'detail', animalId] as const,
  timeline: (shelterId: string, animalId: string) =>
    ['animals', shelterId, 'timeline', animalId] as const,
};

export function useAnimalById(
  client: SupabaseClient<Database> | null,
  shelterId: string | null,
  animalId: string | undefined,
) {
  return useQuery({
    queryKey: animalKeys.detail(shelterId ?? '', animalId ?? ''),
    queryFn: () => {
      if (!client) throw new Error('supabase_client_unavailable');
      if (!animalId) return null;
      return getAnimalById(client, animalId);
    },
    enabled: client !== null && shelterId !== null && Boolean(animalId),
  });
}

export function useAnimalTimeline(
  client: SupabaseClient<Database> | null,
  shelterId: string | null,
  animalId: string | undefined,
) {
  return useQuery({
    queryKey: animalKeys.timeline(shelterId ?? '', animalId ?? ''),
    queryFn: () => {
      if (!client) throw new Error('supabase_client_unavailable');
      if (!animalId) return [];
      return listTimelineForAnimal(client, animalId);
    },
    enabled: client !== null && shelterId !== null && Boolean(animalId),
  });
}

export function useCompleteReevaluation(
  client: SupabaseClient<Database> | null,
  shelterId: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CompleteReevaluationInput) => {
      if (!client) throw new Error('supabase_client_unavailable');
      return completeReevaluation(client, input);
    },
    onSuccess: async (_animalId, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: animalKeys.detail(shelterId ?? '', input.animalId),
        }),
        queryClient.invalidateQueries({
          queryKey: animalKeys.timeline(shelterId ?? '', input.animalId),
        }),
        queryClient.invalidateQueries({
          queryKey: adoptionKeys.list(shelterId ?? ''),
        }),
        queryClient.invalidateQueries({
          queryKey: adoptionDecisionKeys.list(shelterId ?? ''),
        }),
      ]);
    },
  });
}
