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
  getAdoptionDecisionCandidate,
  listPendingAdoptionDecisions,
} from '@/features/adoptions/adoption-repository';
import { adoptionDecisionKeys } from '@/features/adoptions/adoption-queries';
import { PersistedAdoptionConfirmationScreen } from '@/features/adoptions/persisted-adoption-confirmation-screen';
import { TodayScreen } from '@/features/today/today-screen';
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

const candidate = {
  id: '00000000-0000-4000-8000-000000000055',
  status: 'DECISION_PENDING',
  people: { name: 'Lucia Torres' },
  animals: {
    id: '00000000-0000-4000-8000-000000000013',
    name: 'Nala',
    status: 'IN_PROCESS',
  },
};

function createClient({
  list = { data: [candidate], error: null },
  detail = { data: candidate, error: null },
  rpc = { data: '00000000-0000-4000-8000-000000000091', error: null },
}: {
  list?: { data: unknown[] | null; error: unknown } | Promise<unknown>;
  detail?: { data: unknown | null; error: unknown } | Promise<unknown>;
  rpc?: { data: string | null; error: unknown } | Promise<unknown>;
} = {}) {
  const listOrder = jest.fn(() => list);
  const listEq = jest.fn(() => ({ order: listOrder }));
  const detailMaybeSingle = jest.fn(() => detail);
  const detailEq = jest.fn(() => ({ maybeSingle: detailMaybeSingle }));
  const select = jest.fn((fields: string) =>
    fields.includes('animals')
      ? {
          eq: jest.fn((column: string) =>
            column === 'status' ? listEq() : detailEq(),
          ),
        }
      : undefined,
  );
  const from = jest.fn(() => ({ select }));
  const client = {
    from,
    rpc: jest.fn(() => rpc),
  } as unknown as SupabaseClient<Database>;

  return {
    client,
    mocks: { from, select, listEq, listOrder, detailEq, detailMaybeSingle },
  };
}

