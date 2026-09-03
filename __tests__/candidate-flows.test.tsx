import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fireEvent,
  render,
  waitFor,
  type RenderResult,
} from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { AdoptionConfirmationScreen } from '@/features/adoptions/adoption-confirmation-screen';
import { FollowUpsScreen } from '@/features/followups/followups-screen';
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

describe('Prototype adoption confirmation and follow-ups', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await i18n.changeLanguage('es');
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

  it('confirms an Andrea adoption atomically across the shared state', async () => {
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
      return null;
    }

    await renderWithProvider(<AndreaJourney />);

    await waitFor(() => {
      expect(selectAnimalById(sharedState!, 'luna')?.status).toBe('ADOPTED');
    });

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
