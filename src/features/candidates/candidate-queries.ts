import { useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/database.types';
import {
  getCandidate,
  listCandidates,
  listCandidatesByAnimal,
} from './candidate-repository';

export const candidateQueryKeys = {
  all: () => ['candidates'] as const,
  byShelter: (shelterId: string) =>
    ['candidates', 'shelter', shelterId] as const,
  byId: (shelterId: string, candidateId: string) =>
    ['candidates', 'shelter', shelterId, 'detail', candidateId] as const,
  byAnimal: (shelterId: string, animalId: string) =>
    ['candidates', 'shelter', shelterId, 'animal', animalId] as const,
};

export function useCandidatesByShelter(
  client: SupabaseClient<Database> | null,
  shelterId: string,
) {
  return useQuery({
    queryKey: candidateQueryKeys.byShelter(shelterId),
    queryFn: () => {
      if (!client) throw new Error('supabase_client_unavailable');
      return listCandidates(client, shelterId);
    },
    enabled: client !== null && Boolean(shelterId),
  });
}

export function useCandidateById(
  client: SupabaseClient<Database> | null,
  shelterId: string,
  candidateId: string,
) {
  return useQuery({
    queryKey: candidateQueryKeys.byId(shelterId, candidateId),
    queryFn: () => {
      if (!client) throw new Error('supabase_client_unavailable');
      return getCandidate(client, shelterId, candidateId);
    },
    enabled: client !== null && Boolean(shelterId) && Boolean(candidateId),
  });
}

export function useCandidatesByAnimal(
  client: SupabaseClient<Database> | null,
  shelterId: string,
  animalId: string,
) {
  return useQuery({
    queryKey: candidateQueryKeys.byAnimal(shelterId, animalId),
    queryFn: () => {
      if (!client) throw new Error('supabase_client_unavailable');
      return listCandidatesByAnimal(client, shelterId, animalId);
    },
    enabled: client !== null && Boolean(shelterId) && Boolean(animalId),
  });
}
