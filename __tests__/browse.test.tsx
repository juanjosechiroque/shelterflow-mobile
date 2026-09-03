import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { useLocalSearchParams } from 'expo-router';

import {
  filterAnimals,
  getApproximateAgeLabel,
  hasActiveCandidate,
  hasAdvancedCandidate,
} from '@/features/animals/presenters';
import { PrototypeFlowProvider } from '@/features/prototype-flow/prototype-flow-provider';
import { createMockPrototypeRepository } from '@/features/prototype-flow/mock-repository';
import { selectCandidatesForAnimal } from '@/features/prototype-flow/prototype-flow-selectors';
import { TodayScreen } from '@/features/today/today-screen';
import i18n from '@/i18n';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: { Screen: () => null },
  router: { back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ profile: null, supabase: null }),
}));

const mockedUseLocalSearchParams = jest.mocked(useLocalSearchParams);

async function renderWithProvider(ui: ReactElement): Promise<RenderResult> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <PrototypeFlowProvider>{ui}</PrototypeFlowProvider>
    </QueryClientProvider>,
  );
}

describe('Shelter browse prototype', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await i18n.changeLanguage('es');
    mockedUseLocalSearchParams.mockReturnValue({ animalId: 'luna' });
  });

  it('shows actionable work with fictitious shelter data', async () => {
    const screen = await renderWithProvider(<TodayScreen />);

    expect(screen.getByText('Huellitas Rescue')).toBeTruthy();
    expect(screen.getByText('1 candidato necesita evaluación')).toBeTruthy();
    expect(screen.getByText('1 reunión programada para hoy')).toBeTruthy();
    expect(screen.getByText('1 seguimiento pendiente')).toBeTruthy();
    expect(screen.getByText('1 animal necesita reevaluación')).toBeTruthy();
    expect(screen.getByText(/candidatos de Luna/)).toBeTruthy();
  });

  it('keeps animal filters aligned with domain states', () => {
    const protoState = createMockPrototypeRepository().getSnapshot();
    expect(
      filterAnimals(protoState.animals, 'IN_PROCESS').map(({ id }) => id),
    ).toEqual(['luna']);
    expect(
      filterAnimals(protoState.animals, 'REEVALUATION').map(({ id }) => id),
    ).toEqual(['bruno']);
    expect(filterAnimals(protoState.animals, 'ALL')).toHaveLength(
      protoState.animals.length,
    );
  });

  it('localizes approximate age in English', async () => {
    await i18n.changeLanguage('en');
    expect(getApproximateAgeLabel(i18n.t, 72)).toBe('Approximately 6 years');
    expect(getApproximateAgeLabel(i18n.t, 10)).toBe('Approximately 10 months');
    expect(getApproximateAgeLabel(i18n.t, null)).toBe('Age unknown');
  });

  it('keeps initial prototype candidates aligned with animal availability', () => {
    const protoState = createMockPrototypeRepository().getSnapshot();
    const lunaCandidates = selectCandidatesForAnimal(protoState, 'luna');
    const nalaCandidates = selectCandidatesForAnimal(protoState, 'nala');
    const tobyCandidates = selectCandidatesForAnimal(protoState, 'toby');
    const miaCandidates = selectCandidatesForAnimal(protoState, 'mia');
    const brunoCandidates = selectCandidatesForAnimal(protoState, 'bruno');

    expect(hasAdvancedCandidate(lunaCandidates)).toBe(true);
    expect(hasActiveCandidate(nalaCandidates)).toBe(true);
    expect(hasAdvancedCandidate(nalaCandidates)).toBe(false);
    expect(hasActiveCandidate(tobyCandidates)).toBe(false);
    expect(miaCandidates.map(({ status }) => status)).toEqual(['SELECTED']);
    expect(hasActiveCandidate(brunoCandidates)).toBe(false);
  });
});
