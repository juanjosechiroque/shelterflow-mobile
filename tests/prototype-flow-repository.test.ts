import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/i18n';
import { fixedClock, systemClock } from '@/features/prototype-flow/clock';
import { createMockPrototypeRepository } from '@/features/prototype-flow/mock-repository';
import { createPrototypeFlowReducer } from '@/features/prototype-flow/prototype-flow-reducer';
import { selectAnimalById } from '@/features/prototype-flow/prototype-flow-selectors';
import type { PrototypeFlowState } from '@/features/prototype-flow/types';

describe('mock prototype repository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await i18n.changeLanguage('es');
  });

  it('returns a snapshot that is independent between loads', () => {
    const repository = createMockPrototypeRepository();
    const first = repository.getSnapshot();
    const second = repository.getSnapshot();

    expect(first).not.toBe(second);
    expect(first.animals).not.toBe(second.animals);
    expect(first.candidates).not.toBe(second.candidates);
    expect(first.evaluations).not.toBe(second.evaluations);
    expect(first.meetings).not.toBe(second.meetings);
    expect(first.adoptions).not.toBe(second.adoptions);
    expect(first.followUps).not.toBe(second.followUps);
    expect(first.timelineEvents).not.toBe(second.timelineEvents);
  });

  it('deep-clones nested candidates, persons, and evaluation arrays', () => {
    const repository = createMockPrototypeRepository();
    const snapshot = repository.getSnapshot();
    const otherSnapshot = repository.getSnapshot();

    const candidate = snapshot.candidates.find((c) => c.id === 'luna-andrea')!;
    const otherCandidate = otherSnapshot.candidates.find(
      (c) => c.id === 'luna-andrea',
    )!;
    expect(candidate.person).not.toBe(otherCandidate.person);

    const evaluation = snapshot.evaluations.find(
      (e) => e.candidateId === 'luna-sofia',
    )!;
    const otherEvaluation = otherSnapshot.evaluations.find(
      (e) => e.candidateId === 'luna-sofia',
    )!;
    const originalLength = otherEvaluation.positiveFactors.length;
    evaluation.positiveFactors.push('mutated');
    expect(otherEvaluation.positiveFactors).not.toContain('mutated');
    expect(otherEvaluation.positiveFactors.length).toBe(originalLength);
  });

  it('returns new objects on every getSnapshot call', () => {
    const repository = createMockPrototypeRepository();
    const first = repository.getSnapshot();
    const second = repository.getSnapshot();

    expect(first.shelter).not.toBe(second.shelter);
    expect(first.animals[0]).not.toBe(second.animals[0]);
    expect(first.candidates[0].person).not.toBe(second.candidates[0].person);
    expect(first.evaluations[0].positiveFactors).not.toBe(
      second.evaluations[0].positiveFactors,
    );
  });

  it('runs deterministic transitions with a fixed clock', () => {
    const repository = createMockPrototypeRepository();
    const reducerA = createPrototypeFlowReducer(fixedClock('2026-09-01'));
    const reducerB = createPrototypeFlowReducer(fixedClock('2026-09-01'));

    let stateA = repository.getSnapshot();
    let stateB = repository.getSnapshot();

    const actions: Parameters<
      ReturnType<typeof createPrototypeFlowReducer>
    >[1][] = [
      {
        type: 'RECORD_EVALUATION',
        candidateId: 'luna-andrea',
        evaluation: {
          candidateId: 'luna-andrea',
          overallFit: 'STRONG',
          positiveFactors: ['Buena disposición.'],
          concerns: [],
          recommendation: 'CONTINUE',
        },
      },
      {
        type: 'CONTINUE_CANDIDATE',
        candidateId: 'luna-andrea',
        toStatus: 'CONTACT_PENDING',
      },
      {
        type: 'SCHEDULE_MEETING',
        candidateId: 'luna-andrea',
        meetingType: 'HOME_VISIT',
        scheduledOn: '2026-09-10',
      },
    ];

    for (const action of actions) {
      stateA = reducerA(stateA, action);
      stateB = reducerB(stateB, action);
    }

    expect(stateA.evaluations).toEqual(stateB.evaluations);
    expect(stateA.meetings).toEqual(stateB.meetings);
    expect(stateA.timelineEvents).toEqual(stateB.timelineEvents);
    expect(stateA.candidates).toEqual(stateB.candidates);
    expect(selectAnimalById(stateA, 'luna')?.status).toBe('IN_PROCESS');
    expect(selectAnimalById(stateB, 'luna')?.status).toBe('IN_PROCESS');
  });

  it('produces deterministic occurredOn from the system clock shape', () => {
    const clock = fixedClock('2026-09-02');
    const repository = createMockPrototypeRepository();
    const reducer = createPrototypeFlowReducer(clock);
    const next = reducer(repository.getSnapshot(), {
      type: 'COMPLETE_MEETING',
      meetingId: 'luna-carlos-meeting',
      result: 'GOOD',
    });

    const decision = createPrototypeFlowReducer(clock)(next, {
      type: 'MARK_DECISION_PENDING',
      candidateId: 'luna-carlos',
    });

    const event = decision.timelineEvents.find(
      (e) => e.type === 'DECISION_PENDING' && e.personName === 'Carlos Ruiz',
    );
    expect(event?.occurredOn).toBe('2026-09-02');
  });

  it('keeps a fixed clock independent of the system clock', () => {
    expect(fixedClock('2026-01-02').todayISO()).toBe('2026-01-02');
    expect(typeof systemClock.todayISO()).toBe('string');
  });
});
