import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/i18n';
import { fixedClock } from '@/features/prototype-flow/clock';
import { createMockPrototypeRepository } from '@/features/prototype-flow/mock-repository';
import { createPrototypeFlowReducer } from '@/features/prototype-flow/prototype-flow-reducer';
import {
  selectCandidateById,
  selectAnimalById,
  selectActiveAdoptionForAnimal,
  selectFollowUpsForAnimal,
} from '@/features/prototype-flow/prototype-flow-selectors';
import type { PrototypeFlowState } from '@/features/prototype-flow/types';

describe('prototype flow reducer', () => {
  let state: PrototypeFlowState;
  const reducer = createPrototypeFlowReducer(fixedClock('2026-09-01'));

  beforeEach(async () => {
    await AsyncStorage.clear();
    await i18n.changeLanguage('es');
    state = createMockPrototypeRepository().getSnapshot();
  });

  it('rejects recording an evaluation for a candidate that already has a status', () => {
    const next = reducer(state, {
      type: 'RECORD_EVALUATION',
      candidateId: 'luna-carlos', // MEETING_SCHEDULED
      evaluation: {
        candidateId: 'luna-carlos',
        overallFit: 'STRONG',
        positiveFactors: ['x'],
        concerns: [],
        recommendation: 'CONTINUE',
      },
    });

    expect(selectCandidateById(next, 'luna-carlos')?.status).toBe(
      'MEETING_SCHEDULED',
    );
    expect(next.evaluations.length).toBe(state.evaluations.length);
  });

  it('records an evaluation and moves a NEEDS_EVALUATION candidate to EVALUATED', () => {
    const next = reducer(state, {
      type: 'RECORD_EVALUATION',
      candidateId: 'luna-andrea',
      evaluation: {
        candidateId: 'luna-andrea',
        overallFit: 'STRONG',
        positiveFactors: ['Buena disposición.'],
        concerns: ['Confirmar horarios.'],
        recommendation: 'CONTINUE',
      },
    });

    expect(selectCandidateById(next, 'luna-andrea')?.status).toBe('EVALUATED');
    expect(next.evaluations.length).toBe(state.evaluations.length + 1);
    const evaluation = next.evaluations.find(
      (e) => e.candidateId === 'luna-andrea',
    );
    expect(evaluation?.overallFit).toBe('STRONG');
    expect(evaluation?.recommendation).toBe('CONTINUE');
    expect(
      next.timelineEvents.some((event) => event.type === 'EVALUATION_RECORDED'),
    ).toBe(true);
  });

  it('continues an EVALUATED candidate to CONTACT_PENDING and moves the animal to IN_PROCESS', () => {
    const next = reducer(state, {
      type: 'CONTINUE_CANDIDATE',
      candidateId: 'luna-sofia',
      toStatus: 'CONTACT_PENDING',
    });

    expect(selectCandidateById(next, 'luna-sofia')?.status).toBe(
      'CONTACT_PENDING',
    );
    expect(selectAnimalById(next, 'luna')?.status).toBe('IN_PROCESS');
    expect(
      next.timelineEvents.some((event) => event.type === 'ANIMAL_IN_PROCESS'),
    ).toBe(true);
  });

  it('rejects continuing a candidate through an invalid transition', () => {
    const next = reducer(state, {
      type: 'CONTINUE_CANDIDATE',
      candidateId: 'luna-andrea', // NEEDS_EVALUATION only allows... none
      toStatus: 'MEETING_SCHEDULED',
    });

    expect(selectCandidateById(next, 'luna-andrea')?.status).toBe(
      'NEEDS_EVALUATION',
    );
  });

  it('schedules a meeting for a CONTACT_PENDING candidate', () => {
    const contact = reducer(state, {
      type: 'CONTINUE_CANDIDATE',
      candidateId: 'luna-sofia',
      toStatus: 'CONTACT_PENDING',
    });

    const next = reducer(contact, {
      type: 'SCHEDULE_MEETING',
      candidateId: 'luna-sofia',
      meetingType: 'MEET_AND_GREET',
      scheduledOn: '2026-09-01',
      notes: 'Llamar antes.',
    });

    expect(selectCandidateById(next, 'luna-sofia')?.status).toBe(
      'MEETING_SCHEDULED',
    );
    const meeting = next.meetings.find(
      (m) => m.candidateId === 'luna-sofia' && m.status === 'SCHEDULED',
    );
    expect(meeting).toBeDefined();
    expect(meeting?.notes).toBe('Llamar antes.');
  });

  it('rejects scheduling a meeting for a DECISION_PENDING candidate', () => {
    const decision = reducer(
      reducer(state, {
        type: 'COMPLETE_MEETING',
        meetingId: 'luna-carlos-meeting',
        result: 'GOOD',
      }),
      { type: 'MARK_DECISION_PENDING', candidateId: 'luna-carlos' },
    );
    expect(selectCandidateById(decision, 'luna-carlos')?.status).toBe(
      'DECISION_PENDING',
    );

    const before = decision.meetings.length;
    const next = reducer(decision, {
      type: 'SCHEDULE_MEETING',
      candidateId: 'luna-carlos',
      meetingType: 'VISIT',
      scheduledOn: '2026-09-10',
    });

    expect(next.meetings.length).toBe(before);
    expect(selectCandidateById(next, 'luna-carlos')?.status).toBe(
      'DECISION_PENDING',
    );
  });

  it('rejects scheduling a meeting with an invalid date', () => {
    const contact = reducer(state, {
      type: 'CONTINUE_CANDIDATE',
      candidateId: 'luna-sofia',
      toStatus: 'CONTACT_PENDING',
    });
    const before = contact.meetings.length;
    const next = reducer(contact, {
      type: 'SCHEDULE_MEETING',
      candidateId: 'luna-sofia',
      meetingType: 'VISIT',
      scheduledOn: '2026-02-30', // not a real date
    });

    expect(next.meetings.length).toBe(before);
  });

  it('completes a scheduled meeting recording a result', () => {
    const next = reducer(state, {
      type: 'COMPLETE_MEETING',
      meetingId: 'luna-carlos-meeting',
      result: 'GOOD',
      notes: 'Muy buena impresión.',
    });

    const meeting = next.meetings.find((m) => m.id === 'luna-carlos-meeting');
    expect(meeting?.status).toBe('COMPLETED');
    expect(meeting?.result).toBe('GOOD');
    expect(meeting?.notes).toBe('Muy buena impresión.');
  });

  it('rejects completing an already completed meeting', () => {
    const completed = reducer(state, {
      type: 'COMPLETE_MEETING',
      meetingId: 'luna-carlos-meeting',
      result: 'GOOD',
    });
    const next = reducer(completed, {
      type: 'COMPLETE_MEETING',
      meetingId: 'luna-carlos-meeting',
      result: 'STRONG_MATCH',
    });

    const meeting = next.meetings.find((m) => m.id === 'luna-carlos-meeting');
    expect(meeting?.result).toBe('GOOD');
  });

  it('rejects marking decision pending without a completed meeting', () => {
    const next = reducer(state, {
      type: 'MARK_DECISION_PENDING',
      candidateId: 'luna-carlos', // has only a SCHEDULED meeting
    });

    expect(selectCandidateById(next, 'luna-carlos')?.status).toBe(
      'MEETING_SCHEDULED',
    );
    expect(next.timelineEvents.some((e) => e.type === 'DECISION_PENDING')).toBe(
      false,
    );
  });

  it('moves a candidate with a completed meeting to DECISION_PENDING', () => {
    const completed = reducer(state, {
      type: 'COMPLETE_MEETING',
      meetingId: 'luna-carlos-meeting',
      result: 'GOOD',
    });
    const next = reducer(completed, {
      type: 'MARK_DECISION_PENDING',
      candidateId: 'luna-carlos',
    });

    expect(selectCandidateById(next, 'luna-carlos')?.status).toBe(
      'DECISION_PENDING',
    );
    expect(
      next.timelineEvents.some((event) => event.type === 'DECISION_PENDING'),
    ).toBe(true);
  });

  it('rejects marking decision pending for a candidate not in MEETING_SCHEDULED', () => {
    const next = reducer(state, {
      type: 'MARK_DECISION_PENDING',
      candidateId: 'luna-andrea', // NEEDS_EVALUATION
    });

    expect(selectCandidateById(next, 'luna-andrea')?.status).toBe(
      'NEEDS_EVALUATION',
    );
  });

  it('runs the full Andrea journey through a completed meeting to adoption', () => {
    let next = reducer(state, {
      type: 'RECORD_EVALUATION',
      candidateId: 'luna-andrea',
      evaluation: {
        candidateId: 'luna-andrea',
        overallFit: 'STRONG',
        positiveFactors: ['Buena disposición.'],
        concerns: [],
        recommendation: 'CONTINUE',
      },
    });
    next = reducer(next, {
      type: 'CONTINUE_CANDIDATE',
      candidateId: 'luna-andrea',
      toStatus: 'CONTACT_PENDING',
    });
    next = reducer(next, {
      type: 'SCHEDULE_MEETING',
      candidateId: 'luna-andrea',
      meetingType: 'HOME_VISIT',
      scheduledOn: '2026-09-01',
    });
    const andreaMeeting = next.meetings.find(
      (m) => m.candidateId === 'luna-andrea' && m.status === 'SCHEDULED',
    )!;
    next = reducer(next, {
      type: 'COMPLETE_MEETING',
      meetingId: andreaMeeting.id,
      result: 'GOOD',
      notes: 'Muy buena impresión.',
    });
    next = reducer(next, {
      type: 'MARK_DECISION_PENDING',
      candidateId: 'luna-andrea',
    });

    expect(selectCandidateById(next, 'luna-andrea')?.status).toBe(
      'DECISION_PENDING',
    );

    const final = reducer(next, {
      type: 'CONFIRM_ADOPTION',
      candidateId: 'luna-andrea',
      adoptionDate: '2026-09-05',
    });

    expect(selectCandidateById(final, 'luna-andrea')?.status).toBe('SELECTED');
    expect(selectCandidateById(final, 'luna-carlos')?.status).toBe(
      'NOT_SELECTED',
    );
    expect(selectCandidateById(final, 'luna-sofia')?.status).toBe(
      'NOT_SELECTED',
    );
    expect(selectAnimalById(final, 'luna')?.status).toBe('ADOPTED');

    const adoption = selectActiveAdoptionForAnimal(final, 'luna');
    expect(adoption).toBeDefined();
    expect(adoption?.candidateId).toBe('luna-andrea');
    expect(adoption?.adoptionDate).toBe('2026-09-05');

    const followUps = selectFollowUpsForAnimal(final, 'luna');
    expect(followUps.length).toBe(3);
    expect(followUps.every((f) => f.status === 'PENDING')).toBe(true);

    expect(
      final.timelineEvents.some((e) => e.type === 'ADOPTION_CONFIRMED'),
    ).toBe(true);
    expect(
      final.timelineEvents.some((e) => e.type === 'FOLLOW_UPS_PLANNED'),
    ).toBe(true);
  });

  it('rejects confirming adoption for a candidate not in DECISION_PENDING', () => {
    const next = reducer(state, {
      type: 'CONFIRM_ADOPTION',
      candidateId: 'luna-carlos', // MEETING_SCHEDULED
      adoptionDate: '2026-09-05',
    });

    expect(selectCandidateById(next, 'luna-carlos')?.status).toBe(
      'MEETING_SCHEDULED',
    );
    expect(selectAnimalById(next, 'luna')?.status).toBe('IN_PROCESS');
    expect(selectActiveAdoptionForAnimal(next, 'luna')).toBeUndefined();
  });

  it('completes a pending follow-up recording outcome and status', () => {
    const miaPending = state.followUps.find(
      (f) => f.animalId === 'mia' && f.status === 'PENDING',
    )!;
    const next = reducer(state, {
      type: 'COMPLETE_FOLLOWUP',
      followUpId: miaPending.id,
      outcome: 'EXCELLENT',
      notes: 'Perfecta adaptación.',
    });

    const updated = next.followUps.find((f) => f.id === miaPending.id);
    expect(updated?.status).toBe('COMPLETED');
    expect(updated?.outcome).toBe('EXCELLENT');
    expect(updated?.completedAt).toBeDefined();
  });

  it('rejects completing an already completed follow-up', () => {
    const miaCompleted = state.followUps.find(
      (f) => f.animalId === 'mia' && f.status === 'COMPLETED',
    )!;
    const next = reducer(state, {
      type: 'COMPLETE_FOLLOWUP',
      followUpId: miaCompleted.id,
      outcome: 'GOOD',
    });

    const updated = next.followUps.find((f) => f.id === miaCompleted.id);
    expect(updated?.status).toBe('COMPLETED');
    expect(updated?.outcome).toBe('EXCELLENT');
  });

  it('restores a fresh initial snapshot after mutations via the repository', () => {
    const completed = reducer(state, {
      type: 'COMPLETE_MEETING',
      meetingId: 'luna-carlos-meeting',
      result: 'GOOD',
    });
    const decision = reducer(completed, {
      type: 'MARK_DECISION_PENDING',
      candidateId: 'luna-carlos',
    });
    const advanced = reducer(decision, {
      type: 'CONFIRM_ADOPTION',
      candidateId: 'luna-carlos',
      adoptionDate: '2026-09-05',
    });

    expect(selectAnimalById(advanced, 'luna')?.status).toBe('ADOPTED');

    const repository = createMockPrototypeRepository();
    const reset = repository.getSnapshot();

    expect(selectCandidateById(reset, 'luna-andrea')?.status).toBe(
      'NEEDS_EVALUATION',
    );
    expect(selectCandidateById(reset, 'luna-carlos')?.status).toBe(
      'MEETING_SCHEDULED',
    );
    expect(selectAnimalById(reset, 'luna')?.status).toBe('IN_PROCESS');
    expect(reset.adoptions.length).toBe(state.adoptions.length);
    expect(reset).not.toBe(advanced);
  });

  it('assigns unique IDs to the follow-ups created by confirming an adoption', () => {
    const completed = reducer(state, {
      type: 'COMPLETE_MEETING',
      meetingId: 'luna-carlos-meeting',
      result: 'GOOD',
    });
    const decision = reducer(completed, {
      type: 'MARK_DECISION_PENDING',
      candidateId: 'luna-carlos',
    });
    const next = reducer(decision, {
      type: 'CONFIRM_ADOPTION',
      candidateId: 'luna-carlos',
      adoptionDate: '2026-09-05',
    });

    const lunaFollowUps = selectFollowUpsForAnimal(next, 'luna');
    expect(lunaFollowUps.length).toBeGreaterThan(0);
    expect(new Set(lunaFollowUps.map(({ id }) => id)).size).toBe(
      lunaFollowUps.length,
    );
  });

  it('assigns unique IDs to the timeline events created by confirming an adoption', () => {
    const completed = reducer(state, {
      type: 'COMPLETE_MEETING',
      meetingId: 'luna-carlos-meeting',
      result: 'GOOD',
    });
    const decision = reducer(completed, {
      type: 'MARK_DECISION_PENDING',
      candidateId: 'luna-carlos',
    });
    const next = reducer(decision, {
      type: 'CONFIRM_ADOPTION',
      candidateId: 'luna-carlos',
      adoptionDate: '2026-09-05',
    });

    const adoptedEvents = next.timelineEvents.filter(
      (e) =>
        e.animalId === 'luna' &&
        (e.type === 'ADOPTION_CONFIRMED' || e.type === 'FOLLOW_UPS_PLANNED'),
    );
    expect(adoptedEvents.length).toBe(2);
    expect(new Set(adoptedEvents.map(({ id }) => id)).size).toBe(2);
  });

  it('assigns unique timeline IDs when the first meeting moves an animal to IN_PROCESS', () => {
    const contact = reducer(state, {
      type: 'CONTINUE_CANDIDATE',
      candidateId: 'luna-sofia',
      toStatus: 'CONTACT_PENDING',
    });
    const next = reducer(contact, {
      type: 'SCHEDULE_MEETING',
      candidateId: 'luna-sofia',
      meetingType: 'MEET_AND_GREET',
      scheduledOn: '2026-09-01',
    });

    expect(selectAnimalById(next, 'luna')?.status).toBe('IN_PROCESS');
    const newEvents = next.timelineEvents.filter((e) => e.animalId === 'luna');
    expect(new Set(newEvents.map(({ id }) => id)).size).toBe(newEvents.length);
  });
});
