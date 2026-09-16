import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  waitFor,
  type RenderResult,
} from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReactElement } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useLocalSearchParams } from 'expo-router';

import {
  evaluationDraftKey,
  evaluationDraftStore,
} from '@/features/evaluations/evaluation-draft';
import { EvaluationScreen } from '@/features/evaluations/evaluation-screen';
import type { Database } from '@/lib/database.types';
import i18n from '@/i18n';

jest.mock('expo-router', () => {
  const React = require('react');
  const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
  return {
    Link: ({ children }: { children: ReactElement }) =>
      React.cloneElement(children, {
        onPress: () => router.push({}),
      }),
    Stack: { Screen: () => null },
    router,
    useLocalSearchParams: jest.fn(),
  };
});

jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: jest.fn(),
}));

const { useAuth } = jest.requireMock('@/features/auth/auth-provider') as {
  useAuth: jest.Mock;
};
const mockedUseLocalSearchParams = jest.mocked(useLocalSearchParams);

const shelterId = '00000000-0000-4000-8000-000000000001';
const candidateId = '00000000-0000-4000-8000-000000000051';

function createClient(rpcResult: {
  data: unknown;
  error: unknown;
}): SupabaseClient<Database> {
  const from = jest.fn(() => {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn(() => builder);
    builder.eq = jest.fn(() => builder);
    builder.maybeSingle = jest.fn(() =>
      Promise.resolve({ data: null, error: null }),
    );
    return builder;
  });
  const rpc = jest.fn(() =>
    rpcResult.error ? Promise.resolve(rpcResult) : new Promise(() => undefined),
  );
  return { from, rpc } as unknown as SupabaseClient<Database>;
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

async function renderScreen(
  ui: ReactElement,
  client: SupabaseClient<Database>,
): Promise<RenderResult> {
  useAuth.mockReturnValue({
    supabase: client,
    profile: { shelterId },
  });
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      {ui}
    </QueryClientProvider>,
  );
}

const draft = {
  overallFit: 'POSSIBLE' as const,
  recommendation: 'MORE_INFORMATION' as const,
  positiveFactors: ['Casa estable'],
  concerns: [],
  notes: 'Borrador pendiente',
};

describe('EvaluationScreen draft persistence', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await i18n.changeLanguage('es');
    mockedUseLocalSearchParams.mockReturnValue({ candidateId });
  });

  afterEach(() => {
    while (trackedQueryClients.length > 0) {
      trackedQueryClients.pop()?.clear();
    }
  });

  it('restores a saved draft and keeps it when the submit fails', async () => {
    await evaluationDraftStore.save(evaluationDraftKey(candidateId), draft);
    const client = createClient({
      data: null,
      error: { message: 'network down' },
    });

    const screen = await renderScreen(<EvaluationScreen />, client);

    expect(await screen.findByDisplayValue('Borrador pendiente')).toBeTruthy();
    expect(screen.getByText('Restauramos un borrador guardado.')).toBeTruthy();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Guardar evaluación' }),
    );

    expect(
      await screen.findByText(
        'No pudimos guardar la evaluación. Tus respuestas se conservan para reintentar.',
      ),
    ).toBeTruthy();
    expect(
      await evaluationDraftStore.load(evaluationDraftKey(candidateId)),
    ).toEqual(draft);
  });

  it('discards a restored draft and clears local storage', async () => {
    await evaluationDraftStore.save(evaluationDraftKey(candidateId), draft);
    const client = createClient({ data: null, error: { message: 'down' } });

    const screen = await renderScreen(<EvaluationScreen />, client);

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Descartar borrador' }),
    );

    await waitFor(async () => {
      expect(
        await evaluationDraftStore.load(evaluationDraftKey(candidateId)),
      ).toBeNull();
    });
    expect(screen.queryByText('Restauramos un borrador guardado.')).toBeNull();
  });

  it('prevents a double submit while a request is in flight', async () => {
    await evaluationDraftStore.save(evaluationDraftKey(candidateId), draft);
    const client = createClient({ data: null, error: null });

    const screen = await renderScreen(<EvaluationScreen />, client);
    const submit = await screen.findByRole('button', {
      name: 'Guardar evaluación',
    });

    await fireEvent.press(submit);
    await fireEvent.press(submit);

    const { rpc } = client as unknown as { rpc: jest.Mock };
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
