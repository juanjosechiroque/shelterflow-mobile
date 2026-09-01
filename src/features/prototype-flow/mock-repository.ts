import {
  mockAnimals,
  mockShelter as mockShelterData,
} from '@/features/animals/mock-animals';
import { mockCandidateDetails } from '@/features/candidates/mock-candidates';
import { mockEvaluations } from '@/features/evaluations/mock-evaluations';
import { mockMeetings } from '@/features/meetings/mock-meetings';
import { mockAdoptions } from '@/features/adoptions/mock-adoptions';
import { mockFollowUps } from '@/features/followups/mock-followups';
import { mockTimelineEvents } from '@/features/animals/mock-timeline';

import type { PrototypeFlowState } from './types';
import type { PrototypeFlowRepository } from './repository-contract';

function buildInitialState(): PrototypeFlowState {
  return {
    shelter: { ...mockShelterData },
    animals: mockAnimals.map((animal) => ({ ...animal })),
    candidates: mockCandidateDetails.map((candidate) => ({
      ...candidate,
      person: { ...candidate.person },
    })),
    evaluations: mockEvaluations.map((evaluation) => ({
      ...evaluation,
      positiveFactors: [...evaluation.positiveFactors],
      concerns: [...evaluation.concerns],
    })),
    meetings: mockMeetings.map((meeting) => ({ ...meeting })),
    adoptions: mockAdoptions.map((adoption) => ({ ...adoption })),
    followUps: mockFollowUps.map((followUp) => ({ ...followUp })),
    timelineEvents: mockTimelineEvents.map((event) => ({ ...event })),
  };
}

export function createMockPrototypeRepository(): PrototypeFlowRepository {
  return {
    getSnapshot: buildInitialState,
  };
}
