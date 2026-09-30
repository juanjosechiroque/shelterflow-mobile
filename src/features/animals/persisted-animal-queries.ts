import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  completeReevaluation,
  getAnimalById,
  listAnimalsForShelter,
  listTimelineForAnimal,
  type CompleteReevaluationInput,
} from '@/features/animals/persisted-animal-repository';
import { getActiveAdoptionByAnimal } from '@/features/adoptions/active-adoption-repository';
import { adoptionKeys } from '@/features/adoptions/active-adoption-queries';
import { adoptionDecisionKeys } from '@/features/adoptions/adoption-queries';
import type { Database } from '@/lib/database.types';

export const animalKeys = {
  all: (shelterId: string) => ['animals', shelterId] as const,
  list: (shelterId: string) => ['animals', shelterId, 'list'] as const,
  detail: (shelterId: string, animalId: string) =>
    ['animals', shelterId, 'detail', animalId] as const,
  timeline: (shelterId: string, animalId: string) =>
    ['animals', shelterId, 'timeline', animalId] as const,
};

export function useAnimalsForShelter(
  client: SupabaseClient<Database> | null,
  shelterId: string | null,
) {
  return useQuery({
    queryKey: animalKeys.list(shelterId ?? ''),
    queryFn: () => {
      if (!client) throw new Error('supabase_client_unavailable');
      if (!shelterId) return [];
      return listAnimalsForShelter(client, shelterId);
    },
    enabled: client !== null && Boolean(shelterId),
  });
}

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

export function useActiveAdoptionForAnimal(
  client: SupabaseClient<Database> | null,
  shelterId: string | null,
  animalId: string | undefined,
) {
  return useQuery({
    queryKey: ['adoptions', shelterId ?? '', 'animal', animalId ?? ''],
    queryFn: () => {
      if (!client) throw new Error('supabase_client_unavailable');
      if (!animalId) return null;
      return getActiveAdoptionByAnimal(client, animalId);
    },
    enabled: client !== null && shelterId !== null && Boolean(animalId),
  });
}
