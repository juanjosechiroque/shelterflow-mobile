import {
  QueryClient,
  QueryClientProvider,
  onlineManager,
} from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  waitFor,
  type RenderResult,
} from '@testing-library/react-native';
import type { ReactElement } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useLocalSearchParams } from 'expo-router';

import {
  getAdoptionById,
  listFollowupsForAdoption,
  returnAdoption,
} from '@/features/adoptions/active-adoption-repository';
import { adoptionKeys } from '@/features/adoptions/active-adoption-queries';
import { adoptionDecisionKeys } from '@/features/adoptions/adoption-queries';
import { PersistedAdoptionDetailScreen } from '@/features/adoptions/persisted-adoption-detail-screen';
import { ReturnAdoptionScreen } from '@/features/adoptions/return-adoption-screen';
import {
  completeReevaluation,
  getAnimalById,
} from '@/features/animals/persisted-animal-repository';
import { animalKeys } from '@/features/animals/persisted-animal-queries';
import { PersistedAnimalDetailScreen } from '@/features/animals/persisted-animal-detail-screen';
import { PersistedReevaluationScreen } from '@/features/animals/persisted-reevaluation-screen';
import { createMockConnectivityAdapter } from '@/lib/connectivity';
import type { Database } from '@/lib/database.types';
import { ConnectivityProvider } from '@/providers/connectivity-provider';
import i18n from '@/i18n';

/**
 * End-to-end regression for the persisted non-happy path
 * (DOMAIN.md#complete-return-path): ACTIVE adoption + ADOPTED animal ->
 * return_adoption -> RETURNED adoption + REEVALUATION animal with pending
 * follow-ups cancelled -> complete_reevaluation -> READY or NOT_AVAILABLE,
 * with the previous candidate, adoption, follow-ups, and timeline still
 * visible.
 *
 * The fake Supabase client is stateful: it models the documented effects of
 * the two Phase 7 RPCs so the client contract can be traversed as one journey.
 * It is NOT a proof of Postgres atomicity or RLS; those are verified by
 * reviewing the migrations ([ADR-026]). This test only proves the client
 * reads back and renders the documented post-conditions, sends the exact RPC
 * payloads, and keeps a retryable form when an RPC fails.
 *
 * [ADR-026]: docs/decisions/026-remove-local-supabase-test-stack.md
 */

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
const { useAuth } = jest.requireMock('@/features/auth/auth-provider') as {
  useAuth: jest.Mock;
};

const shelterId = '00000000-0000-4000-8000-000000000001';
const animalId = '00000000-0000-4000-8000-000000000012';
const adoptionId = '00000000-0000-4000-8000-000000000092';
const candidateId = '00000000-0000-4000-8000-000000000054';
const personId = '00000000-0000-4000-8000-000000000034';
const completedFollowupId = '00000000-0000-4000-8000-000000000113';
const pendingFollowupId = '00000000-0000-4000-8000-000000000114';
const returnId = '00000000-0000-4000-8000-000000000101';

interface FollowupState {
  id: string;
  dueDate: string;
  status: string;
  outcome: string | null;
  notes: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
}

interface TimelineState {
  id: string;
  eventType: string;
  occurredAt: string;
  data: unknown;
}

interface JourneyState {
  adoption: {
    status: string;
    adoptionDate: string;
    handoverNotes: string | null;
  };
  animal: { status: string; updatedAt: string };
  candidate: { status: string };
  followups: FollowupState[];
  timeline: TimelineState[];
}

