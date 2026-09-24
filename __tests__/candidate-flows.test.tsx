import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fireEvent,
  render,
  waitFor,
  within,
  type RenderResult,
} from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { colors } from '@/constants/theme';
import { AdoptionConfirmationScreen } from '@/features/adoptions/adoption-confirmation-screen';
import { AnimalDetailScreen } from '@/features/animals/animal-detail-screen';
import { AnimalsScreen } from '@/features/animals/animals-screen';
import { CandidateScreen } from '@/features/candidates/candidate-screen';
import { EvaluationScreen } from '@/features/evaluations/evaluation-screen';
import { FollowUpsScreen } from '@/features/followups/followups-screen';
import { MeetingsScreen } from '@/features/meetings/meetings-screen';
import { fixedClock } from '@/features/prototype-flow/clock';
import { createMockPrototypeRepository } from '@/features/prototype-flow/mock-repository';
import {
  PrototypeFlowProvider,
  usePrototypeFlow,
  type PrototypeFlowCommands,
} from '@/features/prototype-flow/prototype-flow-provider';
import {
  selectAnimalById,
  selectCandidatesForAnimal,
  selectFollowUpsForAnimal,
} from '@/features/prototype-flow/prototype-flow-selectors';
import type { PrototypeFlowState } from '@/features/prototype-flow/types';
import i18n from '@/i18n';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: { Screen: () => null },
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

const mockedUseLocalSearchParams = jest.mocked(useLocalSearchParams);

async function renderWithProvider(ui: ReactElement): Promise<RenderResult> {
  return render(
    <PrototypeFlowProvider
      repository={createMockPrototypeRepository()}
      clock={fixedClock('2026-09-01')}
    >
      {ui}
    </PrototypeFlowProvider>,
  );
}

