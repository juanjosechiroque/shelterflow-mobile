import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render } from '@testing-library/react-native';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import i18n from '@/i18n';
import { fixedClock } from '@/features/prototype-flow/clock';
import { createMockPrototypeRepository } from '@/features/prototype-flow/mock-repository';
import {
  PrototypeFlowProvider,
  usePrototypeFlow,
} from '@/features/prototype-flow/prototype-flow-provider';

function Harness() {
  const { state, commands, reset } = usePrototypeFlow();
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!sent) {
      setSent(true);
      commands.recordEvaluation('luna-andrea', {
        candidateId: 'luna-andrea',
        overallFit: 'STRONG',
        positiveFactors: ['Buena disposición.'],
        concerns: [],
        recommendation: 'CONTINUE',
      });
    }
  }, [commands, sent]);

  const andrea = state.candidates.find((c) => c.id === 'luna-andrea');

  return (
    <>
      <Text>{andrea?.status}</Text>
      <Text testID="reset" onPress={reset}>
        reset
      </Text>
    </>
  );
}

describe('PrototypeFlowProvider reset', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await i18n.changeLanguage('es');
  });

  it('restores a fresh initial snapshot on reset', async () => {
    const screen = await render(
      <PrototypeFlowProvider
        repository={createMockPrototypeRepository()}
        clock={fixedClock('2026-09-01')}
      >
        <Harness />
      </PrototypeFlowProvider>,
    );

    await act(async () => {
      expect(screen.getByText('EVALUATED')).toBeTruthy();
    });

    await act(async () => {
      screen.getByTestId('reset').props.onPress();
    });

    expect(screen.getByText('NEEDS_EVALUATION')).toBeTruthy();
  });
});
