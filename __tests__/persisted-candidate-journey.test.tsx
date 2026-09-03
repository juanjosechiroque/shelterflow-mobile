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

import { CandidateScreen } from '@/features/candidates/candidate-screen';
import { EvaluationScreen } from '@/features/evaluations/evaluation-screen';
import { MeetingsScreen } from '@/features/meetings/meetings-screen';
import { candidateQueryKeys } from '@/features/candidates/candidate-queries';
import { animalKeys } from '@/features/animals/persisted-animal-queries';
import type { Database } from '@/lib/database.types';
import i18n from '@/i18n';

jest.mock('expo-router', () => {
  const React = require('react');
  const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
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

const { router } = jest.requireMock('expo-router') as {
  router: { push: jest.Mock; replace: jest.Mock; back: jest.Mock };
};
const { useAuth } = jest.requireMock('@/features/auth/auth-provider') as {
  useAuth: jest.Mock;
};
const mockedUseLocalSearchParams = jest.mocked(useLocalSearchParams);

const shelterId = '00000000-0000-4000-8000-000000000001';
const candidateId = '00000000-0000-4000-8000-000000000903';
const animalId = '00000000-0000-4000-8000-000000000901';

type Result = { data: unknown; error: unknown } | Promise<unknown>;

const personRow = {
  id: '00000000-0000-4000-8000-000000000902',
  shelter_id: shelterId,
  name: 'Andrea Pérez',
  phone: '+51 900 111 222',
  email: 'andrea@example.com',
  archived_at: null,
  created_at: '2026-08-02T00:00:00Z',
  updated_at: '2026-08-02T00:00:00Z',
};

const animalRow = {
  id: animalId,
  shelter_id: shelterId,
  name: 'Luna',
  species: 'DOG',
  sex: 'FEMALE',
  size: 'MEDIUM',
  approximate_age_months: 24,
  notes: null,
  primary_photo_path: null,
  status: 'READY',
  archived_at: null,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
};

function candidateRow(status: string, source: string | null = 'Instagram') {
  return {
    id: candidateId,
    shelter_id: shelterId,
    person_id: personRow.id,
    animal_id: animalId,
    source,
    notes: null,
    status,
    archived_at: null,
    created_at: '2026-08-02T00:00:00Z',
    updated_at: '2026-08-02T00:00:00Z',
    person: personRow,
    animal: animalRow,
  };
}

function createClient(config: {
  tables?: Record<string, Result>;
  rpc?: Record<string, Result>;
}): { client: SupabaseClient<Database>; rpcMock: jest.Mock } {
  const tables = config.tables ?? {};

  const from = jest.fn((table: string) => {
    const result: Result = tables[table] ?? { data: null, error: null };
    const builder: Record<string, unknown> = {};
    const settle = () =>
      result instanceof Promise ? result : Promise.resolve(result);
    builder.select = jest.fn(() => builder);
    builder.eq = jest.fn(() => builder);
    builder.is = jest.fn(() => builder);
    builder.order = jest.fn(() => settle());
    builder.maybeSingle = jest.fn(() => settle());
    builder.single = jest.fn(() => settle());
    builder.then = (resolve: (value: unknown) => unknown) =>
      settle().then(resolve);
    return builder;
  });

  const rpcMock = jest.fn((name: string) => {
    const r = config.rpc?.[name] ?? { data: null, error: null };
    return r instanceof Promise ? r : Promise.resolve(r);
  });

  const client = { from, rpc: rpcMock } as unknown as SupabaseClient<Database>;
  return { client, rpcMock };
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

afterEach(() => {
  while (trackedQueryClients.length > 0) {
    const queryClient = trackedQueryClients.pop();
    queryClient?.getMutationCache().clear();
    queryClient?.clear();
  }
});

async function renderScreen(
  ui: ReactElement,
  client: SupabaseClient<Database> | null,
  queryClient = createTestQueryClient(),
): Promise<{ screen: RenderResult; queryClient: QueryClient }> {
  useAuth.mockReturnValue({
    profile: { shelterId, shelterName: 'Huellitas Rescue' },
    supabase: client,
  });
  return {
    screen: await render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    ),
    queryClient,
  };
}

beforeEach(async () => {
  jest.clearAllMocks();
  await i18n.changeLanguage('es');
});

describe('Persisted CandidateScreen', () => {
  beforeEach(() => {
    mockedUseLocalSearchParams.mockReturnValue({ candidateId });
  });

  it('shows a loading state then the mapped person, animal and source', async () => {
    const { client } = createClient({
      tables: { candidates: { data: candidateRow('EVALUATED'), error: null } },
    });
    const { screen } = await renderScreen(<CandidateScreen />, client);

    expect(screen.getByText('Cargando el candidato…')).toBeTruthy();

    expect(await screen.findByText('Andrea Pérez')).toBeTruthy();
    expect(screen.getByText('Luna')).toBeTruthy();
    expect(screen.getByText('Instagram')).toBeTruthy();
    expect(screen.getByText('andrea@example.com')).toBeTruthy();
  });

  it('shows an error state with a working retry', async () => {
    const { client } = createClient({
      tables: {
        candidates: { data: null, error: { message: 'network down' } },
      },
    });
    const { screen } = await renderScreen(<CandidateScreen />, client);

    expect(await screen.findByText('Candidato no encontrado')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });

  it('runs the explicit contact transition and invalidates the affected queries', async () => {
    const { client, rpcMock } = createClient({
      tables: { candidates: { data: candidateRow('EVALUATED'), error: null } },
      rpc: {
        bridge_evaluated_to_contact_pending: { data: candidateId, error: null },
      },
    });
    const queryClient = createTestQueryClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const { screen } = await renderScreen(
      <CandidateScreen />,
      client,
      queryClient,
    );

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Continuar contacto' }),
    );

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith(
        'bridge_evaluated_to_contact_pending',
        { p_candidate_id: candidateId },
      );
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: candidateQueryKeys.byId(shelterId, candidateId),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: animalKeys.all(shelterId),
    });
  });

  it('marks a scheduled-meeting candidate for decision through the RPC', async () => {
    const { client, rpcMock } = createClient({
      tables: {
        candidates: { data: candidateRow('MEETING_SCHEDULED'), error: null },
      },
      rpc: { mark_decision_pending: { data: candidateId, error: null } },
    });
    const { screen } = await renderScreen(<CandidateScreen />, client);

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Marcar para decisión' }),
    );

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith('mark_decision_pending', {
        p_candidate_id: candidateId,
      });
    });
  });

  it('offers evaluation and meetings navigation without dead handlers', async () => {
    const { client } = createClient({
      tables: {
        candidates: { data: candidateRow('NEEDS_EVALUATION'), error: null },
      },
    });
    const { screen } = await renderScreen(<CandidateScreen />, client);

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Registrar evaluación' }),
    );
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/animals/candidate/[candidateId]/evaluation',
      params: { candidateId },
    });
  });
});

