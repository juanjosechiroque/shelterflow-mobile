import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fireEvent,
  render,
  type RenderResult,
} from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { AnimalDetailScreen } from '@/features/animals/animal-detail-screen';
import { AnimalsScreen } from '@/features/animals/animals-screen';
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

const mockedUseLocalSearchParams = jest.mocked(useLocalSearchParams);

async function renderWithProvider(ui: ReactElement): Promise<RenderResult> {
  return render(<PrototypeFlowProvider>{ui}</PrototypeFlowProvider>);
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

  it('filters the animal list by operational status', async () => {
    const screen = await renderWithProvider(<AnimalsScreen />);

    expect(screen.getByText('5 animales')).toBeTruthy();
    expect(screen.getByText('Luna')).toBeTruthy();

    await fireEvent.press(screen.getByRole('tab', { name: 'Listos' }));

    expect(screen.getByText('2 animales')).toBeTruthy();
    expect(screen.getByText('Toby')).toBeTruthy();
    expect(screen.getByText('Nala')).toBeTruthy();
    expect(screen.queryByText('Luna')).toBeNull();
  });

  it('uses localized pluralization and labels in English', async () => {
    await i18n.changeLanguage('en');
    const screen = await renderWithProvider(<AnimalsScreen />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Reevaluation' }));

    expect(screen.getByText('1 animal')).toBeTruthy();
    expect(screen.getByText('Bruno')).toBeTruthy();
    expect(getApproximateAgeLabel(i18n.t, 72)).toBe('Approximately 6 years');
  });

  it('shows candidates and timeline on the animal detail screen', async () => {
    const screen = await renderWithProvider(<AnimalDetailScreen />);

    expect(screen.getByText('Andrea Pérez')).toBeTruthy();
    expect(screen.getByText('Necesita evaluación')).toBeTruthy();
    expect(screen.getByText('Carlos Ruiz')).toBeTruthy();
    expect(screen.getByText('Reunión programada')).toBeTruthy();
    expect(screen.getByText('Sofía Vargas')).toBeTruthy();
    expect(screen.getByText('Evaluado')).toBeTruthy();
    expect(
      screen.getByText('Luna pasó a un proceso de adopción activo.'),
    ).toBeTruthy();
  });

  it('shows an empty candidate state when the animal has none', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ animalId: 'toby' });
    const screen = await renderWithProvider(<AnimalDetailScreen />);

    expect(
      screen.getByText(
        'Todavía no hay candidatos registrados para este animal.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Toby quedó listo para adopción.')).toBeTruthy();
  });

  it('keeps animal filters aligned with domain states', () => {
    const protoState = createMockPrototypeRepository().getSnapshot();
    expect(
      filterAnimals(protoState.animals, 'IN_PROCESS').map(({ id }) => id),
    ).toEqual(['luna']);
    expect(
      filterAnimals(protoState.animals, 'REEVALUATION').map(({ id }) => id),
    ).toEqual(['bruno']);
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
