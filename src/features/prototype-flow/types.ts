import type {
  AnimalStatus,
  CandidateStatus,
  MockAnimal,
  MockTimelineEvent,
  TimelineEventType,
} from '@/features/animals/types';
import type { MockCandidateDetail } from '@/features/candidates/types';
import type {
  MockEvaluation,
  EvaluationOverallFit,
  EvaluationRecommendation,
} from '@/features/evaluations/types';
import type { MockMeeting } from '@/features/meetings/types';
import type { MockFollowUp, FollowUpOutcome } from '@/features/followups/types';
import type { MockAdoption } from '@/features/adoptions/types';

export type {
  MockAnimal,
  MockCandidateDetail,
  MockEvaluation,
  EvaluationOverallFit,
  EvaluationRecommendation,
  MockMeeting,
  MockFollowUp,
  FollowUpOutcome,
  MockTimelineEvent,
  MockAdoption,
};

export type { CandidateStatus, AnimalStatus, TimelineEventType };

export interface MockShelter {
  id: string;
  name: string;
}

export interface PrototypeFlowState {
  shelter: MockShelter;
  animals: MockAnimal[];
  candidates: MockCandidateDetail[];
  evaluations: MockEvaluation[];
  meetings: MockMeeting[];
  adoptions: MockAdoption[];
  followUps: MockFollowUp[];
  timelineEvents: MockTimelineEvent[];
}

export type PrototypeFlowAction =
  | {
      type: 'RECORD_EVALUATION';
      candidateId: string;
      evaluation: Omit<MockEvaluation, 'id' | 'recordedOn'>;
    }
  | {
      type: 'CONTINUE_CANDIDATE';
      candidateId: string;
      toStatus: CandidateStatus;
    }
  | {
      type: 'SCHEDULE_MEETING';
      candidateId: string;
      meetingType: MockMeeting['type'];
      scheduledOn: string;
      notes?: string;
    }
  | {
      type: 'COMPLETE_MEETING';
      meetingId: string;
      result: MockMeeting['result'];
      notes?: string;
    }
  | {
      type: 'MARK_DECISION_PENDING';
      candidateId: string;
    }
  | {
      type: 'CONFIRM_ADOPTION';
      candidateId: string;
      adoptionDate: string;
      handoverNotes?: string;
    }
  | {
      type: 'COMPLETE_FOLLOWUP';
      followUpId: string;
      outcome: MockFollowUp['outcome'];
      notes?: string;
    };

export type TodayTaskKind =
  'evaluations' | 'meeting' | 'decisions' | 'followups' | 'reevaluation';

export interface MockTodayTask {
  id: string;
  kind: TodayTaskKind;
  count: number;
  animalId: string;
  animalName: string;
  tone: 'primary' | 'info' | 'warning';
}
