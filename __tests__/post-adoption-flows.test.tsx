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
  listActiveAdoptions,
  getAdoptionById,
} from '@/features/adoptions/active-adoption-repository';
import { adoptionKeys } from '@/features/adoptions/active-adoption-queries';
import { adoptionDecisionKeys } from '@/features/adoptions/adoption-queries';
import { CompleteFollowupScreen } from '@/features/adoptions/complete-followup-screen';
import { PersistedAdoptionDetailScreen } from '@/features/adoptions/persisted-adoption-detail-screen';
import { PersistedAdoptionConfirmationScreen } from '@/features/adoptions/persisted-adoption-confirmation-screen';
import { ReturnAdoptionScreen } from '@/features/adoptions/return-adoption-screen';
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

const shelterId = '00000000-0000-4000-8000-000000000001';

const adoption = {
  id: '00000000-0000-4000-8000-000000000091',
  status: 'ACTIVE',
  adoption_date: '2026-09-02',
  handover_notes: 'Handover included food and leash.',
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

const returnedAdoption = {
  ...adoption,
  id: '00000000-0000-4000-8000-000000000092',
  status: 'RETURNED',
  animals: {
    id: '00000000-0000-4000-8000-000000000012',
    name: 'Mia',
    status: 'REEVALUATION',
  },
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

const candidateRow = {
  id: '00000000-0000-4000-8000-000000000055',
  status: 'DECISION_PENDING',
  people: { name: 'Lucia Torres' },
  animals: {
    id: '00000000-0000-4000-8000-000000000013',
    name: 'Nala',
    status: 'IN_PROCESS',
  },
};

const followups = [
  {
    id: '00000000-0000-4000-8000-000000000111',
    adoption_id: adoption.id,
    due_date: '2026-09-09',
    status: 'COMPLETED',
    outcome: 'EXCELLENT',
    notes: 'Luna is settling in well.',
    completed_at: '2026-09-09T12:00:00Z',
    cancelled_at: null,
    cancellation_reason: null,
  },
  {
    id: '00000000-0000-4000-8000-000000000112',
    adoption_id: adoption.id,
    due_date: '2026-10-02',
    status: 'COMPLETED',
    outcome: 'GOOD',
    notes: null,
    completed_at: '2026-10-02T12:00:00Z',
    cancelled_at: null,
    cancellation_reason: null,
  },
  {
    id: '00000000-0000-4000-8000-000000000113',
    adoption_id: adoption.id,
    due_date: '2026-11-01',
    status: 'PENDING',
    outcome: null,
    notes: null,
    completed_at: null,
    cancelled_at: null,
    cancellation_reason: null,
  },
];

type RpcResponse = { data: string | null; error: unknown } | Promise<unknown>;

function createClient({
  adoptionList = { data: [adoption], error: null },
  adoptionDetail = { data: adoption, error: null },
  followupList = { data: followups, error: null },
  decisionList = { data: [candidateRow], error: null },
  candidateDetail = { data: candidateRow, error: null },
  unknownRpc = { data: null, error: null },
  completeRpc = {
    data: '00000000-0000-4000-8000-000000000113',
    error: null,
  },
  returnRpc = {
    data: '00000000-0000-4000-8000-000000000101',
    error: null,
  },
  confirmRpc = {
    data: adoption.id,
    error: null,
  },
}: {
  adoptionList?: { data: unknown[] | null; error: unknown } | Promise<unknown>;
  adoptionDetail?: { data: unknown | null; error: unknown } | Promise<unknown>;
  followupList?: { data: unknown[] | null; error: unknown } | Promise<unknown>;
  decisionList?: { data: unknown[] | null; error: unknown } | Promise<unknown>;
  candidateDetail?: { data: unknown | null; error: unknown } | Promise<unknown>;
  unknownRpc?: { data: string | null; error: unknown } | Promise<unknown>;
  completeRpc?: { data: string | null; error: unknown } | Promise<unknown>;
  returnRpc?: { data: string | null; error: unknown } | Promise<unknown>;
  confirmRpc?: { data: string | null; error: unknown };
} = {}) {
  const adoptionListOrder = jest.fn(() => adoptionList);
  const adoptionListEq = jest.fn(() => ({ order: adoptionListOrder }));
  const adoptionDetailMaybeSingle = jest.fn(() => adoptionDetail);
  const adoptionDetailEq = jest.fn(() => ({
    maybeSingle: adoptionDetailMaybeSingle,
  }));

  const followupListOrder = jest.fn(() => followupList);
  const followupListEq = jest.fn(() => ({ order: followupListOrder }));

  const decisionListOrder = jest.fn(() => decisionList);
  const decisionListEq = jest.fn(() => ({ order: decisionListOrder }));

  const candidateDetailMaybeSingle = jest.fn(() => candidateDetail);
  const candidateDetailEq = jest.fn(() => ({
    maybeSingle: candidateDetailMaybeSingle,
  }));

  const from = jest.fn((table: string) => {
    if (table === 'adoptions') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn((column: string) =>
            column === 'status' ? adoptionListEq() : adoptionDetailEq(),
          ),
        })),
      };
    }
    if (table === 'followups') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => followupListEq()),
        })),
      };
    }
    if (table === 'candidates') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn((column: string) =>
            column === 'status' ? decisionListEq() : candidateDetailEq(),
          ),
        })),
      };
    }
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => adoptionListEq()),
      })),
    };
  });

  const rpcFns: Record<string, jest.Mock> = {
    complete_followup: jest.fn(() => Promise.resolve(completeRpc)),
    return_adoption: jest.fn(() => Promise.resolve(returnRpc)),
    confirm_adoption: jest.fn(() => Promise.resolve(confirmRpc)),
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
      adoptionListEq,
      adoptionListOrder,
      adoptionDetailEq,
      adoptionDetailMaybeSingle,
      followupListEq,
      followupListOrder,
      decisionListEq,
      decisionListOrder,
      candidateDetailEq,
      candidateDetailMaybeSingle,
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

describe('Persisted adoption detail and follow-up flows', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('es');
    mockedUseLocalSearchParams.mockReturnValue({
      adoptionId: adoption.id,
      followupId: '00000000-0000-4000-8000-000000000113',
    });
  });

  afterEach(() => {
    while (trackedQueryClients.length > 0) {
      const queryClient = trackedQueryClients.pop();
      queryClient?.getMutationCache().clear();
      queryClient?.clear();
    }
  });

  describe('Today active adoptions section', () => {
    it('renders loading, hides on empty, and exposes error with retry', async () => {
      let resolveList!: (value: unknown) => void;
      const pendingList = new Promise((resolve) => {
        resolveList = resolve;
      });
      const loading = createClient({ adoptionList: pendingList });
      const { screen: loadingView } = await renderWithClient(
        <PrototypeFlowProvider>
          <TodayScreen />
        </PrototypeFlowProvider>,
        loading.client,
      );
      expect(
        loadingView.getByText('Cargando adopciones activas…'),
      ).toBeTruthy();
      expect(loadingView.getByText('Adopciones activas')).toBeTruthy();
      resolveList({ data: [], error: null });
      await waitFor(() => {
        expect(loadingView.queryByText('Adopciones activas')).toBeNull();
      });

      const empty = createClient({ adoptionList: { data: [], error: null } });
      const { screen: emptyView } = await renderWithClient(
        <PrototypeFlowProvider>
          <TodayScreen />
        </PrototypeFlowProvider>,
        empty.client,
      );
      await waitFor(() => {
        expect(emptyView.queryByText('Adopciones activas')).toBeNull();
      });

      const failed = createClient({
        adoptionList: { data: null, error: { message: 'network unavailable' } },
      });
      const { screen: failedView } = await renderWithClient(
        <PrototypeFlowProvider>
          <TodayScreen />
        </PrototypeFlowProvider>,
        failed.client,
      );
      expect(
        await failedView.findByText(
          'No pudimos cargar las adopciones activas. Inténtalo nuevamente.',
        ),
      ).toBeTruthy();
      const retries = await failedView.findAllByRole('button', {
        name: 'Reintentar',
      });
      expect(retries.length).toBeGreaterThanOrEqual(1);
    });

    it('navigates from an active adoption card using its UUID', async () => {
      const { client } = createClient();
      const { screen } = await renderWithClient(
        <PrototypeFlowProvider>
          <TodayScreen />
        </PrototypeFlowProvider>,
        client,
      );

      await fireEvent.press(
        await screen.findByRole('button', {
          name: 'Abrir adopción activa de Andrea Perez para Luna',
        }),
      );

      expect(router.push).toHaveBeenCalledWith({
        pathname: '/adoptions/[adoptionId]',
        params: { adoptionId: adoption.id },
      });
    });
  });

  describe('Persisted adoption detail', () => {
    it('renders loading, error with retry, and not-found states', async () => {
      mockedUseLocalSearchParams.mockReturnValue({
        adoptionId: '00000000-0000-4000-8000-000000000999',
      });

      const loading = createClient({
        adoptionDetail: new Promise(() => undefined),
      });
      const { screen: loadingView } = await renderWithClient(
        <PersistedAdoptionDetailScreen />,
        loading.client,
      );
      expect(
        loadingView.queryByText('No pudimos cargar la adopción'),
      ).toBeNull();
      expect(loadingView.queryByText('Adopción no encontrada')).toBeNull();

      const failed = createClient({
        adoptionDetail: { data: null, error: { message: 'network down' } },
      });
      const { screen: failedView } = await renderWithClient(
        <PersistedAdoptionDetailScreen />,
        failed.client,
      );
      expect(
        await failedView.findByText('No pudimos cargar la adopción'),
      ).toBeTruthy();
      expect(
        failedView.getByText('Revisa tu conexión e inténtalo nuevamente.'),
      ).toBeTruthy();
      expect(
        failedView.getByRole('button', { name: 'Reintentar' }),
      ).toBeTruthy();

      const missing = createClient({
        adoptionDetail: { data: null, error: null },
      });
      const { screen: missingView } = await renderWithClient(
        <PersistedAdoptionDetailScreen />,
        missing.client,
      );
      expect(
        await missingView.findByText('Adopción no encontrada'),
      ).toBeTruthy();
      expect(
        missingView.getByText('No encontramos esta adopción en tu refugio.'),
      ).toBeTruthy();
    });

    it('renders an ACTIVE adoption with summary, follow-ups, complete and return actions', async () => {
      const { client } = createClient();
      const { screen } = await renderWithClient(
        <PersistedAdoptionDetailScreen />,
        client,
      );

      expect(await screen.findByText('Andrea Perez')).toBeTruthy();
      expect(screen.getByText('Luna')).toBeTruthy();
      expect(screen.getByText('Activa')).toBeTruthy();
      expect(
        screen.getByText('Handover included food and leash.'),
      ).toBeTruthy();

      const completeButtons = screen.getAllByRole('button', {
        name: 'Completar seguimiento',
      });
      expect(completeButtons.length).toBe(1);

      await fireEvent.press(
        screen.getByRole('button', { name: 'Registrar retorno' }),
      );
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/adoptions/[adoptionId]/return',
        params: { adoptionId: adoption.id },
      });
    });

    it('renders a RETURNED adoption without complete or return actions', async () => {
      const { client } = createClient({
        adoptionList: { data: [returnedAdoption], error: null },
        adoptionDetail: { data: returnedAdoption, error: null },
      });
      mockedUseLocalSearchParams.mockReturnValue({
        adoptionId: returnedAdoption.id,
      });
      const { screen } = await renderWithClient(
        <PersistedAdoptionDetailScreen />,
        client,
      );

      expect(await screen.findByText('Devuelta')).toBeTruthy();
      expect(screen.getByText('Maria Fernandez')).toBeTruthy();
      expect(screen.getByText('Mia')).toBeTruthy();
      expect(
        screen.queryByRole('button', { name: 'Registrar retorno' }),
      ).toBeNull();
      expect(
        screen.queryByRole('button', { name: 'Completar seguimiento' }),
      ).toBeNull();
    });

    it('maps RLS-hidden adoption details to no result in the repository', async () => {
      const { client, mocks } = createClient({
        adoptionDetail: { data: null, error: null },
      });

      await expect(getAdoptionById(client, adoption.id)).resolves.toBeNull();
      expect(mocks.adoptionDetailMaybeSingle).toHaveBeenCalledTimes(1);
    });

    it('queries the active adoptions list with embedded animal and candidate data', async () => {
      const { client, mocks } = createClient();

      await expect(listActiveAdoptions(client)).resolves.toEqual([
        {
          id: adoption.id,
          status: 'ACTIVE',
          adoptionDate: adoption.adoption_date,
          handoverNotes: adoption.handover_notes,
          animal: {
            id: adoption.animals.id,
            name: 'Luna',
            status: 'ADOPTED',
          },
          candidate: {
            id: adoption.candidates.id,
            status: 'SELECTED',
            person: {
              id: adoption.candidates.people.id,
              name: 'Andrea Perez',
            },
          },
        },
      ]);
      expect(mocks.adoptionListOrder).toHaveBeenCalledWith('adoption_date', {
        ascending: false,
      });
    });
  });

  describe('Complete follow-up flow', () => {
    beforeEach(() => {
      mockedUseLocalSearchParams.mockReturnValue({
        adoptionId: adoption.id,
        followupId: '00000000-0000-4000-8000-000000000113',
      });
    });

    it('keeps the submit disabled until an outcome is chosen and then sends the exact RPC arguments', async () => {
      const { client, mocks } = createClient();
      const queryClient = createTestQueryClient();
      const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
      const { screen } = await renderWithClient(
        <CompleteFollowupScreen />,
        client,
        queryClient,
      );

      const submit = await screen.findByRole('button', {
        name: 'Completar seguimiento',
      });
      expect(
        (submit.props as { accessibilityState?: { disabled?: boolean } })
          .accessibilityState?.disabled,
      ).toBe(true);
      expect(
        screen.getByText('Selecciona un resultado para habilitar la acción.'),
      ).toBeTruthy();

      const outcomeRadio = await screen.findByRole('radio', { name: 'Bueno' });
      await fireEvent.press(outcomeRadio);
      expect(
        (
          screen.getByRole('button', { name: 'Completar seguimiento' })
            .props as {
            accessibilityState?: { disabled?: boolean };
          }
        ).accessibilityState?.disabled,
      ).toBe(false);

      const notesInput = await screen.findByLabelText('Notas');
      await fireEvent.changeText(notesInput, '  Notas del seguimiento.  ');
      await fireEvent.press(
        screen.getByRole('button', { name: 'Completar seguimiento' }),
      );

      await waitFor(() => {
        expect(mocks.rpcFns.complete_followup).toHaveBeenCalledWith({
          p_followup_id: '00000000-0000-4000-8000-000000000113',
          p_outcome: 'GOOD',
          p_notes: 'Notas del seguimiento.',
        });
      });

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith({
          pathname: '/adoptions/[adoptionId]',
          params: { adoptionId: adoption.id },
        });
      });

      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: adoptionKeys.list(shelterId),
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: adoptionKeys.followups(shelterId, adoption.id),
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: adoptionKeys.detail(shelterId, adoption.id),
      });
    });

    it('prevents a second submit while the RPC is pending', async () => {
      let resolveRpc!: (value: unknown) => void;
      const pendingRpc = new Promise((resolve) => {
        resolveRpc = resolve;
      });
      const { client, mocks } = createClient({
        completeRpc: pendingRpc,
      });
      const { screen } = await renderWithClient(
        <CompleteFollowupScreen />,
        client,
      );

      const outcomeRadio = await screen.findByRole('radio', { name: 'Bueno' });
      await fireEvent.press(outcomeRadio);

      const submit = await screen.findByRole('button', {
        name: 'Completar seguimiento',
      });
      await fireEvent.press(submit);
      await fireEvent.press(submit);

      expect(mocks.rpcFns.complete_followup).toHaveBeenCalledTimes(1);
      resolveRpc({
        data: '00000000-0000-4000-8000-000000000113',
        error: null,
      });
    });

    it('keeps the form recoverable when the RPC fails and hides internal details', async () => {
      const { client, mocks } = createClient({
        completeRpc: {
          data: null,
          error: { message: 'SQL state P0001 leaked' },
        },
      });
      const { screen } = await renderWithClient(
        <CompleteFollowupScreen />,
        client,
      );

      const outcomeRadio = await screen.findByRole('radio', { name: 'Bueno' });
      await fireEvent.press(outcomeRadio);
      await fireEvent.press(
        await screen.findByRole('button', { name: 'Completar seguimiento' }),
      );

      expect(
        await screen.findByText(
          'No pudimos guardar el seguimiento. Inténtalo nuevamente.',
        ),
      ).toBeTruthy();
      expect(screen.queryByText(/SQL state P0001/)).toBeNull();

      await fireEvent.press(
        screen.getByRole('button', { name: 'Completar seguimiento' }),
      );
      expect(mocks.rpcFns.complete_followup).toHaveBeenCalledTimes(2);
    });
  });

  describe('Return adoption flow', () => {
    beforeEach(() => {
      mockedUseLocalSearchParams.mockReturnValue({ adoptionId: adoption.id });
    });

    it('requires a reason and explicit acknowledgement and sends the exact RPC arguments', async () => {
      const { client, mocks } = createClient();
      const queryClient = createTestQueryClient();
      const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
      const { screen } = await renderWithClient(
        <ReturnAdoptionScreen />,
        client,
        queryClient,
      );

      const submit = await screen.findByRole('button', {
        name: 'Registrar retorno',
      });
      expect(
        (submit.props as { accessibilityState?: { disabled?: boolean } })
          .accessibilityState?.disabled,
      ).toBe(true);

      await fireEvent.changeText(
        screen.getByLabelText('Motivo del retorno'),
        '  Cambio de hogar del adoptante.  ',
      );
      expect(
        (
          screen.getByRole('button', { name: 'Registrar retorno' }).props as {
            accessibilityState?: { disabled?: boolean };
          }
        ).accessibilityState?.disabled,
      ).toBe(true);
      expect(
        screen.getByText('Debes confirmar la advertencia antes de continuar.'),
      ).toBeTruthy();

      await fireEvent.press(
        screen.getByRole('checkbox', {
          name: 'Entiendo que esta acción no se puede deshacer.',
        }),
      );
      expect(
        (
          screen.getByRole('button', { name: 'Registrar retorno' }).props as {
            accessibilityState?: { disabled?: boolean };
          }
        ).accessibilityState?.disabled,
      ).toBe(false);

      await fireEvent.changeText(
        screen.getByLabelText('Notas'),
        'Se intentó sin éxito.',
      );
      await fireEvent.press(
        screen.getByRole('button', { name: 'Registrar retorno' }),
      );

      await waitFor(() => {
        expect(mocks.rpcFns.return_adoption).toHaveBeenCalledWith({
          p_adoption_id: adoption.id,
          p_reason: 'Cambio de hogar del adoptante.',
          p_notes: 'Se intentó sin éxito.',
        });
      });

      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: adoptionKeys.list(shelterId),
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: adoptionKeys.detail(shelterId, adoption.id),
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: adoptionKeys.followups(shelterId, adoption.id),
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: adoptionDecisionKeys.list(shelterId),
      });
    });

    it('prevents a second submit while the RPC is pending', async () => {
      let resolveRpc!: (value: unknown) => void;
      const pendingRpc = new Promise((resolve) => {
        resolveRpc = resolve;
      });
      const { client, mocks } = createClient({
        returnRpc: pendingRpc,
      });
      const { screen } = await renderWithClient(
        <ReturnAdoptionScreen />,
        client,
      );

      const reasonInput = await screen.findByLabelText('Motivo del retorno');
      await fireEvent.changeText(reasonInput, 'Cambio de hogar');
      await fireEvent.press(
        screen.getByRole('checkbox', {
          name: 'Entiendo que esta acción no se puede deshacer.',
        }),
      );

      const submit = await screen.findByRole('button', {
        name: 'Registrar retorno',
      });
      await fireEvent.press(submit);
      await fireEvent.press(submit);

      expect(mocks.rpcFns.return_adoption).toHaveBeenCalledTimes(1);
      resolveRpc({
        data: '00000000-0000-4000-8000-000000000101',
        error: null,
      });
    });

    it('keeps the form recoverable when the RPC fails', async () => {
      const { client, mocks } = createClient({
        returnRpc: { data: null, error: { message: 'leaked sql detail' } },
      });
      const { screen } = await renderWithClient(
        <ReturnAdoptionScreen />,
        client,
      );

      const reasonInput = await screen.findByLabelText('Motivo del retorno');
      await fireEvent.changeText(reasonInput, 'Cambio de hogar');
      await fireEvent.press(
        screen.getByRole('checkbox', {
          name: 'Entiendo que esta acción no se puede deshacer.',
        }),
      );
      await fireEvent.press(
        await screen.findByRole('button', { name: 'Registrar retorno' }),
      );

      expect(
        await screen.findByText(
          'No pudimos registrar el retorno. Inténtalo nuevamente.',
        ),
      ).toBeTruthy();
      expect(screen.queryByText(/leaked sql detail/)).toBeNull();
      await fireEvent.press(
        screen.getByRole('button', { name: 'Registrar retorno' }),
      );
      expect(mocks.rpcFns.return_adoption).toHaveBeenCalledTimes(2);
    });

    it('does not allow returning a non-active adoption', async () => {
      const { client } = createClient({
        adoptionDetail: { data: returnedAdoption, error: null },
      });
      mockedUseLocalSearchParams.mockReturnValue({
        adoptionId: returnedAdoption.id,
      });
      const { screen } = await renderWithClient(
        <ReturnAdoptionScreen />,
        client,
      );

      expect(await screen.findByText('Retorno registrado')).toBeTruthy();
      expect(
        screen.getByText(
          'La adopción fue devuelta y los pendientes fueron cancelados.',
        ),
      ).toBeTruthy();
      expect(
        screen.queryByRole('button', { name: 'Registrar retorno' }),
      ).toBeNull();
    });
  });

  describe('Persisted confirmation navigates with adoptionId', () => {
    it('routes to the adoption detail screen on success', async () => {
      const { client, mocks } = createClient();
      const queryClient = createTestQueryClient();
      const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
      mockedUseLocalSearchParams.mockReturnValue({
        candidateId: candidateRow.id,
      });
      const { screen } = await renderWithClient(
        <PersistedAdoptionConfirmationScreen />,
        client,
        queryClient,
      );

      await fireEvent.press(
        await screen.findByRole('button', { name: 'Confirmar adopción' }),
      );

      expect(mocks.rpcFns.confirm_adoption).toHaveBeenCalledWith(
        expect.objectContaining({
          p_candidate_id: candidateRow.id,
        }),
      );

      const viewAdoption = await screen.findByRole('button', {
        name: 'Ver adopción',
      });
      expect(viewAdoption).toBeTruthy();

      await fireEvent.press(viewAdoption);

      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/adoptions/[adoptionId]',
        params: { adoptionId: adoption.id },
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: adoptionDecisionKeys.list(shelterId),
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: adoptionDecisionKeys.detail(shelterId, candidateRow.id),
      });
    });
  });
});
