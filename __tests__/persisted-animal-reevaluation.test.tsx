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

import {
  getAnimalById,
  listTimelineForAnimal,
} from '@/features/animals/persisted-animal-repository';
import { animalKeys } from '@/features/animals/persisted-animal-queries';
import { PersistedAnimalDetailScreen } from '@/features/animals/persisted-animal-detail-screen';
import { PersistedReevaluationScreen } from '@/features/animals/persisted-reevaluation-screen';
import { PersistedAdoptionDetailScreen } from '@/features/adoptions/persisted-adoption-detail-screen';
import { adoptionKeys } from '@/features/adoptions/active-adoption-queries';
import { adoptionDecisionKeys } from '@/features/adoptions/adoption-queries';
import { PrototypeFlowProvider } from '@/features/prototype-flow/prototype-flow-provider';
import type { Database } from '@/lib/database.types';
import i18n from '@/i18n';

jest.mock('expo-router', () => {
  const React = require('react');
  const router = { push: jest.fn(), replace: jest.fn() };
  return {
    Link: ({
      children,
      href,
    }: {
      children: React.ReactElement;
      href: unknown;
    }) => React.cloneElement(children, { onPress: () => router.push(href) }),
    Stack: { Screen: () => null },
    router,
    useLocalSearchParams: jest.fn(),
  };
});

jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: jest.fn(),
}));

const mockedUseLocalSearchParams = jest.mocked(useLocalSearchParams);
const { router } = jest.requireMock('expo-router') as {
  router: { push: jest.Mock; replace: jest.Mock };
};
const { useAuth } = jest.requireMock('@/features/auth/auth-provider') as {
  useAuth: jest.Mock;
};

const shelterId = '00000000-0000-4000-8000-000000000001';
const animalId = '00000000-0000-4000-8000-000000000012';

const reevaluationAnimal = {
  id: animalId,
  name: 'Mia',
  species: 'CAT',
  sex: 'FEMALE',
  size: 'SMALL',
  status: 'REEVALUATION',
  approximate_age_months: 36,
  notes: null,
  primary_photo_path: null,
  updated_at: '2026-09-02T12:00:00Z',
};

const readyAnimal = {
  ...reevaluationAnimal,
  status: 'READY',
};

const notAvailableAnimal = {
  ...reevaluationAnimal,
  status: 'NOT_AVAILABLE',
};

const timeline = [
  {
    id: '00000000-0000-4000-8000-000000000137',
    event_type: 'ADOPTION_RETURNED',
    occurred_at: '2026-09-02T00:00:00Z',
    data: { person: 'Maria Fernandez' },
  },
  {
    id: '00000000-0000-4000-8000-000000000138',
    event_type: 'REEVALUATION_REQUIRED',
    occurred_at: '2026-09-02T00:00:00Z',
    data: null,
  },
  {
    id: '00000000-0000-4000-8000-000000000129',
    event_type: 'ANIMAL_READY',
    occurred_at: '2026-05-19T00:00:00Z',
    data: null,
  },
];

const returnedAdoption = {
  id: '00000000-0000-4000-8000-000000000092',
  status: 'RETURNED',
  adoption_date: '2026-06-03',
  handover_notes: 'Standard handover checklist.',
  animal_id: animalId,
  animals: {
    id: animalId,
    name: 'Mia',
    status: 'REEVALUATION',
  },
  candidate_id: '00000000-0000-4000-8000-000000000054',
  candidates: {
    id: '00000000-0000-4000-8000-000000000054',
    status: 'SELECTED',
    person_id: '00000000-0000-4000-8000-000000000034',
    people: {
      id: '00000000-0000-4000-8000-000000000034',
      name: 'Maria Fernandez',
    },
  },
};