function DispatchBeforeRender({
  setup,
  children,
}: {
  setup: (commands: PrototypeFlowCommands) => void;
  children: ReactElement;
}) {
  const { commands } = usePrototypeFlow();
  useEffect(() => {
    setup(commands);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <>{children}</>;
}

async function candidateActions(
  screen: RenderResult,
  actionLabel: string,
): Promise<void> {
  await fireEvent.press(
    screen.getByRole('button', { name: new RegExp(actionLabel) }),
  );
}

describe('Candidate and adoption flows', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await i18n.changeLanguage('es');
  });

  it('renders the Luna candidates on the animal detail screen', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ animalId: 'luna' });
    const screen = await renderWithProvider(<AnimalDetailScreen />);

    expect(screen.getByText('Andrea Pérez')).toBeTruthy();
    expect(screen.getByText('Carlos Ruiz')).toBeTruthy();
    expect(screen.getByText('Sofía Vargas')).toBeTruthy();
    expect(screen.queryByText('Datos de demostración')).toBeNull();
  });

  it('opens an unevaluated candidate and shows the journey actions', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ candidateId: 'luna-andrea' });
    const screen = await renderWithProvider(<CandidateScreen />);

    expect(screen.getByText('Andrea Pérez')).toBeTruthy();
    expect(screen.getByText('Necesita evaluación')).toBeTruthy();
    expect(screen.getByText('Registrar evaluación')).toBeTruthy();
    expect(screen.getByText('Ver reuniones')).toBeTruthy();
    expect(screen.queryByText('Confirmar adopción')).toBeNull();
  });

  it('presents "Registrar evaluación" as a primary action and "Ver reuniones" as secondary', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ candidateId: 'luna-andrea' });
    const screen = await renderWithProvider(<CandidateScreen />);

    const registerButton = screen.getByRole('button', {
      name: 'Registrar evaluación',
    });
    const registerStyle = StyleSheet.flatten(registerButton.props.style);
    expect(registerStyle.backgroundColor).toBe(colors.primary);
    expect(registerStyle.borderColor).toBe(colors.primary);
    const registerLabel = within(registerButton).getByText(
      'Registrar evaluación',
    );
    const registerLabelStyle = StyleSheet.flatten(registerLabel.props.style);
    expect(registerLabelStyle.color).toBe(colors.surface);

    const meetingsLink = screen.getByRole('button', { name: 'Ver reuniones' });
    const meetingsStyle = StyleSheet.flatten(meetingsLink.props.style);
    expect(meetingsStyle.backgroundColor).toBe(colors.surface);
    expect(meetingsStyle.borderColor).toBe(colors.border);
    const meetingsLabel = within(meetingsLink).getByText('Ver reuniones');
    const meetingsLabelStyle = StyleSheet.flatten(meetingsLabel.props.style);
    expect(meetingsLabelStyle.color).toBe(colors.text);

    await fireEvent.press(registerButton);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/animals/candidate/[candidateId]/evaluation',
      params: { candidateId: 'luna-andrea' },
    });
  });

  it('continues an evaluated candidate to contact pending', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ candidateId: 'luna-sofia' });
    const screen = await renderWithProvider(<CandidateScreen />);

    expect(screen.getByText('Evaluado')).toBeTruthy();

    await candidateActions(screen, 'Continuar contacto');

    await waitFor(() => {
      expect(screen.getByText('Contacto pendiente')).toBeTruthy();
    });
  });

  it('marks a scheduled-meeting candidate for decision', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ candidateId: 'luna-carlos' });
    const screen = await renderWithProvider(
      <DispatchBeforeRender
        setup={(commands) =>
          commands.completeMeeting('luna-carlos-meeting', 'GOOD')
        }
      >
        <CandidateScreen />
      </DispatchBeforeRender>,
    );

    expect(screen.getByText('Reunión programada')).toBeTruthy();
    expect(screen.queryByText('Confirmar adopción')).toBeNull();

    await candidateActions(screen, 'Marcar para decisión');

    await waitFor(() => {
      expect(screen.getByText('Decisión pendiente')).toBeTruthy();
      expect(screen.getByText('Confirmar adopción')).toBeTruthy();
    });
  });

  it('records an evaluation and shows the summary', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ candidateId: 'luna-andrea' });
    const screen = await renderWithProvider(<EvaluationScreen />);

    expect(screen.getByText('Registrar evaluación')).toBeTruthy();
    expect(screen.getByText('Guardar evaluación')).toBeTruthy();

    await fireEvent.changeText(
      screen.getByPlaceholderText('Ej. Experiencia con perros'),
      'Buena disposición',
    );
    await fireEvent.press(screen.getAllByRole('button', { name: '+' })[0]);
    await candidateActions(screen, 'Guardar evaluación');

    expect(await screen.findByText('Fuerte')).toBeTruthy();
    expect(screen.getByText('Continuar')).toBeTruthy();
    expect(screen.getByText('Resumen')).toBeTruthy();
  });

  it('shows an evaluation summary for an evaluated candidate', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ candidateId: 'luna-sofia' });
    const screen = await renderWithProvider(<EvaluationScreen />);

    expect(screen.getByText('Posible')).toBeTruthy();
    expect(screen.getByText('Más información')).toBeTruthy();
    expect(screen.queryByText('Guardar evaluación')).toBeNull();
  });

  it('lists a scheduled meeting for a candidate', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ candidateId: 'luna-carlos' });
    const screen = await renderWithProvider(<MeetingsScreen />);

    expect(screen.getAllByText('Conocimiento').length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText('Programada').length).toBeGreaterThanOrEqual(1);
  });

  it('confirms an adoption for a candidate in decision status', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ candidateId: 'luna-carlos' });
    const screen = await renderWithProvider(
      <DispatchBeforeRender
        setup={(commands) => {
          commands.completeMeeting('luna-carlos-meeting', 'GOOD');
          commands.markDecisionPending('luna-carlos');
        }}
      >
        <AdoptionConfirmationScreen />
      </DispatchBeforeRender>,
    );

    const confirmButton = await screen.findByRole('button', {
      name: 'Confirmar adopción',
    });
    await fireEvent.press(confirmButton);

    expect(await screen.findByText('Adopción confirmada')).toBeTruthy();
  });

  it('does not allow confirming adoption before decision status', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ candidateId: 'luna-andrea' });
    const screen = await renderWithProvider(<AdoptionConfirmationScreen />);

    expect(screen.getByText('Luna')).toBeTruthy();
    expect(screen.getByText('Andrea Pérez')).toBeTruthy();
  });

  it('shows follow-ups for an adopted animal', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ animalId: 'mia' });
    const screen = await renderWithProvider(<FollowUpsScreen />);

    expect(screen.getByText('Mia')).toBeTruthy();
    expect(screen.getByText('Pendiente')).toBeTruthy();
    expect(screen.getAllByText('Completado').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Excelente/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows a no-follow-ups state for a non-adopted animal', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ animalId: 'toby' });
    const screen = await renderWithProvider(<FollowUpsScreen />);

    expect(screen.getByText('Sin adopción activa')).toBeTruthy();
  });

  it('reflects a completed Andrea adoption across the shared state', async () => {
    let sharedState: PrototypeFlowState | null = null;

    function AndreaJourney() {
      const { state, commands } = usePrototypeFlow();

      useEffect(() => {
        commands.recordEvaluation('luna-andrea', {
          candidateId: 'luna-andrea',
          overallFit: 'STRONG',
          positiveFactors: ['Buena disposición.'],
          concerns: [],
          recommendation: 'CONTINUE',
        });
        commands.continueContact('luna-andrea');
        commands.scheduleMeeting('luna-andrea', 'HOME_VISIT', '2026-09-01');
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      const andreaMeeting = state.meetings.find(
        (m) => m.candidateId === 'luna-andrea' && m.status === 'SCHEDULED',
      );
      const andrea = state.candidates.find((c) => c.id === 'luna-andrea');

      useEffect(() => {
        if (andreaMeeting && andrea?.status === 'MEETING_SCHEDULED') {
          commands.completeMeeting(andreaMeeting.id, 'GOOD');
          commands.markDecisionPending('luna-andrea');
          commands.confirmAdoption('luna-andrea', '2026-09-05');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [andreaMeeting, andrea]);

      sharedState = state;
      return <AnimalsScreen />;
    }

    const screen = await renderWithProvider(<AndreaJourney />);

    await waitFor(() => {
      expect(selectAnimalById(sharedState!, 'luna')?.status).toBe('ADOPTED');
    });

    expect(
      screen.getAllByText('Adoptado', { exact: false }).length,
    ).toBeGreaterThan(0);
    expect(
      selectCandidatesForAnimal(sharedState!, 'luna')
        .filter((c) => c.id !== 'luna-andrea')
        .every((c) => c.status === 'NOT_SELECTED'),
    ).toBe(true);
    const followUps = selectFollowUpsForAnimal(sharedState!, 'luna');
    expect(followUps.length).toBe(3);
    expect(new Set(followUps.map(({ id }) => id)).size).toBe(3);
  });
});
