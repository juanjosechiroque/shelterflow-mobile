import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  completeFollowup,
  getAdoptionById,
  listActiveAdoptions,
  listFollowupsForAdoption,
  returnAdoption,
  type CompleteFollowupInput,
  type ReturnAdoptionInput,
} from '@/features/adoptions/active-adoption-repository';
import { adoptionDecisionKeys } from '@/features/adoptions/adoption-queries';
import type { Database } from '@/lib/database.types';

export const adoptionKeys = {
  detail: (shelterId: string, adoptionId: string) =>
    ['adoptions', shelterId, 'detail', adoptionId] as const,
  followups: (shelterId: string, adoptionId: string) =>
    ['adoptions', shelterId, 'followups', adoptionId] as const,
  list: (shelterId: string) => ['adoptions', shelterId, 'list'] as const,
};

export function useActiveAdoptions(
  client: SupabaseClient<Database> | null,
  shelterId: string | null,
) {
  return useQuery({
    queryKey: adoptionKeys.list(shelterId ?? ''),
    queryFn: () => {
      if (!client) throw new Error('supabase_client_unavailable');
      return listActiveAdoptions(client);
    },
    enabled: client !== null && shelterId !== null,
  });
}

export function useAdoptionById(
  client: SupabaseClient<Database> | null,
  shelterId: string | null,
  adoptionId: string | undefined,
) {
  return useQuery({
    queryKey: adoptionKeys.detail(shelterId ?? '', adoptionId ?? ''),
    queryFn: () => {
      if (!client) throw new Error('supabase_client_unavailable');
      if (!adoptionId) return null;
      return getAdoptionById(client, adoptionId);
    },
    enabled: client !== null && shelterId !== null && Boolean(adoptionId),
  });
}

export function useAdoptionFollowups(
  client: SupabaseClient<Database> | null,
  shelterId: string | null,
  adoptionId: string | undefined,
) {
  return useQuery({
    queryKey: adoptionKeys.followups(shelterId ?? '', adoptionId ?? ''),
    queryFn: () => {
      if (!client) throw new Error('supabase_client_unavailable');
      if (!adoptionId) return [];
      return listFollowupsForAdoption(client, adoptionId);
    },
    enabled: client !== null && shelterId !== null && Boolean(adoptionId),
  });
}

export function useCompleteFollowup(
  client: SupabaseClient<Database> | null,
  shelterId: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CompleteFollowupInput) => {
      if (!client) throw new Error('supabase_client_unavailable');
      return completeFollowup(client, input);
    },
    onSuccess: async (_followupId, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: adoptionKeys.list(shelterId ?? ''),
        }),
        queryClient.invalidateQueries({
          queryKey: adoptionKeys.followups(shelterId ?? '', input.adoptionId),
        }),
        queryClient.invalidateQueries({
          queryKey: adoptionKeys.detail(shelterId ?? '', input.adoptionId),
        }),
      ]);
    },
  });
}

export function useReturnAdoption(
  client: SupabaseClient<Database> | null,
  shelterId: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReturnAdoptionInput) => {
      if (!client) throw new Error('supabase_client_unavailable');
      return returnAdoption(client, input);
    },
    onSuccess: async (_returnId, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: adoptionKeys.list(shelterId ?? ''),
        }),
        queryClient.invalidateQueries({
          queryKey: adoptionKeys.detail(shelterId ?? '', input.adoptionId),
        }),
        queryClient.invalidateQueries({
          queryKey: adoptionKeys.followups(shelterId ?? '', input.adoptionId),
        }),
        queryClient.invalidateQueries({
          queryKey: adoptionDecisionKeys.list(shelterId ?? ''),
        }),
      ]);
    },
  });
}