function createClient({
  animalDetail = { data: reevaluationAnimal, error: null },
  animalTimeline = { data: timeline, error: null },
  adoptionDetail = { data: returnedAdoption, error: null },
  unknownRpc = { data: null, error: null },
  completeReevaluationRpc = {
    data: animalId,
    error: null,
  },
}: {
  animalDetail?: { data: unknown | null; error: unknown } | Promise<unknown>;
  animalTimeline?:
    { data: unknown[] | null; error: unknown } | Promise<unknown>;
  adoptionDetail?: { data: unknown | null; error: unknown } | Promise<unknown>;
  unknownRpc?: { data: string | null; error: unknown } | Promise<unknown>;
  completeReevaluationRpc?:
    { data: string | null; error: unknown } | Promise<unknown>;
} = {}) {
  const animalDetailMaybeSingle = jest.fn(() => animalDetail);
  const animalDetailEq = jest.fn(() => ({
    maybeSingle: animalDetailMaybeSingle,
  }));

  const animalTimelineOrder = jest.fn(() => animalTimeline);
  const animalTimelineEq = jest.fn(() => ({ order: animalTimelineOrder }));

  const adoptionDetailMaybeSingle = jest.fn(() => adoptionDetail);
  const adoptionDetailEq = jest.fn(() => ({
    maybeSingle: adoptionDetailMaybeSingle,
  }));

  function router(fields: string, column: string) {
    if (fields.includes('updated_at')) {
      if (column === 'id') return animalDetailEq();
      return animalDetailEq();
    }
    if (fields.includes('occurred_at')) {
      return animalTimelineEq();
    }
    if (fields.includes('handover_notes')) {
      return adoptionDetailEq();
    }
    return animalDetailEq();
  }

  const from = jest.fn((table: string) => {
    if (table === 'animals') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn((column: string) =>
            column === 'id' ? animalDetailEq() : animalDetailEq(),
          ),
        })),
      };
    }
    if (table === 'timeline_events') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => animalTimelineEq()),
        })),
      };
    }
    if (table === 'adoptions') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => adoptionDetailEq()),
        })),
      };
    }
    return {
      select: jest.fn(() => ({
        eq: jest.fn((column: string) => router('default', column)),
      })),
    };
  });

  const rpcFns: Record<string, jest.Mock> = {
    complete_reevaluation: jest.fn(() =>
      Promise.resolve(completeReevaluationRpc),
    ),
  };
  const rpc = jest.fn((name: string, args: unknown) => {
    const fn = rpcFns[name];
    if (fn) {
      return fn(args);
    }
    return Promise.resolve(unknownRpc);
  });

  const client = { from, rpc } as unknown as SupabaseClient<Database>;

  return {
    client,
    mocks: {
      from,
      animalDetailMaybeSingle,
      animalDetailEq,
      animalTimelineOrder,
      animalTimelineEq,
      adoptionDetailMaybeSingle,
      adoptionDetailEq,
      rpcFns,
    },
  };
}

