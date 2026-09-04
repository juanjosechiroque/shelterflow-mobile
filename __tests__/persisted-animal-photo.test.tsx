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

import { PersistedAnimalDetailScreen } from '@/features/animals/persisted-animal-detail-screen';
import type { Database } from '@/lib/database.types';
import i18n from '@/i18n';

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    Link: ({
      children,
      href,
    }: {
      children: React.ReactElement;
      href: unknown;
    }) => React.cloneElement(children, { onPress: () => undefined }),
    Stack: { Screen: () => null },
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    useLocalSearchParams: jest.fn(),
  };
});

jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/animals/image-capture', () => ({
  pickImageFromGallery: jest.fn(),
  captureImageWithCamera: jest.fn(),
  uploadImageToStorage: jest.fn(),
  validateImage: jest.fn(() => ({ valid: true })),
}));

const mockedUseLocalSearchParams = jest.mocked(useLocalSearchParams);
const { useAuth } = jest.requireMock('@/features/auth/auth-provider') as {
  useAuth: jest.Mock;
};
const {
  pickImageFromGallery,
  captureImageWithCamera,
  uploadImageToStorage,
  validateImage,
} = jest.requireMock('@/features/animals/image-capture') as {
  pickImageFromGallery: jest.Mock;
  captureImageWithCamera: jest.Mock;
  uploadImageToStorage: jest.Mock;
  validateImage: jest.Mock;
};

const shelterId = '00000000-0000-4000-8000-000000000001';
const animalId = '00000000-0000-4000-8000-000000000012';
const pickedAsset = {
  uri: 'file://picked.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
  width: 800,
  height: 600,
};

function animalRow(primaryPhotoPath: string | null = null) {
  return {
    id: animalId,
    name: 'Mia',
    species: 'CAT',
    sex: 'FEMALE',
    size: 'SMALL',
    status: 'READY',
    approximate_age_months: 36,
    notes: null,
    primary_photo_path: primaryPhotoPath,
    updated_at: '2026-09-02T12:00:00Z',
  };
}

function createClient({
  primaryPhotoPath = null as string | null,
  signedUrl = {
    data: { signedUrl: 'https://signed.example.com/photo.jpg' },
    error: null,
  } as { data: unknown; error: unknown },
  setPrimaryPhotoRpc = { data: animalId, error: null } as {
    data: unknown;
    error: unknown;
  },
} = {}) {
  const animalDetail = { data: animalRow(primaryPhotoPath), error: null };
  const animalEq = jest.fn(() => ({
    maybeSingle: jest.fn(() => Promise.resolve(animalDetail)),
  }));

  const timelineEq = jest.fn(() => ({
    order: jest.fn(() => Promise.resolve({ data: [], error: null })),
  }));

  const adoptionEq2 = jest.fn(() => ({
    maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
  }));
  const adoptionEq1 = jest.fn(() => ({ eq: adoptionEq2 }));

  const candidatesEq2 = jest.fn(() => ({
    order: jest.fn(() => Promise.resolve({ data: [], error: null })),
  }));
  const candidatesEq1 = jest.fn(() => ({ eq: candidatesEq2 }));

  const from = jest.fn((table: string) => {
    if (table === 'animals') {
      return { select: jest.fn(() => ({ eq: jest.fn(() => animalEq()) })) };
    }
    if (table === 'timeline_events') {
      return { select: jest.fn(() => ({ eq: jest.fn(() => timelineEq()) })) };
    }
    if (table === 'adoptions') {
      return { select: jest.fn(() => ({ eq: jest.fn(() => adoptionEq1()) })) };
    }
    if (table === 'candidates') {
      return { select: jest.fn(() => ({ eq: candidatesEq1 })) };
    }
    throw new Error(`unexpected table: ${table}`);
  });

  const rpc = jest.fn((name: string) => {
    if (name === 'set_animal_primary_photo') {
      return Promise.resolve(setPrimaryPhotoRpc);
    }
    return Promise.resolve({ data: null, error: null });
  });

  const createSignedUrlMock = jest.fn(() => Promise.resolve(signedUrl));
  const storageFrom = jest.fn(() => ({ createSignedUrl: createSignedUrlMock }));

  const client = {
    from,
    rpc,
    storage: { from: storageFrom },
  } as unknown as SupabaseClient<Database>;

  return { client, mocks: { rpc, createSignedUrlMock } };
}

