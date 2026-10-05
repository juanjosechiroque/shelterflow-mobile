import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  waitFor,
  type RenderResult,
} from '@testing-library/react-native';
import type { ReactElement } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useLocalSearchParams } from 'expo-router';

import { CompleteFollowupScreen } from '@/features/adoptions/complete-followup-screen';
import { PersistedAdoptionDetailScreen } from '@/features/adoptions/persisted-adoption-detail-screen';
import type { Database } from '@/lib/database.types';
import i18n from '@/i18n';

jest.mock('expo-router', () => {
  const React = require('react');
  const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
  return {
    Link: ({ children }: { children: ReactElement }) =>
      React.cloneElement(children, { onPress: () => undefined }),
    Stack: { Screen: () => null },
    router,
    useLocalSearchParams: jest.fn(),
  };
});

jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/image-capture', () => ({
  captureImageWithCamera: jest.fn(),
  getPhotoSignedUrl: jest.fn(),
  pickImageFromGallery: jest.fn(),
  uploadImageToStorage: jest.fn(),
  validateImage: jest.fn(() => ({ valid: true })),
  PHOTO_SIGNED_URL_TTL_SECONDS: 3600,
}));

const mockedUseLocalSearchParams = jest.mocked(useLocalSearchParams);
const { useAuth } = jest.requireMock('@/features/auth/auth-provider') as {
  useAuth: jest.Mock;
};
const { pickImageFromGallery, uploadImageToStorage, validateImage } =
  jest.requireMock('@/lib/image-capture') as {
    pickImageFromGallery: jest.Mock;
    uploadImageToStorage: jest.Mock;
    validateImage: jest.Mock;
  };

const shelterId = '00000000-0000-4000-8000-000000000001';
const adoptionId = '00000000-0000-4000-8000-000000000091';
const followupId = '00000000-0000-4000-8000-000000000113';
const pickedAsset = {
  uri: 'file://picked.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
  width: 800,
  height: 600,
};

const adoptionRow = {
  id: adoptionId,
  status: 'ACTIVE',
  adoption_date: '2026-09-02',
  handover_notes: null,
  adoption_photo_path: null,
  animal_id: '00000000-0000-4000-8000-000000000011',
  animals: {
    id: '00000000-0000-4000-8000-000000000011',
    name: 'Luna',
    status: 'ADOPTED',
  },
  candidate_id: '00000000-0000-4000-8000-000000000051',
  candidates: {
    id: '00000000-0000-4000-8000-000000000051',
    status: 'SELECTED',
    person_id: '00000000-0000-4000-8000-000000000031',
    people: {
      id: '00000000-0000-4000-8000-000000000031',
      name: 'Andrea Perez',
    },
  },
};

const followupRow = {
  id: followupId,
  adoption_id: adoptionId,
  due_date: '2026-11-01',
  status: 'PENDING',
  outcome: null,
  notes: null,
  photo_path: null,
  completed_at: null,
  cancelled_at: null,
  cancellation_reason: null,
};

function createClient(
  rpcResponses: Record<string, unknown> = {},
  adoptionDetail: unknown = adoptionRow,
  followupList: unknown[] = [followupRow],
) {
  const adoptionDetailMaybeSingle = jest.fn(() =>
    Promise.resolve({ data: adoptionDetail, error: null }),
  );
  const followupListOrder = jest.fn(() =>
    Promise.resolve({ data: followupList, error: null }),
  );
  const from = jest.fn((table: string) => {
    if (table === 'adoptions') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({ maybeSingle: adoptionDetailMaybeSingle })),
        })),
      };
    }
    if (table === 'followups') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({ order: followupListOrder })),
        })),
      };
    }
    throw new Error(`unexpected table: ${table}`);
  });
  const rpc = jest.fn((name: string) =>
    Promise.resolve(rpcResponses[name] ?? { data: null, error: null }),
  );
  const client = {
    from,
    rpc,
    storage: {
      from: jest.fn(() => ({
        createSignedUrl: jest.fn(() =>
          Promise.resolve({
            data: { signedUrl: 'https://signed.example.com/photo.jpg' },
            error: null,
          }),
        ),
      })),
    },
  } as unknown as SupabaseClient<Database>;

  return { client, mocks: { rpc, adoptionDetailMaybeSingle } };
}

const trackedQueryClients: QueryClient[] = [];

function createTestQueryClient(): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity, retry: false },
      mutations: { gcTime: Infinity, retry: false },
    },
  });
  trackedQueryClients.push(queryClient);
  return queryClient;
}

async function renderWithClient(
  ui: ReactElement,
  client: SupabaseClient<Database>,
): Promise<RenderResult> {
  useAuth.mockReturnValue({ profile: { shelterId }, supabase: client });
  const result = render(
    <QueryClientProvider client={createTestQueryClient()}>
      {ui}
    </QueryClientProvider>,
  );
  return result;
}

