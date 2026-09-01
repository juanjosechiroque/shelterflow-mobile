import { mockAnimals } from '@/features/animals/mock-animals';
import { mockCandidateDetails } from '@/features/candidates/mock-candidates';
import { mockEvaluations } from '@/features/evaluations/mock-evaluations';
import { mockMeetings } from '@/features/meetings/mock-meetings';
import { mockAdoptions } from '@/features/adoptions/mock-adoptions';
import { mockFollowUps } from '@/features/followups/mock-followups';
import { mockTimelineEvents } from '@/features/animals/mock-timeline';

import type { PrototypeFlowState, MockTodayTask } from './types';

export function getInitialPrototypeState(): PrototypeFlowState {
  return {
    animals: [...mockAnimals],
    candidates: mockCandidateDetails.map((c) => ({
      ...c,
      person: { ...c.person },
    })),
    evaluations: mockEvaluations.map((e) => ({
      ...e,
      positiveFactors: [...e.positiveFactors],
      concerns: [...e.concerns],
    })),
    meetings: mockMeetings.map((m) => ({ ...m })),
    adoptions: mockAdoptions.map((a) => ({ ...a })),
    followUps: mockFollowUps.map((f) => ({ ...f })),
    timelineEvents: mockTimelineEvents.map((t) => ({ ...t })),
  };
}

export function selectAnimalById(state: PrototypeFlowState, animalId: string) {
  return state.animals.find((a) => a.id === animalId);
}

export function selectCandidatesForAnimal(
  state: PrototypeFlowState,
  animalId: string,
) {
  return state.candidates.filter((c) => c.animalId === animalId);
}

export function selectCandidateById(
  state: PrototypeFlowState,
  candidateId: string,
) {
  return state.candidates.find((c) => c.id === candidateId);
}

export function selectEvaluationForCandidate(
  state: PrototypeFlowState,
  candidateId: string,
) {
  return state.evaluations.find((e) => e.candidateId === candidateId);
}

export function selectMeetingsForCandidate(
  state: PrototypeFlowState,
  candidateId: string,
) {
  return state.meetings.filter((m) => m.candidateId === candidateId);
}

export function selectAdoptionForCandidate(
  state: PrototypeFlowState,
  candidateId: string,
) {
  return state.adoptions.find((a) => a.candidateId === candidateId);
}

export function selectActiveAdoptionForAnimal(
  state: PrototypeFlowState,
  animalId: string,
) {
  return state.adoptions.find(
    (a) => a.animalId === animalId && a.status === 'ACTIVE',
  );
}

export function selectFollowUpsForAnimal(
  state: PrototypeFlowState,
  animalId: string,
) {
  return state.followUps.filter((f) => f.animalId === animalId);
}

export function selectTimelineForAnimal(
  state: PrototypeFlowState,
  animalId: string,
) {
  return state.timelineEvents
    .filter((e) => e.animalId === animalId)
    .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn));
}

