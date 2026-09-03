import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';

import { animalKeys } from '@/features/animals/persisted-animal-queries';
import { candidateQueryKeys } from '@/features/candidates/candidate-queries';
import type { Database } from '@/lib/database.types';
import {
  completeMeeting,
  listMeetingsForCandidate,
  scheduleMeeting,
  type CompleteMeetingInput,
  type ScheduleMeetingInput,
} from './meeting-repository';

export const meetingQueryKeys = {
  byCandidate: (shelterId: string, candidateId: string) =>
    ['meetings', 'shelter', shelterId, 'candidate', candidateId] as const,
};

export function useMeetingsForCandidate(
  client: SupabaseClient<Database> | null,
  shelterId: string,
  candidateId: string,
) {
  return useQuery({
    queryKey: meetingQueryKeys.byCandidate(shelterId, candidateId),
    queryFn: () => {
      if (!client) throw new Error('supabase_client_unavailable');
      return listMeetingsForCandidate(client, shelterId, candidateId);
    },
    enabled: client !== null && Boolean(shelterId) && Boolean(candidateId),
  });
}

function useMeetingInvalidation(
  shelterId: string,
  candidateId: string,
  animalId: string,
) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: meetingQueryKeys.byCandidate(shelterId, candidateId),
      }),
      queryClient.invalidateQueries({
        queryKey: candidateQueryKeys.byId(shelterId, candidateId),
      }),
      queryClient.invalidateQueries({
        queryKey: candidateQueryKeys.byShelter(shelterId),
      }),
      queryClient.invalidateQueries({
        queryKey: animalKeys.detail(shelterId, animalId),
      }),
      queryClient.invalidateQueries({
        queryKey: animalKeys.timeline(shelterId, animalId),
      }),
      queryClient.invalidateQueries({
        queryKey: animalKeys.list(shelterId),
      }),
    ]);
  };
}

export function useScheduleMeeting(
  client: SupabaseClient<Database> | null,
  shelterId: string,
  candidateId: string,
  animalId: string,
) {
  const invalidate = useMeetingInvalidation(shelterId, candidateId, animalId);
  return useMutation({
    mutationFn: (
      input: Omit<ScheduleMeetingInput, 'candidateId' | 'animalId'>,
    ) => {
      if (!client) throw new Error('supabase_client_unavailable');
      return scheduleMeeting(client, { ...input, candidateId, animalId });
    },
    onSuccess: invalidate,
  });
}

export function useCompleteMeeting(
  client: SupabaseClient<Database> | null,
  shelterId: string,
  candidateId: string,
  animalId: string,
) {
  const invalidate = useMeetingInvalidation(shelterId, candidateId, animalId);
  return useMutation({
    mutationFn: (
      input: Omit<CompleteMeetingInput, 'candidateId' | 'animalId'>,
    ) => {
      if (!client) throw new Error('supabase_client_unavailable');
      return completeMeeting(client, { ...input, candidateId, animalId });
    },
    onSuccess: invalidate,
  });
}