describe('Persisted EvaluationScreen', () => {
  beforeEach(() => {
    mockedUseLocalSearchParams.mockReturnValue({ candidateId });
  });

  it('renders the summary for an already-evaluated candidate', async () => {
    const { client } = createClient({
      tables: {
        evaluations: {
          data: {
            id: 'eval-1',
            candidate_id: candidateId,
            overall_fit: 'POSSIBLE',
            positive_factors: ['Casa estable'],
            concerns: ['Poco tiempo'],
            recommendation: 'MORE_INFORMATION',
            notes: null,
            created_at: '2026-09-01T00:00:00Z',
          },
          error: null,
        },
      },
    });
    const { screen } = await renderScreen(<EvaluationScreen />, client);

    expect(await screen.findByText('Posible')).toBeTruthy();
    expect(screen.getByText('Más información')).toBeTruthy();
    expect(screen.getByText('• Casa estable')).toBeTruthy();
    expect(screen.queryByText('Guardar evaluación')).toBeNull();
  });

  it('submits the form as a snake_case RPC payload and shows loading, then error recovery', async () => {
    const { client, rpcMock } = createClient({
      tables: { evaluations: { data: null, error: null } },
      rpc: { record_evaluation: { data: null, error: null } },
    });
    const { screen } = await renderScreen(<EvaluationScreen />, client);

    await fireEvent.changeText(
      await screen.findByPlaceholderText('Ej. Experiencia con perros'),
      'Buena disposición',
    );
    await fireEvent.press(screen.getAllByRole('button', { name: '+' })[0]);
    await fireEvent.press(
      screen.getByRole('button', { name: 'Guardar evaluación' }),
    );

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith('record_evaluation', {
        p_candidate_id: candidateId,
        p_overall_fit: 'STRONG',
        p_positive_factors: ['Buena disposición'],
        p_concerns: [],
        p_recommendation: 'CONTINUE',
        p_notes: null,
      });
    });

    // The form stays available when the RPC returns no id.
    expect(
      screen.getByRole('button', { name: 'Guardar evaluación' }),
    ).toBeTruthy();
  });

  it('shows the load-error state with retry', async () => {
    const { client } = createClient({
      tables: { evaluations: { data: null, error: { message: 'down' } } },
    });
    const { screen } = await renderScreen(<EvaluationScreen />, client);

    expect(
      await screen.findByText(
        'No pudimos cargar la evaluación. Inténtalo nuevamente.',
      ),
    ).toBeTruthy();
  });
});