export function selectTodayTasks(state: PrototypeFlowState): MockTodayTask[] {
  const tasks: MockTodayTask[] = [];

  const evaluationsNeeded = state.candidates.filter(
    (c) => c.status === 'NEEDS_EVALUATION',
  );
  if (evaluationsNeeded.length > 0) {
    const animalGroups = groupByAnimal(evaluationsNeeded, state);
    for (const [animalId, count] of Object.entries(animalGroups)) {
      const animal = selectAnimalById(state, animalId);
      tasks.push({
        id: `evaluations-${animalId}`,
        kind: 'evaluations',
        count,
        animalId,
        animalName: animal?.name ?? '',
        tone: 'primary',
      });
    }
  }

  const meetingsNeeded = state.candidates.filter(
    (c) => c.status === 'MEETING_SCHEDULED',
  );
  if (meetingsNeeded.length > 0) {
    const animalGroups = groupByAnimal(meetingsNeeded, state);
    for (const [animalId, count] of Object.entries(animalGroups)) {
      const animal = selectAnimalById(state, animalId);
      tasks.push({
        id: `meeting-${animalId}`,
        kind: 'meeting',
        count,
        animalId,
        animalName: animal?.name ?? '',
        tone: 'info',
      });
    }
  }

  const decisionsNeeded = state.candidates.filter(
    (c) => c.status === 'DECISION_PENDING',
  );
  if (decisionsNeeded.length > 0) {
    const animalGroups = groupByAnimal(decisionsNeeded, state);
    for (const [animalId, count] of Object.entries(animalGroups)) {
      const animal = selectAnimalById(state, animalId);
      tasks.push({
        id: `decisions-${animalId}`,
        kind: 'decisions',
        count,
        animalId,
        animalName: animal?.name ?? '',
        tone: 'warning',
      });
    }
  }

  const pendingFollowUps = state.followUps.filter(
    (f) => f.status === 'PENDING',
  );
  if (pendingFollowUps.length > 0) {
    const animalGroups = pendingFollowUps.reduce<Record<string, number>>(
      (acc, f) => {
        acc[f.animalId] = (acc[f.animalId] ?? 0) + 1;
        return acc;
      },
      {},
    );
    for (const [animalId, count] of Object.entries(animalGroups)) {
      const animal = selectAnimalById(state, animalId);
      tasks.push({
        id: `followups-${animalId}`,
        kind: 'followups',
        count,
        animalId,
        animalName: animal?.name ?? '',
        tone: 'primary',
      });
    }
  }

  const reevaluationAnimals = state.animals.filter(
    (a) => a.status === 'REEVALUATION',
  );
  for (const animal of reevaluationAnimals) {
    tasks.push({
      id: `reevaluation-${animal.id}`,
      kind: 'reevaluation',
      count: 1,
      animalId: animal.id,
      animalName: animal.name,
      tone: 'warning',
    });
  }

  return tasks;
}

function groupByAnimal(
  candidates: readonly { animalId: string }[],
  _state: PrototypeFlowState,
): Record<string, number> {
  return candidates.reduce<Record<string, number>>((acc, c) => {
    acc[c.animalId] = (acc[c.animalId] ?? 0) + 1;
    return acc;
  }, {});
}

export function canRecordEvaluation(
  state: PrototypeFlowState,
  candidateId: string,
): boolean {
  const candidate = selectCandidateById(state, candidateId);
  return candidate?.status === 'NEEDS_EVALUATION';
}

export function canScheduleMeeting(
  state: PrototypeFlowState,
  candidateId: string,
): boolean {
  const candidate = selectCandidateById(state, candidateId);
  if (!candidate) return false;
  return (
    candidate.status === 'CONTACT_PENDING' ||
    candidate.status === 'MEETING_SCHEDULED'
  );
}

export function canMarkDecisionPending(
  state: PrototypeFlowState,
  candidateId: string,
): boolean {
  const candidate = selectCandidateById(state, candidateId);
  if (!candidate || candidate.status !== 'MEETING_SCHEDULED') return false;
  return state.meetings.some(
    (m) =>
      m.candidateId === candidateId && m.status === 'COMPLETED' && !!m.result,
  );
}

export function canConfirmAdoption(
  state: PrototypeFlowState,
  candidateId: string,
): boolean {
  const candidate = selectCandidateById(state, candidateId);
  if (!candidate || candidate.status !== 'DECISION_PENDING') return false;

  const animal = selectAnimalById(state, candidate.animalId);
  if (!animal || animal.status !== 'IN_PROCESS') return false;

  const hasActiveAdoption = state.adoptions.some(
    (a) => a.animalId === animal.id && a.status === 'ACTIVE',
  );
  return !hasActiveAdoption;
}

export function canCompleteFollowUp(
  state: PrototypeFlowState,
  followUpId: string,
): boolean {
  const followUp = state.followUps.find((f) => f.id === followUpId);
  return followUp?.status === 'PENDING';
}