async function renderWithClient(
  ui: ReactElement,
  client: SupabaseClient<Database> | null,
  queryClient = createTestQueryClient(),
): Promise<{ screen: RenderResult; queryClient: QueryClient }> {
  useAuth.mockReturnValue({
    profile: { shelterId: '00000000-0000-4000-8000-000000000001' },
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

describe('Persisted adoption decisions', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('es');
    mockedUseLocalSearchParams.mockReturnValue({ candidateId: candidate.id });
  });

  afterEach(() => {
    while (trackedQueryClients.length > 0) {
      const queryClient = trackedQueryClients.pop();
      queryClient?.getMutationCache().clear();
      queryClient?.clear();
    }
  });

  it('renders loading, empty, and error states for real decisions', async () => {
    let resolveList!: (value: unknown) => void;
    const pendingList = new Promise((resolve) => {
      resolveList = resolve;
    });
    const loading = createClient({ list: pendingList });
    const { screen: loadingView } = await renderWithClient(
      <PrototypeFlowProvider>
        <TodayScreen />
      </PrototypeFlowProvider>,
      loading.client,
    );
    expect(
      loadingView.getByText('Cargando decisiones de adopción…'),
    ).toBeTruthy();
    resolveList({ data: [], error: null });
    expect(
      await loadingView.findByText(
        'No hay decisiones de adopción reales pendientes.',
      ),
    ).toBeTruthy();

    const empty = createClient({ list: { data: [], error: null } });
    const { screen: emptyView } = await renderWithClient(
      <PrototypeFlowProvider>
        <TodayScreen />
      </PrototypeFlowProvider>,
      empty.client,
    );
    expect(
      await emptyView.findByText(
        'No hay decisiones de adopción reales pendientes.',
      ),
    ).toBeTruthy();

    const failed = createClient({
      list: { data: null, error: { message: 'network unavailable' } },
    });
    const { screen: failedView } = await renderWithClient(
      <PrototypeFlowProvider>
        <TodayScreen />
      </PrototypeFlowProvider>,
      failed.client,
    );
    expect(
      await failedView.findByText(
        'No pudimos cargar las decisiones de adopción. Inténtalo nuevamente.',
      ),
    ).toBeTruthy();
  });

  it('navigates from a real decision using its UUID', async () => {
    const { client } = createClient();
    const { screen } = await renderWithClient(
      <PrototypeFlowProvider>
        <TodayScreen />
      </PrototypeFlowProvider>,
      client,
    );

    await fireEvent.press(
      await screen.findByRole('button', {
        name: 'Abrir decisión de adopción de Lucia Torres para Nala',
      }),
    );

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/adoptions/confirm/[candidateId]',
      params: { candidateId: candidate.id },
    });
  });

  it('maps RLS-hidden candidate details to no result in the repository', async () => {
    const { client, mocks } = createClient({
      detail: { data: null, error: null },
    });

    await expect(
      getAdoptionDecisionCandidate(client, candidate.id),
    ).resolves.toBeNull();
    expect(mocks.detailMaybeSingle).toHaveBeenCalledTimes(1);
  });

  it('queries pending decisions with their person and animal', async () => {
    const { client, mocks } = createClient();

    await expect(listPendingAdoptionDecisions(client)).resolves.toEqual([
      {
        id: candidate.id,
        status: 'DECISION_PENDING',
        personName: 'Lucia Torres',
        animal: {
          id: candidate.animals.id,
          name: 'Nala',
          status: 'IN_PROCESS',
        },
      },
    ]);
    expect(mocks.listOrder).toHaveBeenCalledWith('updated_at', {
      ascending: true,
    });
  });

  it('confirms with the exact RPC arguments and invalidates decision queries', async () => {
    jest.useFakeTimers({ now: new Date(2026, 8, 2, 12) });
    const { client } = createClient();
    const queryClient = createTestQueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const { screen } = await renderWithClient(
      <PersistedAdoptionConfirmationScreen />,
      client,
      queryClient,
    );

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Confirmar adopción' }),
    );

    await waitFor(() => {
      expect(client.rpc).toHaveBeenCalledWith('confirm_adoption', {
        p_candidate_id: candidate.id,
        p_adoption_date: '2026-09-02',
        p_handover_notes: null,
        p_followup_due_dates: ['2026-09-09', '2026-10-02', '2026-11-01'],
      });
      expect(screen.getByText('Adopción confirmada')).toBeTruthy();
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: adoptionDecisionKeys.list(
        '00000000-0000-4000-8000-000000000001',
      ),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: adoptionDecisionKeys.detail(
        '00000000-0000-4000-8000-000000000001',
        candidate.id,
      ),
    });
    jest.useRealTimers();
  });

  it('prevents a second confirmation while the RPC is pending', async () => {
    let resolveRpc!: (value: unknown) => void;
    const pendingRpc = new Promise((resolve) => {
      resolveRpc = resolve;
    });
    const { client } = createClient({ rpc: pendingRpc });
    const { screen } = await renderWithClient(
      <PersistedAdoptionConfirmationScreen />,
      client,
    );
    const button = await screen.findByRole('button', {
      name: 'Confirmar adopción',
    });

    await fireEvent.press(button);
    await fireEvent.press(button);

    expect(client.rpc).toHaveBeenCalledTimes(1);
    resolveRpc({ data: '00000000-0000-4000-8000-000000000091', error: null });
    expect(await screen.findByText('Adopción confirmada')).toBeTruthy();
  });

  it('keeps the confirmation screen recoverable when the RPC fails', async () => {
    const { client } = createClient({
      rpc: { data: null, error: { message: 'SQL state P0001 must not leak' } },
    });
    const { screen } = await renderWithClient(
      <PersistedAdoptionConfirmationScreen />,
      client,
    );

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Confirmar adopción' }),
    );

    expect(
      await screen.findByText(
        'No pudimos confirmar la adopción. Revisa la decisión e inténtalo nuevamente.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/SQL state P0001/)).toBeNull();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Confirmar adopción' }),
    );
    expect(client.rpc).toHaveBeenCalledTimes(2);
  });

  it('recovers the confirmation screen when the candidate detail query fails and is retried', async () => {
    const { client, mocks } = createClient({
      detail: { data: null, error: { message: 'network unavailable' } },
    });
    const { screen } = await renderWithClient(
      <PersistedAdoptionConfirmationScreen />,
      client,
    );

    expect(
      await screen.findByText('No pudimos cargar la decisión'),
    ).toBeTruthy();
    expect(
      screen.getByText('Revisa tu conexión e inténtalo nuevamente.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Confirmar adopción' }),
    ).toBeNull();

    mocks.detailMaybeSingle.mockReturnValueOnce({
      data: candidate,
      error: null,
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByRole('button', { name: 'Confirmar adopción' }),
    ).toBeTruthy();
    expect(screen.queryByText('No pudimos cargar la decisión')).toBeNull();
  });

  it('shows localized status text and keeps confirm disabled for a non-pending candidate', async () => {
    const selectedCandidate = { ...candidate, status: 'SELECTED' };
    const { client } = createClient({
      detail: { data: selectedCandidate, error: null },
    });
    const { screen } = await renderWithClient(
      <PersistedAdoptionConfirmationScreen />,
      client,
    );

    await screen.findByText('Lucia Torres');
    expect(screen.queryByText('SELECTED')).toBeNull();
    expect(screen.getByText('Seleccionado')).toBeTruthy();
    expect(
      screen.getByText(
        'Esta adopción solo se puede confirmar cuando el servidor indica una decisión pendiente.',
      ),
    ).toBeTruthy();
    const confirmButton = screen.getByRole('button', {
      name: 'Confirmar adopción',
    });
    expect(
      (confirmButton.props as { accessibilityState?: { disabled?: boolean } })
        .accessibilityState?.disabled,
    ).toBe(true);
  });
});