describe('Persisted adoption photo sections', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    validateImage.mockReturnValue({ valid: true });
    await i18n.changeLanguage('es');
    mockedUseLocalSearchParams.mockReturnValue({ adoptionId });
  });

  afterEach(() => {
    while (trackedQueryClients.length > 0) {
      trackedQueryClients.pop()?.clear();
    }
  });

  it('shows the empty handover state and attaches a picked photo', async () => {
    const path = `${shelterId}/adoptions/${adoptionId}/photo.jpeg`;
    pickImageFromGallery.mockResolvedValue({
      status: 'success',
      asset: pickedAsset,
    });
    uploadImageToStorage.mockResolvedValue(path);
    const { client, mocks } = createClient({
      set_adoption_photo: { data: adoptionId, error: null },
    });

    const screen = await renderWithClient(
      <PersistedAdoptionDetailScreen />,
      client,
    );

    expect(await screen.findByText('Sin foto')).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Seleccionar de galería' }),
    );

    await waitFor(() => {
      expect(mocks.rpc).toHaveBeenCalledWith('set_adoption_photo', {
        p_adoption_id: adoptionId,
        p_path: path,
      });
    });
  });

  it('keeps the picked handover photo for retry after upload failure', async () => {
    const path = `${shelterId}/adoptions/${adoptionId}/retry.jpeg`;
    pickImageFromGallery.mockResolvedValue({
      status: 'success',
      asset: pickedAsset,
    });
    uploadImageToStorage
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(path);
    const { client, mocks } = createClient({
      set_adoption_photo: { data: adoptionId, error: null },
    });

    const screen = await renderWithClient(
      <PersistedAdoptionDetailScreen />,
      client,
    );
    await screen.findByText('Sin foto');
    await fireEvent.press(
      screen.getByRole('button', { name: 'Seleccionar de galería' }),
    );
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Reintentar' }),
    );

    await waitFor(() => {
      expect(mocks.rpc).toHaveBeenCalledWith('set_adoption_photo', {
        p_adoption_id: adoptionId,
        p_path: path,
      });
    });
    expect(pickImageFromGallery).toHaveBeenCalledTimes(1);
  });

  it('does not open two gallery pickers when the control is tapped twice', async () => {
    let resolvePick!: (outcome: { status: 'cancelled' }) => void;
    pickImageFromGallery.mockReturnValue(
      new Promise((resolve) => {
        resolvePick = resolve;
      }),
    );
    const { client } = createClient();

    const screen = await renderWithClient(
      <PersistedAdoptionDetailScreen />,
      client,
    );
    await screen.findByText('Sin foto');
    const galleryButton = screen.getByRole('button', {
      name: 'Seleccionar de galería',
    });

    await fireEvent.press(galleryButton);
    await fireEvent.press(galleryButton);

    expect(pickImageFromGallery).toHaveBeenCalledTimes(1);
    resolvePick({ status: 'cancelled' });
  });

  it('attaches a follow-up photo independently of completing the follow-up', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ adoptionId, followupId });
    const path = `${shelterId}/followups/${followupId}/photo.jpeg`;
    pickImageFromGallery.mockResolvedValue({
      status: 'success',
      asset: pickedAsset,
    });
    uploadImageToStorage.mockResolvedValue(path);
    const { client, mocks } = createClient({
      set_followup_photo: { data: followupId, error: null },
      complete_followup: { data: followupId, error: null },
    });

    const screen = await renderWithClient(<CompleteFollowupScreen />, client);
    expect(await screen.findByText('Sin foto')).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Seleccionar de galería' }),
    );

    await waitFor(() => {
      expect(mocks.rpc).toHaveBeenCalledWith('set_followup_photo', {
        p_followup_id: followupId,
        p_path: path,
      });
    });
    expect(mocks.rpc).not.toHaveBeenCalledWith(
      'complete_followup',
      expect.anything(),
    );
  });

  it('disables follow-up photo controls while the upload is in flight', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ adoptionId, followupId });
    pickImageFromGallery.mockResolvedValue({
      status: 'success',
      asset: pickedAsset,
    });
    let resolveUpload!: (path: string) => void;
    uploadImageToStorage.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveUpload = resolve;
      }),
    );
    const { client, mocks } = createClient({
      set_followup_photo: { data: followupId, error: null },
    });

    const screen = await renderWithClient(<CompleteFollowupScreen />, client);
    await screen.findByText('Sin foto');
    const galleryButton = screen.getByRole('button', {
      name: 'Seleccionar de galería',
    });
    await fireEvent.press(galleryButton);

    await waitFor(() => {
      expect(
        (galleryButton.props as { accessibilityState?: { disabled?: boolean } })
          .accessibilityState?.disabled,
      ).toBe(true);
    });
    expect(screen.getByText('Subiendo foto…')).toBeTruthy();

    const path = `${shelterId}/followups/${followupId}/photo.jpeg`;
    resolveUpload(path);
    await waitFor(() => {
      expect(mocks.rpc).toHaveBeenCalledWith('set_followup_photo', {
        p_followup_id: followupId,
        p_path: path,
      });
    });
  });

  it('shows a distinct message and no retry when the follow-up precondition fails', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ adoptionId, followupId });
    pickImageFromGallery.mockResolvedValue({
      status: 'success',
      asset: pickedAsset,
    });
    uploadImageToStorage.mockResolvedValue(
      `${shelterId}/followups/${followupId}/photo.jpeg`,
    );
    const { client } = createClient({
      set_followup_photo: {
        data: null,
        error: { message: 'Adoption must be in ACTIVE status' },
      },
    });

    const screen = await renderWithClient(<CompleteFollowupScreen />, client);
    await screen.findByText('Sin foto');
    await fireEvent.press(
      screen.getByRole('button', { name: 'Seleccionar de galería' }),
    );

    expect(
      await screen.findByText(
        'La adopción ya no está activa. No se puede adjuntar foto a este seguimiento.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
  });
});
