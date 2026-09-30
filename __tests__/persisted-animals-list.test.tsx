import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  type RenderResult,
} from '@testing-library/react-native';
import type { ReactElement } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

import { AnimalsScreen } from '@/features/animals/animals-screen';
import { listAnimalsForShelter } from '@/features/animals/persisted-animal-repository';
import type { Database } from '@/lib/database.types';
import i18n from '@/i18n';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: { Screen: () => null },
  router: { push: jest.fn() },
}));

jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: jest.fn(),
}));

const { useAuth } = jest.requireMock('@/features/auth/auth-provider') as {
  useAuth: jest.Mock;
};

const shelterId = '00000000-0000-4000-8000-000000000001';

type Result = { data: unknown; error: unknown } | Promise<unknown>;

function animalRow(overrides: Record<string, unknown>) {
  return {
    id: 'a1',
    name: 'Animal',
    species: 'DOG',
    sex: 'FEMALE',
    size: 'MEDIUM',
    status: 'READY',
    approximate_age_months: 24,
    notes: null,
    primary_photo_path: null,
    updated_at: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

function createClient(result: Result): SupabaseClient<Database> {
  const from = jest.fn(() => {
    const settle = () =>
      result instanceof Promise ? result : Promise.resolve(result);
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn(() => builder);
    builder.eq = jest.fn(() => builder);
    builder.is = jest.fn(() => builder);
    builder.order = jest.fn(() => settle());
    builder.then = (resolve: (value: unknown) => unknown) =>
      settle().then(resolve);
    return builder;
  });
  return { from, rpc: jest.fn() } as unknown as SupabaseClient<Database>;
}

const trackedQueryClients: QueryClient[] = [];

function createTestQueryClient(): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retry: false } },
  });
  trackedQueryClients.push(queryClient);
  return queryClient;
}

async function renderScreen(
  ui: ReactElement,
  client: SupabaseClient<Database> | null,
): Promise<RenderResult> {
  useAuth.mockReturnValue({
    profile: { shelterId, shelterName: 'Huellitas Rescue' },
    supabase: client,
  });
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      {ui}
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  jest.clearAllMocks();
  await i18n.changeLanguage('es');
});

afterEach(() => {
  while (trackedQueryClients.length > 0) {
    trackedQueryClients.pop()?.clear();
  }
});

describe('Persisted AnimalsScreen', () => {
  it('shows the loading state while the query is pending', async () => {
    const screen = await renderScreen(
      <AnimalsScreen />,
      createClient(new Promise(() => undefined)),
    );
    expect(screen.getByText('Cargando los animales…')).toBeTruthy();
  });

  it('shows an error state with a refresh action', async () => {
    const screen = await renderScreen(
      <AnimalsScreen />,
      createClient({ data: null, error: { message: 'boom' } }),
    );
    expect(
      await screen.findByText('No pudimos cargar los animales'),
    ).toBeTruthy();
    expect(screen.getByText('Actualizar')).toBeTruthy();
  });

  it('renders the shelter animals and filters by operational status', async () => {
    const screen = await renderScreen(
      <AnimalsScreen />,
      createClient({
        data: [
          animalRow({ id: 'luna', name: 'Luna', status: 'IN_PROCESS' }),
          animalRow({ id: 'toby', name: 'Toby', status: 'READY' }),
          animalRow({ id: 'nala', name: 'Nala', status: 'READY' }),
        ],
        error: null,
      }),
    );

    expect(await screen.findByText('Luna')).toBeTruthy();
    expect(screen.getByText('3 animales')).toBeTruthy();

    await fireEvent.press(screen.getByRole('tab', { name: 'Listos' }));

    expect(screen.getByText('2 animales')).toBeTruthy();
    expect(screen.getByText('Toby')).toBeTruthy();
    expect(screen.queryByText('Luna')).toBeNull();
  });

  it('shows the empty state when the shelter has no animals', async () => {
    const screen = await renderScreen(
      <AnimalsScreen />,
      createClient({ data: [], error: null }),
    );
    expect(
      await screen.findByText('No hay animales en este estado'),
    ).toBeTruthy();
  });
});

describe('listAnimalsForShelter', () => {
  it('maps snake_case rows to the persisted animal shape', async () => {
    const client = createClient({
      data: [animalRow({ id: 'x', name: 'Rex', approximate_age_months: null })],
      error: null,
    });
    await expect(listAnimalsForShelter(client, shelterId)).resolves.toEqual([
      {
        id: 'x',
        name: 'Rex',
        species: 'DOG',
        sex: 'FEMALE',
        size: 'MEDIUM',
        status: 'READY',
        approximateAgeMonths: null,
        notes: null,
        primaryPhotoPath: null,
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ]);
  });
});