function createJourneyState(): JourneyState {
  return {
    adoption: {
      status: 'ACTIVE',
      adoptionDate: '2026-06-03',
      handoverNotes: 'Standard handover checklist.',
    },
    animal: { status: 'ADOPTED', updatedAt: '2026-06-03T12:00:00Z' },
    candidate: { status: 'SELECTED' },
    followups: [
      {
        id: completedFollowupId,
        dueDate: '2026-06-10',
        status: 'COMPLETED',
        outcome: 'EXCELLENT',
        notes: 'Mia is settling in well.',
        completedAt: '2026-06-10T12:00:00Z',
        cancelledAt: null,
        cancellationReason: null,
      },
      {
        id: pendingFollowupId,
        dueDate: '2026-07-03',
        status: 'PENDING',
        outcome: null,
        notes: null,
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null,
      },
    ],
    timeline: [
      {
        id: 'event-adoption-confirmed',
        eventType: 'ADOPTION_CONFIRMED',
        occurredAt: '2026-06-03T00:00:00Z',
        data: { person: 'Maria Fernandez' },
      },
      {
        id: 'event-followup-completed',
        eventType: 'FOLLOW_UP_COMPLETED',
        occurredAt: '2026-06-10T00:00:00Z',
        data: { outcome: 'EXCELLENT' },
      },
    ],
  };
}

type FakeResult = { data: unknown; error: unknown };

const RETURNED_AT = '2026-09-02T00:00:00Z';
const REEVALUATED_AT = '2026-09-05T00:00:00Z';

function applyReturnEffects(
  state: JourneyState,
  args: Record<string, unknown>,
): FakeResult {
  if (state.adoption.status !== 'ACTIVE') {
    return {
      data: null,
      error: { message: 'Adoption is not active' },
    };
  }
  if (state.animal.status !== 'ADOPTED') {
    return { data: null, error: { message: 'Animal is not adopted' } };
  }
  const reason = typeof args.p_reason === 'string' ? args.p_reason : '';
  if (reason.trim().length === 0) {
    return { data: null, error: { message: 'Return reason is required' } };
  }

  state.adoption.status = 'RETURNED';
  state.animal.status = 'REEVALUATION';
  state.followups.forEach((followup) => {
    if (followup.status === 'PENDING') {
      followup.status = 'CANCELLED';
      followup.cancelledAt = RETURNED_AT;
      followup.cancellationReason = 'ADOPTION_RETURNED';
    }
  });
  state.timeline.push(
    {
      id: 'event-adoption-returned',
      eventType: 'ADOPTION_RETURNED',
      occurredAt: RETURNED_AT,
      data: { person: 'Maria Fernandez' },
    },
    {
      id: 'event-reevaluation-required',
      eventType: 'REEVALUATION_REQUIRED',
      occurredAt: RETURNED_AT,
      data: null,
    },
  );

  return { data: returnId, error: null };
}

function applyReevaluationEffects(
  state: JourneyState,
  args: Record<string, unknown>,
): FakeResult {
  if (state.animal.status !== 'REEVALUATION') {
    return {
      data: null,
      error: { message: 'Animal is not in reevaluation' },
    };
  }
  const nextStatus = args.p_next_status;
  if (nextStatus !== 'READY' && nextStatus !== 'NOT_AVAILABLE') {
    return { data: null, error: { message: 'Invalid next status' } };
  }

  state.animal.status = nextStatus;
  state.timeline.push({
    id: `event-${nextStatus}`,
    eventType: nextStatus === 'READY' ? 'ANIMAL_READY' : 'ANIMAL_NOT_AVAILABLE',
    occurredAt: REEVALUATED_AT,
    data: null,
  });

  return { data: animalId, error: null };
}

interface JourneyClientControls {
  /** When set, the RPC resolves this canned result and applies no effects. */
  returnAdoption: FakeResult | null;
  completeReevaluation: FakeResult | null;
}

