import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  completeFollowup,
  getAdoptionById,
  getAdoptionPhotoSignedUrl,
  getFollowupPhotoSignedUrl,
  listActiveAdoptions,
  listFollowupsForAdoption,
  returnAdoption,
  setAdoptionPhoto,
  setFollowupPhoto,
  type CompleteFollowupInput,
  type ReturnAdoptionInput,
  type SetAdoptionPhotoInput,
  type SetFollowupPhotoInput,
} from '@/features/adoptions/active-adoption-repository';
import { adoptionDecisionKeys } from '@/features/adoptions/adoption-queries';
import { animalKeys } from '@/features/animals/animal-query-keys';
import { PHOTO_SIGNED_URL_TTL_SECONDS } from '@/lib/image-capture';
import type { Database } from '@/lib/database.types';

export const adoptionKeys = {
  detail: (shelterId: string, adoptionId: string) =>
    ['adoptions', shelterId, 'detail', adoptionId] as const,
  followups: (shelterId: string, adoptionId: string) =>
    ['adoptions', shelterId, 'followups', adoptionId] as const,
  list: (shelterId: string) => ['adoptions', shelterId, 'list'] as const,
  photoSignedUrl: (path: string) =>
    ['adoptions', 'photo-signed-url', path] as const,
  followupPhotoSignedUrl: (path: string) =>
    ['adoptions', 'followup-photo-signed-url', path] as const,
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
        // The return moves the animal to REEVALUATION and appends its timeline,
        // so any mounted animal detail/list must refetch too, not just the
        // adoption read models.
        queryClient.invalidateQueries({
          queryKey: animalKeys.all(shelterId ?? ''),
        }),
      ]);
    },
  });
}

export function useSetAdoptionPhoto(
  client: SupabaseClient<Database> | null,
  shelterId: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetAdoptionPhotoInput) => {
      if (!client) throw new Error('supabase_client_unavailable');
      return setAdoptionPhoto(client, input);
    },
    onSuccess: async (_adoptionId, input) => {
      await queryClient.invalidateQueries({
        queryKey: adoptionKeys.detail(shelterId ?? '', input.adoptionId),
      });
    },
  });
}

export function useSetFollowupPhoto(
  client: SupabaseClient<Database> | null,
  shelterId: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetFollowupPhotoInput) => {
      if (!client) throw new Error('supabase_client_unavailable');
      return setFollowupPhoto(client, input);
    },
    onSuccess: async (_followupId, input) => {
      // A follow-up photo affects both the adoption detail and its follow-up list.
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: adoptionKeys.detail(shelterId ?? '', input.adoptionId),
        }),
        queryClient.invalidateQueries({
          queryKey: adoptionKeys.followups(shelterId ?? '', input.adoptionId),
        }),
      ]);
    },
  });
}

const PHOTO_SIGNED_URL_STALE_MS =
  (PHOTO_SIGNED_URL_TTL_SECONDS - 15 * 60) * 1000;

export function useAdoptionPhotoSignedUrl(
  client: SupabaseClient<Database> | null,
  path: string | null,
) {
  return useQuery({
    queryKey: adoptionKeys.photoSignedUrl(path ?? ''),
    queryFn: () => {
      if (!client) throw new Error('supabase_client_unavailable');
      if (!path) return null;
      return getAdoptionPhotoSignedUrl(client, path);
    },
    enabled: client !== null && Boolean(path),
    staleTime: PHOTO_SIGNED_URL_STALE_MS,
  });
}

export function useFollowupPhotoSignedUrl(
  client: SupabaseClient<Database> | null,
  path: string | null,
) {
  return useQuery({
    queryKey: adoptionKeys.followupPhotoSignedUrl(path ?? ''),
    queryFn: () => {
      if (!client) throw new Error('supabase_client_unavailable');
      if (!path) return null;
      return getFollowupPhotoSignedUrl(client, path);
    },
    enabled: client !== null && Boolean(path),
    staleTime: PHOTO_SIGNED_URL_STALE_MS,
  });
}
