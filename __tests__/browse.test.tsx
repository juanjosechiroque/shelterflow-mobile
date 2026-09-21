import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import { AnimalDetailScreen } from '@/features/animals/animal-detail-screen';
import { AnimalsScreen } from '@/features/animals/animals-screen';
import { mockAnimals } from '@/features/animals/mock-animals';
import { getCandidatesForAnimal } from '@/features/animals/mock-candidates';
import {
  filterAnimals,
  getApproximateAgeLabel,
  hasActiveCandidate,
  hasAdvancedCandidate,
} from '@/features/animals/presenters';
import { TodayScreen } from '@/features/today/today-screen';
import i18n from '@/i18n';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: { Screen: () => null },
  router: { back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

const mockedUseLocalSearchParams = jest.mocked(useLocalSearchParams);

describe('Shelter browse prototype', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await i18n.changeLanguage('es');
    mockedUseLocalSearchParams.mockReturnValue({ animalId: 'luna' });
  });

  it('shows actionable work with fictitious shelter data', async () => {
    const screen = await render(<TodayScreen />);

    expect(screen.getByText('Huellitas Rescue')).toBeTruthy();
    expect(screen.getByText('2 candidatos necesitan evaluación')).toBeTruthy();
    expect(screen.getByText('3 seguimientos pendientes')).toBeTruthy();
    expect(screen.getByText(/candidatos de Luna/)).toBeTruthy();
  });

  it('filters the animal list by operational status', async () => {
    const screen = await render(<AnimalsScreen />);

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
    const screen = await render(<AnimalsScreen />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Reevaluation' }));

    expect(screen.getByText('1 animal')).toBeTruthy();
    expect(screen.getByText('Bruno')).toBeTruthy();
    expect(getApproximateAgeLabel(i18n.t, 72)).toBe('Approximately 6 years');
  });

  it('shows candidates and timeline on the animal detail screen', async () => {
    const screen = await render(<AnimalDetailScreen />);

    expect(screen.getByText('Ana Pérez')).toBeTruthy();
    expect(screen.getByText('Decisión pendiente')).toBeTruthy();
    expect(screen.getByText('Carlos Ruiz')).toBeTruthy();
    expect(screen.getByText('Reunión programada')).toBeTruthy();
    expect(
      screen.getByText('Luna pasó a un proceso de adopción activo.'),
    ).toBeTruthy();
  });

  it('shows an empty candidate state when the animal has none', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ animalId: 'toby' });
    const screen = await render(<AnimalDetailScreen />);

    expect(
      screen.getByText(
        'Todavía no hay candidatos registrados para este animal.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Toby quedó listo para adopción.')).toBeTruthy();
  });

  it('keeps mock animal filters aligned with domain states', () => {
    expect(
      filterAnimals(mockAnimals, 'IN_PROCESS').map(({ id }) => id),
    ).toEqual(['luna']);
    expect(
      filterAnimals(mockAnimals, 'REEVALUATION').map(({ id }) => id),
    ).toEqual(['bruno']);
  });

  it('keeps mock candidates aligned with animal availability', () => {
    const lunaCandidates = getCandidatesForAnimal('luna');
    const nalaCandidates = getCandidatesForAnimal('nala');
    const tobyCandidates = getCandidatesForAnimal('toby');
    const miaCandidates = getCandidatesForAnimal('mia');
    const brunoCandidates = getCandidatesForAnimal('bruno');

    expect(hasAdvancedCandidate(lunaCandidates)).toBe(true);
    expect(hasActiveCandidate(nalaCandidates)).toBe(true);
    expect(hasAdvancedCandidate(nalaCandidates)).toBe(false);
    expect(hasActiveCandidate(tobyCandidates)).toBe(false);
    expect(miaCandidates.map(({ status }) => status)).toEqual(['SELECTED']);
    expect(hasActiveCandidate(brunoCandidates)).toBe(false);
  });
});
