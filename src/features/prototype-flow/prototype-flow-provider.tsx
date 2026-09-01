import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { Clock } from './clock';
import { systemClock } from './clock';
import type { PrototypeFlowRepository } from './repository-contract';
import { createMockPrototypeRepository } from './mock-repository';
import { createPrototypeFlowReducer } from './prototype-flow-reducer';
import type {
  CandidateStatus,
  FollowUpOutcome,
  MockEvaluation,
  MockMeeting,
  PrototypeFlowAction,
  PrototypeFlowState,
} from './types';

export interface PrototypeFlowCommands {
  recordEvaluation(
    candidateId: string,
    evaluation: Omit<MockEvaluation, 'id' | 'recordedOn'>,
  ): void;
  continueContact(candidateId: string, toStatus: CandidateStatus): void;
  scheduleMeeting(
    candidateId: string,
    meetingType: MockMeeting['type'],
    scheduledOn: string,
    notes?: string,
  ): void;
  completeMeeting(
    meetingId: string,
    result: MockMeeting['result'],
    notes?: string,
  ): void;
  markDecisionPending(candidateId: string): void;
  confirmAdoption(
    candidateId: string,
    adoptDate?: string,
    handoverNotes?: string,
  ): void;
  completeFollowUp(
    followUpId: string,
    outcome: FollowUpOutcome,
    notes?: string,
  ): void;
}

interface PrototypeFlowContextValue {
  state: PrototypeFlowState;
  commands: PrototypeFlowCommands;
  reset: () => void;
}

const PrototypeFlowContext = createContext<PrototypeFlowContextValue | null>(
  null,
);

interface PrototypeFlowProviderProps {
  children: ReactNode;
  repository?: PrototypeFlowRepository;
  clock?: Clock;
}

export function PrototypeFlowProvider({
  children,
  repository = createMockPrototypeRepository(),
  clock = systemClock,
}: PrototypeFlowProviderProps) {
  const [state, setState] = useState<PrototypeFlowState>(() =>
    repository.getSnapshot(),
  );

  const reducer = useMemo(() => createPrototypeFlowReducer(clock), [clock]);

  const dispatch = useCallback(
    (action: PrototypeFlowAction) =>
      setState((previous) => reducer(previous, action)),
    [reducer],
  );

  const commands = useMemo<PrototypeFlowCommands>(
    () => ({
      recordEvaluation: (candidateId, evaluation) =>
        dispatch({ type: 'RECORD_EVALUATION', candidateId, evaluation }),
      continueContact: (candidateId, toStatus) =>
        dispatch({ type: 'CONTINUE_CANDIDATE', candidateId, toStatus }),
      scheduleMeeting: (candidateId, meetingType, scheduledOn, notes) =>
        dispatch({
          type: 'SCHEDULE_MEETING',
          candidateId,
          meetingType,
          scheduledOn,
          notes,
        }),
      completeMeeting: (meetingId, result, notes) =>
        dispatch({ type: 'COMPLETE_MEETING', meetingId, result, notes }),
      markDecisionPending: (candidateId) =>
        dispatch({ type: 'MARK_DECISION_PENDING', candidateId }),
      confirmAdoption: (candidateId, adoptDate, handoverNotes) =>
        dispatch({
          type: 'CONFIRM_ADOPTION',
          candidateId,
          adoptionDate: adoptDate ?? clock.todayISO(),
          handoverNotes,
        }),
      completeFollowUp: (followUpId, outcome, notes) =>
        dispatch({ type: 'COMPLETE_FOLLOWUP', followUpId, outcome, notes }),
    }),
    [dispatch, clock],
  );

  const reset = useCallback(
    () => setState(repository.getSnapshot()),
    [repository],
  );

  const value = useMemo(
    () => ({ state, commands, reset }),
    [state, commands, reset],
  );

  return (
    <PrototypeFlowContext.Provider value={value}>
      {children}
    </PrototypeFlowContext.Provider>
  );
}

export function usePrototypeFlow(): PrototypeFlowContextValue {
  const context = useContext(PrototypeFlowContext);
  if (!context) {
    throw new Error(
      'usePrototypeFlow must be used within a PrototypeFlowProvider',
    );
  }
  return context;
}

export type { PrototypeFlowContextValue };