async function renderScreen(
  client: SupabaseClient<Database> | null,
  queryClient = createTestQueryClient(),
): Promise<{ screen: RenderResult; queryClient: QueryClient }> {
  useAuth.mockReturnValue({ profile: { shelterId }, supabase: client });
  return {
    screen: await render(
      <QueryClientProvider client={queryClient}>
        <PersistedAnimalDetailScreen />
      </QueryClientProvider>,
    ),
    queryClient,
  };
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

describe('Animal primary photo', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    validateImage.mockReturnValue({ valid: true });
    await i18n.changeLanguage('es');
    mockedUseLocalSearchParams.mockReturnValue({ animalId });
  });

  afterEach(() => {
    while (trackedQueryClients.length > 0) {
      const queryClient = trackedQueryClients.pop();
      queryClient?.getMutationCache().clear();
      queryClient?.clear();
    }
  });

  it('shows the initials placeholder when the animal has no photo', async () => {
    const { client } = createClient({ primaryPhotoPath: null });
    const { screen } = await renderScreen(client);

    await screen.findByText('Mia');
    expect(screen.getByText('M')).toBeTruthy();
  });

  it('shows a loading state and then the photo while the signed URL resolves', async () => {
    let resolveSignedUrl!: (value: unknown) => void;
    const pendingSignedUrl = new Promise((resolve) => {
      resolveSignedUrl = resolve;
    });
    const { client } = createClient({
      primaryPhotoPath: `${shelterId}/animals/${animalId}/existing.jpg`,
      signedUrl: pendingSignedUrl as unknown as {
        data: unknown;
        error: unknown;
      },
    });
    const { screen } = await renderScreen(client);

    await screen.findByText('Mia');
    expect(screen.queryByText('M')).toBeNull();

    resolveSignedUrl({
      data: { signedUrl: 'https://signed.example.com/existing.jpg' },
      error: null,
    });

    await waitFor(() => {
      expect(screen.queryByText('M')).toBeNull();
    });
  });

  it('disables the photo controls while an upload is in flight and re-enables on success', async () => {
    let resolveUpload!: (value: string) => void;
    const pendingUpload = new Promise<string>((resolve) => {
      resolveUpload = resolve;
    });
    uploadImageToStorage.mockReturnValue(pendingUpload);
    pickImageFromGallery.mockResolvedValue({
      status: 'success',
      asset: pickedAsset,
    });

    const { client, mocks } = createClient({ primaryPhotoPath: null });
    const { screen } = await renderScreen(client);
    await screen.findByText('Mia');

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

    resolveUpload(`${shelterId}/animals/${animalId}/new.jpg`);

    await waitFor(() => {
      expect(mocks.rpc).toHaveBeenCalledWith('set_animal_primary_photo', {
        p_animal_id: animalId,
        p_path: `${shelterId}/animals/${animalId}/new.jpg`,
      });
    });

    await waitFor(() => {
      expect(
        (galleryButton.props as { accessibilityState?: { disabled?: boolean } })
          .accessibilityState?.disabled,
      ).toBe(false);
    });
  });

  it('shows a retry affordance on an upload failure and retries without re-picking', async () => {
    pickImageFromGallery.mockResolvedValue({
      status: 'success',
      asset: pickedAsset,
    });
    uploadImageToStorage
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(`${shelterId}/animals/${animalId}/new.jpg`);

    const { client, mocks } = createClient({ primaryPhotoPath: null });
    const { screen } = await renderScreen(client);
    await screen.findByText('Mia');

    await fireEvent.press(
      screen.getByRole('button', { name: 'Seleccionar de galería' }),
    );

    expect(
      await screen.findByText(
        'No pudimos subir la foto. Inténtalo nuevamente.',
      ),
    ).toBeTruthy();
    expect(pickImageFromGallery).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => {
      expect(mocks.rpc).toHaveBeenCalledWith('set_animal_primary_photo', {
        p_animal_id: animalId,
        p_path: `${shelterId}/animals/${animalId}/new.jpg`,
      });
    });
    // The retry re-uses the already-picked asset instead of opening the picker again.
    expect(pickImageFromGallery).toHaveBeenCalledTimes(1);
  });

  it('shows a permission-denied message without touching the picker or uploading', async () => {
    captureImageWithCamera.mockResolvedValue({ status: 'permission_denied' });

    const { client } = createClient({ primaryPhotoPath: null });
    const { screen } = await renderScreen(client);
    await screen.findByText('Mia');

    await fireEvent.press(screen.getByRole('button', { name: 'Tomar foto' }));

    expect(
      await screen.findByText(
        'No tenemos permiso para acceder a la cámara o la galería. Habilítalo en la configuración del dispositivo.',
      ),
    ).toBeTruthy();
    expect(uploadImageToStorage).not.toHaveBeenCalled();
  });

  it('rejects an invalid file before uploading', async () => {
    pickImageFromGallery.mockResolvedValue({
      status: 'success',
      asset: pickedAsset,
    });
    validateImage.mockReturnValue({
      valid: false,
      error: 'invalid_mime_type',
    });

    const { client } = createClient({ primaryPhotoPath: null });
    const { screen } = await renderScreen(client);
    await screen.findByText('Mia');

    await fireEvent.press(
      screen.getByRole('button', { name: 'Seleccionar de galería' }),
    );

    expect(
      await screen.findByText(
        'Ese archivo no es una imagen compatible (JPEG, PNG o WEBP).',
      ),
    ).toBeTruthy();
    expect(uploadImageToStorage).not.toHaveBeenCalled();
  });

  it('leaves the state unchanged when the user cancels the picker', async () => {
    pickImageFromGallery.mockResolvedValue({ status: 'cancelled' });

    const { client } = createClient({ primaryPhotoPath: null });
    const { screen } = await renderScreen(client);
    await screen.findByText('Mia');

    await fireEvent.press(
      screen.getByRole('button', { name: 'Seleccionar de galería' }),
    );

    await waitFor(() => {
      expect(uploadImageToStorage).not.toHaveBeenCalled();
    });
    expect(screen.getByText('M')).toBeTruthy();
  });
});
