import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import { AdoptionConfirmationScreen } from '@/features/adoptions/adoption-confirmation-screen';
import { AnimalDetailScreen } from '@/features/animals/animal-detail-screen';
import { CandidateScreen } from '@/features/candidates/candidate-screen';
import { EvaluationScreen } from '@/features/evaluations/evaluation-screen';
import { FollowUpsScreen } from '@/features/followups/followups-screen';
import { MeetingsScreen } from '@/features/meetings/meetings-screen';
import i18n from '@/i18n';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: { Screen: () => null },
  router: { back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

const mockedUseLocalSearchParams = jest.mocked(useLocalSearchParams);

describe('Candidate and adoption flows', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await i18n.changeLanguage('es');
  });

  it('opens a candidate from the animal detail row', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ animalId: 'luna' });
    const screen = await render(<AnimalDetailScreen />);

    expect(screen.getByText('Ana Pérez')).toBeTruthy();

    mockedUseLocalSearchParams.mockReturnValue({ candidateId: 'luna-ana' });
    const candidate = await render(<CandidateScreen />);

    expect(candidate.getByText('Ana Pérez')).toBeTruthy();
    expect(candidate.getByText('Decisión pendiente')).toBeTruthy();
    expect(candidate.getByText('Ver evaluación')).toBeTruthy();
    expect(candidate.getByText('Ver reuniones')).toBeTruthy();
    expect(candidate.getByText('Confirmar adopción')).toBeTruthy();
  });

  it('shows a candidate without a confirmation action when not in decision', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ candidateId: 'luna-carlos' });
    const screen = await render(<CandidateScreen />);

    expect(screen.getByText('Carlos Ruiz')).toBeTruthy();
    expect(screen.getByText('Reunión programada')).toBeTruthy();
    expect(screen.queryByText('Confirmar adopción')).toBeNull();
  });

  it('shows an evaluation for a candidate', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ candidateId: 'luna-ana' });
    const screen = await render(<EvaluationScreen />);

    expect(screen.getByText('Luna')).toBeTruthy();
    expect(screen.getByText('Ana Pérez')).toBeTruthy();
    expect(screen.getByText('Fuerte')).toBeTruthy();
    expect(screen.getByText('Continuar')).toBeTruthy();
  });

  it('shows an empty evaluation state for an unevaluated candidate', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ candidateId: 'luna-marta' });
    const screen = await render(<EvaluationScreen />);

    expect(screen.getByText('Sin evaluación')).toBeTruthy();
  });

  it('lists meetings for a candidate', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ candidateId: 'luna-ana' });
    const screen = await render(<MeetingsScreen />);

    expect(screen.getByText('Conocimiento')).toBeTruthy();
    expect(screen.getByText('Visita al hogar')).toBeTruthy();
    expect(screen.getByText(/Muy buena coincidencia/)).toBeTruthy();
  });

  it('confirms an adoption for a candidate in decision status', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ candidateId: 'luna-ana' });
    const screen = await render(<AdoptionConfirmationScreen />);

    expect(screen.getByText('Luna')).toBeTruthy();
    expect(screen.getByText('Ana Pérez')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Confirmar adopción' }));

    expect(await screen.findByText('Adopción confirmada')).toBeTruthy();
  });

  it('shows follow-ups for an adopted animal', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ animalId: 'mia' });
    const screen = await render(<FollowUpsScreen />);

    expect(screen.getByText('Mia')).toBeTruthy();
    expect(screen.getByText('Pendiente')).toBeTruthy();
    expect(screen.getAllByText('Completado').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Excelente/)).toBeTruthy();
  });

  it('shows a no-follow-ups state for a non-adopted animal', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ animalId: 'toby' });
    const screen = await render(<FollowUpsScreen />);

    expect(screen.getByText('Sin adopción activa')).toBeTruthy();
  });
});