function createJourneyClient(state: JourneyState) {
  const controls: JourneyClientControls = {
    returnAdoption: null,
    completeReevaluation: null,
  };

  function rowsFor(table: string): Record<string, unknown>[] {
    switch (table) {
      case 'adoptions':
        return [
          {
            id: adoptionId,
            status: state.adoption.status,
            adoption_date: state.adoption.adoptionDate,
            handover_notes: state.adoption.handoverNotes,
            adoption_photo_path: null,
            animal_id: animalId,
            animals: {
              id: animalId,
              name: 'Mia',
              status: state.animal.status,
            },
            candidate_id: candidateId,
            candidates: {
              id: candidateId,
              status: state.candidate.status,
              person_id: personId,
              people: { id: personId, name: 'Maria Fernandez' },
            },
          },
        ];
      case 'followups':
        return state.followups.map((followup) => ({
          id: followup.id,
          adoption_id: adoptionId,
          due_date: followup.dueDate,
          status: followup.status,
          outcome: followup.outcome,
          notes: followup.notes,
          photo_path: null,
          completed_at: followup.completedAt,
          cancelled_at: followup.cancelledAt,
          cancellation_reason: followup.cancellationReason,
        }));
      case 'animals':
        return [
          {
            id: animalId,
            name: 'Mia',
            species: 'CAT',
            sex: 'FEMALE',
            size: 'SMALL',
            status: state.animal.status,
            approximate_age_months: 36,
            notes: null,
            primary_photo_path: null,
            updated_at: state.animal.updatedAt,
          },
        ];
      case 'timeline_events':
        return state.timeline.map((event) => ({
          id: event.id,
          animal_id: animalId,
          event_type: event.eventType,
          occurred_at: event.occurredAt,
          data: event.data,
        }));
      case 'candidates':
        return [
          {
            id: candidateId,
            shelter_id: shelterId,
            animal_id: animalId,
            person_id: personId,
            status: state.candidate.status,
            person: { id: personId, name: 'Maria Fernandez' },
            animal: { id: animalId, name: 'Mia' },
          },
        ];
      default:
        return [];
    }
  }

  function createChainable(rowsProvider: () => Record<string, unknown>[]) {
    const filters: Record<string, unknown> = {};
    const resolve = () => ({
      data: rowsProvider().filter((row) =>
        Object.entries(filters).every(
          ([column, value]) => row[column] === value,
        ),
      ),
      error: null,
    });
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        filters[column] = value;
        return builder;
      },
      is: (column: string, value: unknown) => {
        filters[column] = value;
        return builder;
      },
      order: () => Promise.resolve(resolve()),
      maybeSingle: () => {
        const { data } = resolve();
        const rows = data as Record<string, unknown>[];
        return Promise.resolve({ data: rows[0] ?? null, error: null });
      },
      then: (onFulfilled: (value: unknown) => unknown) =>
        onFulfilled(resolve()),
    };
    return builder;
  }

  const from = jest.fn((table: string) =>
    createChainable(() => rowsFor(table)),
  );

  const rpc = jest.fn((name: string, args: Record<string, unknown>) => {
    if (name === 'return_adoption') {
      if (controls.returnAdoption) {
        return Promise.resolve(controls.returnAdoption);
      }
      return Promise.resolve(applyReturnEffects(state, args));
    }
    if (name === 'complete_reevaluation') {
      if (controls.completeReevaluation) {
        return Promise.resolve(controls.completeReevaluation);
      }
      return Promise.resolve(applyReevaluationEffects(state, args));
    }
    return Promise.resolve({ data: null, error: null });
  });

  const client = { from, rpc } as unknown as SupabaseClient<Database>;

  return { client, controls, mocks: { from, rpc }, state };
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