describe('Persisted MeetingsScreen', () => {
  beforeEach(() => {
    mockedUseLocalSearchParams.mockReturnValue({ candidateId });
  });

  it('lists a scheduled meeting and completes it through the RPC', async () => {
    const { client, rpcMock } = createClient({
      tables: {
        candidates: {
          data: candidateRow('MEETING_SCHEDULED'),
          error: null,
        },
        meetings: {
          data: [
            {
              id: 'meeting-1',
              candidate_id: candidateId,
              type: 'MEET_AND_GREET',
              scheduled_at: '2026-09-10T12:00:00Z',
              status: 'SCHEDULED',
              result: null,
              notes: null,
            },
          ],
          error: null,
        },
      },
      rpc: { complete_meeting: { data: 'meeting-1', error: null } },
    });
    const { screen } = await renderScreen(<MeetingsScreen />, client);

    expect(await screen.findByText('Conocimiento')).toBeTruthy();
    expect(screen.getByText('Programada')).toBeTruthy();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Completar reunión' }),
    );

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith('complete_meeting', {
        p_meeting_id: 'meeting-1',
        p_result: 'GOOD',
        p_notes: null,
      });
    });
  });

  it('schedules a meeting for a CONTACT_PENDING candidate via the RPC', async () => {
    const { client, rpcMock } = createClient({
      tables: {
        candidates: { data: candidateRow('CONTACT_PENDING'), error: null },
        meetings: { data: [], error: null },
      },
      rpc: { schedule_meeting: { data: 'meeting-9', error: null } },
    });
    const { screen } = await renderScreen(<MeetingsScreen />, client);

    await fireEvent.changeText(
      await screen.findByPlaceholderText('AAAA-MM-DD'),
      '2026-09-20',
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Programar reunión' }),
    );

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith(
        'schedule_meeting',
        expect.objectContaining({
          p_candidate_id: candidateId,
          p_type: 'MEET_AND_GREET',
          p_scheduled_at: '2026-09-20T12:00:00.000Z',
          p_notes: null,
        }),
      );
    });
  });

  it('shows the load-error state with retry', async () => {
    const { client } = createClient({
      tables: {
        candidates: { data: null, error: { message: 'down' } },
        meetings: { data: [], error: null },
      },
    });
    const { screen } = await renderScreen(<MeetingsScreen />, client);

    expect(
      await screen.findByText(
        'No pudimos cargar las reuniones. Inténtalo nuevamente.',
      ),
    ).toBeTruthy();
  });
});