async function renderWithClient(
  ui: ReactElement,
  client: SupabaseClient<Database> | null,
  queryClient = createTestQueryClient(),
): Promise<{ screen: RenderResult; queryClient: QueryClient }> {
  useAuth.mockReturnValue({
    profile: { shelterId },
    supabase: client,
  });
  return {
    screen: await render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
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

describe('Persisted reevaluation flow', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
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

  describe('Persisted animal detail', () => {
    it('renders loading, error with retry, and not-found states', async () => {
      const loading = createClient({
        animalDetail: new Promise(() => undefined),
      });
      const { screen: loadingView } = await renderWithClient(
        <PersistedAnimalDetailScreen />,
        loading.client,
      );
      expect(loadingView.getByText('Cargando el animal…')).toBeTruthy();
      expect(loadingView.queryByText('No pudimos cargar el animal')).toBeNull();

      const failed = createClient({
        animalDetail: { data: null, error: { message: 'network down' } },
      });
      const { screen: failedView } = await renderWithClient(
        <PersistedAnimalDetailScreen />,
        failed.client,
      );
      expect(
        await failedView.findByText('No pudimos cargar el animal'),
      ).toBeTruthy();
      expect(
        failedView.getByText('Revisa tu conexión e inténtalo nuevamente.'),
      ).toBeTruthy();
      expect(
        failedView.getByRole('button', { name: 'Reintentar' }),
      ).toBeTruthy();

      const missing = createClient({
        animalDetail: { data: null, error: null },
      });
      const { screen: missingView } = await renderWithClient(
        <PersistedAnimalDetailScreen />,
        missing.client,
      );
      expect(await missingView.findByText('Animal no encontrado')).toBeTruthy();
      expect(
        missingView.getByText('No pudimos encontrar este animal.'),
      ).toBeTruthy();
    });

    it('shows the reevaluation action only when the animal is in REEVALUATION', async () => {
      const reevaluationView = createClient();
      const { screen: reevaluationScreen } = await renderWithClient(
        <PersistedAnimalDetailScreen />,
        reevaluationView.client,
      );
      await reevaluationScreen.findByText('Mia');
      const reevaluationButton = reevaluationScreen.getByRole('button', {
        name: 'Completar reevaluación',
      });
      await fireEvent.press(reevaluationButton);
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/animals/[animalId]/reevaluation',
        params: { animalId },
      });

      const readyClient = createClient({
        animalDetail: { data: readyAnimal, error: null },
      });
      const { screen: readyScreen } = await renderWithClient(
        <PersistedAnimalDetailScreen />,
        readyClient.client,
      );
      await readyScreen.findByText('Mia');
      expect(
        readyScreen.queryByRole('button', { name: 'Completar reevaluación' }),
      ).toBeNull();

      const notAvailableClient = createClient({
        animalDetail: { data: notAvailableAnimal, error: null },
      });
      const { screen: notAvailableScreen } = await renderWithClient(
        <PersistedAnimalDetailScreen />,
        notAvailableClient.client,
      );
      await notAvailableScreen.findByText('Mia');
      expect(
        notAvailableScreen.queryByRole('button', {
          name: 'Completar reevaluación',
        }),
      ).toBeNull();
    });

    it('renders the persisted timeline events for the animal', async () => {
      const { client } = createClient();
      const { screen } = await renderWithClient(
        <PersistedAnimalDetailScreen />,
        client,
      );

      await screen.findByText('Mia');
      expect(
        screen.getByText('La adopción con Maria Fernandez fue devuelta.'),
      ).toBeTruthy();
      expect(
        screen.getByText('Mia requiere una reevaluación humana.'),
      ).toBeTruthy();
    });

    it('maps RLS-hidden animal details to no result in the repository', async () => {
      const { client } = createClient({
        animalDetail: { data: null, error: null },
      });

      await expect(getAnimalById(client, animalId)).resolves.toBeNull();
      const expectedTimeline = [
        {
          id: '00000000-0000-4000-8000-000000000137',
          eventType: 'ADOPTION_RETURNED',
          occurredAt: '2026-09-02T00:00:00Z',
          data: { person: 'Maria Fernandez' },
        },
        {
          id: '00000000-0000-4000-8000-000000000138',
          eventType: 'REEVALUATION_REQUIRED',
          occurredAt: '2026-09-02T00:00:00Z',
          data: null,
        },
        {
          id: '00000000-0000-4000-8000-000000000129',
          eventType: 'ANIMAL_READY',
          occurredAt: '2026-05-19T00:00:00Z',
          data: null,
        },
      ];
      await expect(listTimelineForAnimal(client, animalId)).resolves.toEqual(
        expectedTimeline,
      );
    });
  });

  describe('Persisted reevaluation screen', () => {
    it('renders loading, error with retry, and not-found states', async () => {
      const loading = createClient({
        animalDetail: new Promise(() => undefined),
      });
      const { screen: loadingView } = await renderWithClient(
        <PersistedReevaluationScreen />,
        loading.client,
      );
      expect(loadingView.getByText('Cargando el animal…')).toBeTruthy();
      expect(loadingView.queryByText('No pudimos cargar el animal')).toBeNull();

      const failed = createClient({
        animalDetail: { data: null, error: { message: 'network down' } },
      });
      const { screen: failedView } = await renderWithClient(
        <PersistedReevaluationScreen />,
        failed.client,
      );
      expect(
        await failedView.findByText('No pudimos cargar el animal'),
      ).toBeTruthy();
      expect(
        failedView.getByRole('button', { name: 'Reintentar' }),
      ).toBeTruthy();

      const missing = createClient({
        animalDetail: { data: null, error: null },
      });
      const { screen: missingView } = await renderWithClient(
        <PersistedReevaluationScreen />,
        missing.client,
      );
      expect(await missingView.findByText('Animal no disponible')).toBeTruthy();
    });

    it('shows an invalid state when the animal is not in REEVALUATION', async () => {
      const { client } = createClient({
        animalDetail: { data: readyAnimal, error: null },
      });
      const { screen } = await renderWithClient(
        <PersistedReevaluationScreen />,
        client,
      );

      expect(
        await screen.findByText('Reevaluación no disponible'),
      ).toBeTruthy();
      expect(
        screen.getByText(
          'Solo se puede completar la reevaluación cuando el animal está en estado REEVALUATION.',
        ),
      ).toBeTruthy();
    });

    it('keeps the submit disabled until a decision is chosen and sends the exact RPC arguments', async () => {
      const { client, mocks } = createClient();
      const queryClient = createTestQueryClient();
      const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
      const { screen } = await renderWithClient(
        <PersistedReevaluationScreen />,
        client,
        queryClient,
      );

      const submit = await screen.findByRole('button', {
        name: 'Completar reevaluación',
      });
      expect(
        (submit.props as { accessibilityState?: { disabled?: boolean } })
          .accessibilityState?.disabled,
      ).toBe(true);
      expect(
        screen.getByText('Selecciona una decisión para habilitar la acción.'),
      ).toBeTruthy();

      await fireEvent.press(
        screen.getByRole('radio', { name: 'Listo para adopción' }),
      );
      expect(
        (
          screen.getByRole('button', { name: 'Completar reevaluación' })
            .props as {
            accessibilityState?: { disabled?: boolean };
          }
        ).accessibilityState?.disabled,
      ).toBe(false);

      await fireEvent.press(
        screen.getByRole('button', { name: 'Completar reevaluación' }),
      );

      await waitFor(() => {
        expect(mocks.rpcFns.complete_reevaluation).toHaveBeenCalledWith({
          p_animal_id: animalId,
          p_next_status: 'READY',
        });
      });

      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: animalKeys.detail(shelterId, animalId),
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: animalKeys.timeline(shelterId, animalId),
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: adoptionKeys.list(shelterId),
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: adoptionDecisionKeys.list(shelterId),
      });

      expect(await screen.findByText('Reevaluación completada')).toBeTruthy();
      const backToAnimal = screen.getByRole('button', { name: 'Ver animal' });
      await fireEvent.press(backToAnimal);
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/animals/[animalId]',
        params: { animalId },
      });
    });

    it('sends NOT_AVAILABLE when the corresponding decision is chosen', async () => {
      const { client, mocks } = createClient();
      const { screen } = await renderWithClient(
        <PersistedReevaluationScreen />,
        client,
      );

      await fireEvent.press(
        await screen.findByRole('radio', { name: 'No disponible' }),
      );
      await fireEvent.press(
        screen.getByRole('button', { name: 'Completar reevaluación' }),
      );

      await waitFor(() => {
        expect(mocks.rpcFns.complete_reevaluation).toHaveBeenCalledWith({
          p_animal_id: animalId,
          p_next_status: 'NOT_AVAILABLE',
        });
      });
    });

    it('prevents a second submit while the RPC is pending', async () => {
      let resolveRpc!: (value: unknown) => void;
      const pendingRpc = new Promise((resolve) => {
        resolveRpc = resolve;
      });
      const { client, mocks } = createClient({
        completeReevaluationRpc: pendingRpc,
      });
      const { screen } = await renderWithClient(
        <PersistedReevaluationScreen />,
        client,
      );

      await fireEvent.press(
        await screen.findByRole('radio', { name: 'Listo para adopción' }),
      );

      const submit = await screen.findByRole('button', {
        name: 'Completar reevaluación',
      });
      await fireEvent.press(submit);
      await fireEvent.press(submit);

      expect(mocks.rpcFns.complete_reevaluation).toHaveBeenCalledTimes(1);
      resolveRpc({ data: animalId, error: null });
    });

    it('keeps the form recoverable when the RPC returns no result', async () => {
      const { client, mocks } = createClient({
        completeReevaluationRpc: {
          data: null,
          error: null,
        },
      });
      const { screen } = await renderWithClient(
        <PersistedReevaluationScreen />,
        client,
      );

      await fireEvent.press(
        await screen.findByRole('radio', { name: 'Listo para adopción' }),
      );
      await fireEvent.press(
        screen.getByRole('button', { name: 'Completar reevaluación' }),
      );

      expect(
        await screen.findByText(
          'No pudimos guardar la reevaluación. Inténtalo nuevamente.',
        ),
      ).toBeTruthy();
      await fireEvent.press(
        screen.getByRole('button', { name: 'Completar reevaluación' }),
      );
      expect(mocks.rpcFns.complete_reevaluation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Returned adoption provides the reevaluation link', () => {
    it('exposes the reevaluation link in the persisted adoption detail', async () => {
      const { client } = createClient();
      mockedUseLocalSearchParams.mockReturnValue({
        adoptionId: returnedAdoption.id,
      });
      const { screen } = await renderWithClient(
        <PrototypeFlowProvider>
          <PersistedAdoptionDetailScreen />
        </PrototypeFlowProvider>,
        client,
      );

      const reevaluationButton = await screen.findByRole('button', {
        name: 'Completar reevaluación',
      });
      await fireEvent.press(reevaluationButton);
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/animals/[animalId]/reevaluation',
        params: { animalId: returnedAdoption.animals.id },
      });
    });
  });
});