async function renderWithConnectivity(
  ui: ReactElement,
  client: SupabaseClient<Database>,
  adapter: ReturnType<typeof createMockConnectivityAdapter>,
  queryClient: QueryClient,
): Promise<RenderResult> {
  useAuth.mockReturnValue({
    profile: { shelterId },
    supabase: client,
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConnectivityProvider adapter={adapter}>{ui}</ConnectivityProvider>
    </QueryClientProvider>,
  );
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

describe('Return → reevaluation persisted path', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('es');
    mockedUseLocalSearchParams.mockReturnValue({ adoptionId, animalId });
  });

  afterEach(() => {
    onlineManager.setOnline(true);
    while (trackedQueryClients.length > 0) {
      const queryClient = trackedQueryClients.pop();
      queryClient?.getMutationCache().clear();
      queryClient?.clear();
    }
  });

  async function registerReturn(screen: RenderResult) {
    await fireEvent.changeText(
      await screen.findByLabelText('Motivo del retorno'),
      'Cambio de hogar del adoptante.',
    );
    await fireEvent.press(
      screen.getByRole('checkbox', {
        name: 'Entiendo que esta acción no se puede deshacer.',
      }),
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Registrar retorno' }),
    );
  }

  describe('Complete persisted chain', () => {
    it('walks an ACTIVE adoption to a READY reevaluation and keeps prior history visible', async () => {
      const state = createJourneyState();
      const { client, mocks } = createJourneyClient(state);
      const queryClient = createTestQueryClient();

      // 1. The adoption starts ACTIVE with one completed and one pending follow-up.
      const adoptionDetail = await renderWithClient(
        <PersistedAdoptionDetailScreen />,
        client,
        queryClient,
      );
      expect(await adoptionDetail.screen.findByText('Activa')).toBeTruthy();
      expect(await adoptionDetail.screen.findByText('Pendiente')).toBeTruthy();
      expect(adoptionDetail.screen.getByText('Maria Fernandez')).toBeTruthy();
      expect(adoptionDetail.screen.getByText('Mia')).toBeTruthy();
      expect(adoptionDetail.screen.getByText(/Excelente/)).toBeTruthy();
      expect(
        adoptionDetail.screen.getByText(/Mia is settling in well/),
      ).toBeTruthy();

      // 2. Register the return through the persisted return screen.
      const returnScreen = await renderWithClient(
        <ReturnAdoptionScreen />,
        client,
        queryClient,
      );
      await registerReturn(returnScreen.screen);

      await waitFor(() => {
        expect(mocks.rpc).toHaveBeenCalledWith('return_adoption', {
          p_adoption_id: adoptionId,
          p_reason: 'Cambio de hogar del adoptante.',
          p_notes: null,
        });
      });
      expect(
        await returnScreen.screen.findByText('Retorno registrado'),
      ).toBeTruthy();

      // 3. The already-mounted adoption detail refetches to the documented
      //    post-return state: RETURNED, pending follow-up cancelled, completed
      //    follow-up and the candidate still visible.
      expect(await adoptionDetail.screen.findByText('Devuelta')).toBeTruthy();
      expect(
        await adoptionDetail.screen.findByText(
          'Cancelado por devolución de la adopción.',
        ),
      ).toBeTruthy();
      expect(adoptionDetail.screen.getByText('Maria Fernandez')).toBeTruthy();
      expect(adoptionDetail.screen.getByText('Mia')).toBeTruthy();
      expect(adoptionDetail.screen.getByText(/Excelente/)).toBeTruthy();
      expect(
        adoptionDetail.screen.getByText(/Mia is settling in well/),
      ).toBeTruthy();
      expect(adoptionDetail.screen.getByText('Cancelado')).toBeTruthy();
      expect(
        adoptionDetail.screen.queryByRole('button', {
          name: 'Registrar retorno',
        }),
      ).toBeNull();
      expect(
        adoptionDetail.screen.queryByRole('button', {
          name: 'Completar seguimiento',
        }),
      ).toBeNull();
      expect(
        adoptionDetail.screen.getByRole('button', {
          name: 'Completar reevaluación',
        }),
      ).toBeTruthy();

      // 4. The animal detail keeps the candidate and the whole timeline,
      //    including the two new return events.
      const animalDetail = await renderWithClient(
        <PersistedAnimalDetailScreen />,
        client,
        queryClient,
      );
      expect(
        await animalDetail.screen.findByText(
          'La adopción con Maria Fernandez fue devuelta.',
        ),
      ).toBeTruthy();
      expect(animalDetail.screen.getByText('Reevaluación')).toBeTruthy();
      expect(
        animalDetail.screen.getByText('Mia requiere una reevaluación humana.'),
      ).toBeTruthy();
      expect(
        animalDetail.screen.getByText(
          'Se confirmó la adopción con Maria Fernandez.',
        ),
      ).toBeTruthy();
      expect(
        animalDetail.screen.getByRole('button', {
          name: 'Abrir el proceso de Maria Fernandez',
        }),
      ).toBeTruthy();
      expect(
        animalDetail.screen.queryByRole('button', {
          name: 'Revisar seguimientos',
        }),
      ).toBeNull();

      // 5. Complete the reevaluation with READY.
      const reevaluationScreen = await renderWithClient(
        <PersistedReevaluationScreen />,
        client,
        queryClient,
      );
      await fireEvent.press(
        await reevaluationScreen.screen.findByRole('radio', {
          name: 'Listo para adopción',
        }),
      );
      await fireEvent.press(
        reevaluationScreen.screen.getByRole('button', {
          name: 'Completar reevaluación',
        }),
      );

      await waitFor(() => {
        expect(mocks.rpc).toHaveBeenCalledWith('complete_reevaluation', {
          p_animal_id: animalId,
          p_next_status: 'READY',
        });
      });
      expect(
        await reevaluationScreen.screen.findByText('Reevaluación completada'),
      ).toBeTruthy();

      // 6. The animal detail refetches to READY and still shows the full
      //    history, the candidate, and the new readiness event.
      expect(
        await animalDetail.screen.findByText('Mia quedó listo para adopción.'),
      ).toBeTruthy();
      expect(animalDetail.screen.getByText('Listo')).toBeTruthy();
      expect(
        animalDetail.screen.getByText(
          'La adopción con Maria Fernandez fue devuelta.',
        ),
      ).toBeTruthy();
      expect(
        animalDetail.screen.getByText(
          'Se confirmó la adopción con Maria Fernandez.',
        ),
      ).toBeTruthy();
      expect(
        animalDetail.screen.getByText(
          'Se completó un seguimiento de la adopción.',
        ),
      ).toBeTruthy();
      expect(
        animalDetail.screen.getByRole('button', {
          name: 'Abrir el proceso de Maria Fernandez',
        }),
      ).toBeTruthy();
      expect(
        animalDetail.screen.queryByRole('button', {
          name: 'Completar reevaluación',
        }),
      ).toBeNull();
    });

    it('walks the same return chain to NOT_AVAILABLE', async () => {
      const state = createJourneyState();
      const { client, mocks } = createJourneyClient(state);
      const queryClient = createTestQueryClient();

      const returnScreen = await renderWithClient(
        <ReturnAdoptionScreen />,
        client,
        queryClient,
      );
      await registerReturn(returnScreen.screen);
      await waitFor(() => {
        expect(mocks.rpc).toHaveBeenCalledWith(
          'return_adoption',
          expect.objectContaining({ p_adoption_id: adoptionId }),
        );
      });

      const reevaluationScreen = await renderWithClient(
        <PersistedReevaluationScreen />,
        client,
        queryClient,
      );
      await fireEvent.press(
        await reevaluationScreen.screen.findByRole('radio', {
          name: 'No disponible',
        }),
      );
      await fireEvent.press(
        reevaluationScreen.screen.getByRole('button', {
          name: 'Completar reevaluación',
        }),
      );

      await waitFor(() => {
        expect(mocks.rpc).toHaveBeenCalledWith('complete_reevaluation', {
          p_animal_id: animalId,
          p_next_status: 'NOT_AVAILABLE',
        });
      });
      expect(state.animal.status).toBe('NOT_AVAILABLE');

      const animalDetail = await renderWithClient(
        <PersistedAnimalDetailScreen />,
        client,
        queryClient,
      );
      expect(
        await animalDetail.screen.findByText(
          'La adopción con Maria Fernandez fue devuelta.',
        ),
      ).toBeTruthy();
      expect(animalDetail.screen.getByText('No disponible')).toBeTruthy();
      expect(
        animalDetail.screen.getByRole('button', {
          name: 'Abrir el proceso de Maria Fernandez',
        }),
      ).toBeTruthy();
    });
  });

  describe('Cross-screen freshness', () => {
    it('refreshes an already-mounted animal detail after a return', async () => {
      const state = createJourneyState();
      const { client } = createJourneyClient(state);
      const queryClient = createTestQueryClient();

      const animalDetail = await renderWithClient(
        <PersistedAnimalDetailScreen />,
        client,
        queryClient,
      );
      expect(await animalDetail.screen.findByText('Adoptado')).toBeTruthy();
      expect(
        animalDetail.screen.getByRole('button', {
          name: 'Revisar seguimientos',
        }),
      ).toBeTruthy();

      const returnScreen = await renderWithClient(
        <ReturnAdoptionScreen />,
        client,
        queryClient,
      );
      await registerReturn(returnScreen.screen);
      await waitFor(() => {
        expect(state.adoption.status).toBe('RETURNED');
      });

      // The mounted animal detail was not remounted; it must refetch because
      // the return invalidates the animal's read models.
      expect(await animalDetail.screen.findByText('Reevaluación')).toBeTruthy();
      expect(
        await animalDetail.screen.findByText(
          'La adopción con Maria Fernandez fue devuelta.',
        ),
      ).toBeTruthy();
      expect(
        animalDetail.screen.queryByRole('button', {
          name: 'Revisar seguimientos',
        }),
      ).toBeNull();
    });
  });

  describe('Recoverable failure states', () => {
    it('keeps the return form recoverable and the adoption ACTIVE when return_adoption fails, then succeeds on retry', async () => {
      const state = createJourneyState();
      const { client, controls, mocks } = createJourneyClient(state);
      const queryClient = createTestQueryClient();
      const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

      const adoptionDetail = await renderWithClient(
        <PersistedAdoptionDetailScreen />,
        client,
        queryClient,
      );
      await adoptionDetail.screen.findByText('Activa');
      invalidateQueries.mockClear();

      controls.returnAdoption = {
        data: null,
        error: { message: 'network down' },
      };

      const returnScreen = await renderWithClient(
        <ReturnAdoptionScreen />,
        client,
        queryClient,
      );
      await registerReturn(returnScreen.screen);

      expect(
        await returnScreen.screen.findByText(
          'No pudimos registrar el retorno. Inténtalo nuevamente.',
        ),
      ).toBeTruthy();

      // No half state: the client did not invalidate or mutate anything, and
      // the adoption detail still shows the ACTIVE adoption.
      expect(invalidateQueries).not.toHaveBeenCalled();
      expect(state.adoption.status).toBe('ACTIVE');
      expect(state.animal.status).toBe('ADOPTED');
      expect(
        state.followups.some((followup) => followup.status === 'CANCELLED'),
      ).toBe(false);
      expect(adoptionDetail.screen.getByText('Activa')).toBeTruthy();
      expect(
        adoptionDetail.screen.getByRole('button', {
          name: 'Registrar retorno',
        }),
      ).toBeTruthy();

      // The reason and the acknowledgement survived, so retrying is possible.
      expect(
        returnScreen.screen.getByLabelText('Motivo del retorno').props.value,
      ).toBe('Cambio de hogar del adoptante.');
      expect(
        (
          returnScreen.screen.getByRole('button', { name: 'Registrar retorno' })
            .props as { accessibilityState?: { disabled?: boolean } }
        ).accessibilityState?.disabled,
      ).toBe(false);

      controls.returnAdoption = null;
      await fireEvent.press(
        returnScreen.screen.getByRole('button', { name: 'Registrar retorno' }),
      );
      await waitFor(() => {
        expect(mocks.rpc).toHaveBeenCalledTimes(2);
      });
      await waitFor(() => {
        expect(state.adoption.status).toBe('RETURNED');
      });
      expect(
        await returnScreen.screen.findByText('Retorno registrado'),
      ).toBeTruthy();
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: adoptionKeys.list(shelterId),
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: adoptionKeys.followups(shelterId, adoptionId),
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: animalKeys.all(shelterId),
      });
    });

    it('keeps the reevaluation decision recoverable and the animal in REEVALUATION when complete_reevaluation fails, then succeeds on retry', async () => {
      const state = createJourneyState();
      const { client, controls, mocks } = createJourneyClient(state);

      // Reach the return path first, then fail the reevaluation.
      const returnScreen = await renderWithClient(
        <ReturnAdoptionScreen />,
        client,
      );
      await registerReturn(returnScreen.screen);
      await waitFor(() => {
        expect(state.animal.status).toBe('REEVALUATION');
      });

      controls.completeReevaluation = {
        data: null,
        error: { message: 'network down' },
      };

      const queryClient = createTestQueryClient();
      const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
      const reevaluationScreen = await renderWithClient(
        <PersistedReevaluationScreen />,
        client,
        queryClient,
      );
      await fireEvent.press(
        await reevaluationScreen.screen.findByRole('radio', {
          name: 'Listo para adopción',
        }),
      );
      await fireEvent.press(
        reevaluationScreen.screen.getByRole('button', {
          name: 'Completar reevaluación',
        }),
      );

      expect(
        await reevaluationScreen.screen.findByText(
          'No pudimos guardar la reevaluación. Inténtalo nuevamente.',
        ),
      ).toBeTruthy();
      expect(invalidateQueries).not.toHaveBeenCalled();
      expect(state.animal.status).toBe('REEVALUATION');
      expect(
        reevaluationScreen.screen.getByRole('radio', {
          name: 'Listo para adopción',
        }).props.accessibilityState?.selected,
      ).toBe(true);

      controls.completeReevaluation = null;
      await fireEvent.press(
        reevaluationScreen.screen.getByRole('button', {
          name: 'Completar reevaluación',
        }),
      );
      await waitFor(() => {
        expect(mocks.rpc).toHaveBeenCalledWith('complete_reevaluation', {
          p_animal_id: animalId,
          p_next_status: 'READY',
        });
      });
      await waitFor(() => {
        expect(state.animal.status).toBe('READY');
      });
      expect(
        await reevaluationScreen.screen.findByText('Reevaluación completada'),
      ).toBeTruthy();
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: animalKeys.timeline(shelterId, animalId),
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: animalKeys.list(shelterId),
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: adoptionDecisionKeys.list(shelterId),
      });
    });
  });

  describe('Offline recovery', () => {
    it('shows the cached-offline banner and defers a return until connectivity returns', async () => {
      const state = createJourneyState();
      const { client, mocks } = createJourneyClient(state);
      const queryClient = createTestQueryClient();
      const adapter = createMockConnectivityAdapter('online');

      const screen = await renderWithConnectivity(
        <ReturnAdoptionScreen />,
        client,
        adapter,
        queryClient,
      );
      await screen.findByLabelText('Motivo del retorno');

      await act(async () => {
        adapter.setStatus('offline');
      });
      expect(
        await screen.findByText(
          'Estás sin conexión. Se muestran datos guardados, no el estado confirmado del servidor.',
        ),
      ).toBeTruthy();

      await fireEvent.changeText(
        screen.getByLabelText('Motivo del retorno'),
        'Cambio de hogar',
      );
      await fireEvent.press(
        screen.getByRole('checkbox', {
          name: 'Entiendo que esta acción no se puede deshacer.',
        }),
      );
      await fireEvent.press(
        screen.getByRole('button', { name: 'Registrar retorno' }),
      );

      // The mutation is paused, not lost, and no RPC is sent while offline.
      expect(mocks.rpc).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Motivo del retorno').props.value).toBe(
        'Cambio de hogar',
      );

      await act(async () => {
        adapter.setStatus('online');
      });
      await waitFor(() => {
        expect(mocks.rpc).toHaveBeenCalledWith('return_adoption', {
          p_adoption_id: adoptionId,
          p_reason: 'Cambio de hogar',
          p_notes: null,
        });
      });
      expect(await screen.findByText('Retorno registrado')).toBeTruthy();
    });

    it('shows the cached-offline banner and defers a reevaluation until connectivity returns', async () => {
      const state = createJourneyState();
      state.adoption.status = 'RETURNED';
      state.animal.status = 'REEVALUATION';
      const { client, mocks } = createJourneyClient(state);
      const queryClient = createTestQueryClient();
      const adapter = createMockConnectivityAdapter('online');

      const screen = await renderWithConnectivity(
        <PersistedReevaluationScreen />,
        client,
        adapter,
        queryClient,
      );
      await screen.findByRole('radio', { name: 'Listo para adopción' });

      await act(async () => {
        adapter.setStatus('offline');
      });
      expect(
        await screen.findByText(
          'Estás sin conexión. Se muestran datos guardados, no el estado confirmado del servidor.',
        ),
      ).toBeTruthy();

      await fireEvent.press(
        screen.getByRole('radio', { name: 'Listo para adopción' }),
      );
      await fireEvent.press(
        screen.getByRole('button', { name: 'Completar reevaluación' }),
      );

      expect(mocks.rpc).not.toHaveBeenCalled();
      expect(
        screen.getByRole('radio', { name: 'Listo para adopción' }).props
          .accessibilityState?.selected,
      ).toBe(true);

      await act(async () => {
        adapter.setStatus('online');
      });
      await waitFor(() => {
        expect(mocks.rpc).toHaveBeenCalledWith('complete_reevaluation', {
          p_animal_id: animalId,
          p_next_status: 'READY',
        });
      });
      expect(await screen.findByText('Reevaluación completada')).toBeTruthy();
    });
  });

  describe('Repository contract', () => {
    it('builds the return_adoption payload and returns the new return id', async () => {
      const state = createJourneyState();
      const { client, mocks } = createJourneyClient(state);

      const id = await returnAdoption(client, {
        adoptionId,
        reason: '  Cambio de hogar  ',
        notes: null,
      });

      expect(id).toBe(returnId);
      expect(mocks.rpc).toHaveBeenCalledWith('return_adoption', {
        p_adoption_id: adoptionId,
        p_reason: '  Cambio de hogar  ',
        p_notes: null,
      });
      expect(state.adoption.status).toBe('RETURNED');
      expect(state.animal.status).toBe('REEVALUATION');
    });

    it('propagates the return_adoption RPC error and the missing-result error', async () => {
      const state = createJourneyState();
      const { client, controls } = createJourneyClient(state);

      controls.returnAdoption = { data: null, error: { message: 'boom' } };
      await expect(
        returnAdoption(client, { adoptionId, reason: 'x', notes: null }),
      ).rejects.toEqual({ message: 'boom' });

      controls.returnAdoption = { data: null, error: null };
      await expect(
        returnAdoption(client, { adoptionId, reason: 'x', notes: null }),
      ).rejects.toThrow('supabase_rpc_result_missing');
    });

    it('builds the complete_reevaluation payload and propagates its errors', async () => {
      const state = createJourneyState();
      const { client, controls, mocks } = createJourneyClient(state);

      // The animal must be in REEVALUATION before the RPC is accepted.
      state.animal.status = 'REEVALUATION';
      const id = await completeReevaluation(client, {
        animalId,
        nextStatus: 'NOT_AVAILABLE',
      });

      expect(id).toBe(animalId);
      expect(mocks.rpc).toHaveBeenCalledWith('complete_reevaluation', {
        p_animal_id: animalId,
        p_next_status: 'NOT_AVAILABLE',
      });
      expect(state.animal.status).toBe('NOT_AVAILABLE');

      controls.completeReevaluation = {
        data: null,
        error: { message: 'boom' },
      };
      await expect(
        completeReevaluation(client, { animalId, nextStatus: 'READY' }),
      ).rejects.toEqual({ message: 'boom' });

      controls.completeReevaluation = { data: null, error: null };
      await expect(
        completeReevaluation(client, { animalId, nextStatus: 'READY' }),
      ).rejects.toThrow('supabase_rpc_result_missing');
    });

    it('reads the returned adoption, its follow-ups, and the animal history after the chain', async () => {
      const state = createJourneyState();
      const { client } = createJourneyClient(state);
      await returnAdoption(client, {
        adoptionId,
        reason: 'Cambio de hogar',
        notes: null,
      });

      const adoption = await getAdoptionById(client, adoptionId);
      expect(adoption?.status).toBe('RETURNED');
      expect(adoption?.candidate.person.name).toBe('Maria Fernandez');
      expect(adoption?.animal.status).toBe('REEVALUATION');

      const followups = await listFollowupsForAdoption(client, adoptionId);
      expect(followups.map((followup) => followup.status)).toEqual([
        'COMPLETED',
        'CANCELLED',
      ]);

      const animal = await getAnimalById(client, animalId);
      expect(animal?.status).toBe('REEVALUATION');
    });
  });
});
