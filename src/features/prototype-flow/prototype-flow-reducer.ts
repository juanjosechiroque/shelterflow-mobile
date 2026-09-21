import type { PrototypeFlowAction, PrototypeFlowState } from './types';
import { getInitialPrototypeState } from './prototype-flow-selectors';
import { isValidISODate } from './date-utils';

function nextId(
  prefix: string,
  items: readonly { id: string }[],
  offset = 0,
): string {
  return `${prefix}-${items.length + 1 + offset}`;
}

function isRealDate(value: string): boolean {
  return isValidISODate(value);
}

export function prototypeFlowReducer(
  state: PrototypeFlowState,
  action: PrototypeFlowAction,
): PrototypeFlowState {
  switch (action.type) {
    case 'RESET':
      return getInitialPrototypeState();

    case 'RECORD_EVALUATION': {
      const candidate = state.candidates.find(
        (c) => c.id === action.candidateId,
      );
      if (!candidate || candidate.status !== 'NEEDS_EVALUATION') return state;

      const today = new Date();
      const recordedOn = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const evaluation = {
        ...action.evaluation,
        id: nextId('eval', state.evaluations),
        recordedOn,
      };

      const personName = candidate.person.name;
      const animalId = candidate.animalId;

      const timelineEvent: PrototypeFlowState['timelineEvents'][number] = {
        id: nextId('tl', state.timelineEvents),
        animalId,
        type: 'EVALUATION_RECORDED' as const,
        occurredOn: recordedOn,
        personName,
      };

      return {
        ...state,
        candidates: state.candidates.map((c) =>
          c.id === action.candidateId
            ? { ...c, status: 'EVALUATED' as const }
            : c,
        ),
        evaluations: [...state.evaluations, evaluation],
        timelineEvents: [...state.timelineEvents, timelineEvent],
      };
    }

    case 'CONTINUE_CANDIDATE': {
      const candidate = state.candidates.find(
        (c) => c.id === action.candidateId,
      );
      if (!candidate) return state;

      const allowedTransitions: Record<string, readonly string[]> = {
        EVALUATED: ['CONTACT_PENDING', 'NOT_SELECTED', 'WITHDRAWN'],
        CONTACT_PENDING: ['MEETING_SCHEDULED', 'NOT_SELECTED', 'WITHDRAWN'],
        MEETING_SCHEDULED: ['DECISION_PENDING', 'WITHDRAWN'],
        DECISION_PENDING: ['NOT_SELECTED', 'WITHDRAWN'],
      };

      const allowed = allowedTransitions[candidate.status];
      if (!allowed || !allowed.includes(action.toStatus)) return state;

      // DECISION_PENDING requires at least one completed meeting.
      if (action.toStatus === 'DECISION_PENDING') {
        const hasCompletedMeeting = state.meetings.some(
          (m) =>
            m.candidateId === candidate.id &&
            m.status === 'COMPLETED' &&
            !!m.result,
        );
        if (!hasCompletedMeeting) return state;
      }

      const animalId = candidate.animalId;
      const personName = candidate.person.name;

      let timelineType: PrototypeFlowState['timelineEvents'][number]['type'];
      if (action.toStatus === 'CONTACT_PENDING') {
        timelineType = 'CANDIDATE_CREATED';
      } else if (action.toStatus === 'MEETING_SCHEDULED') {
        timelineType = 'MEETING_SCHEDULED';
      } else if (action.toStatus === 'DECISION_PENDING') {
        timelineType = 'DECISION_PENDING';
      } else {
        timelineType = 'CANDIDATE_CREATED';
      }

      const updatedCandidates = state.candidates.map((c) =>
        c.id === action.candidateId ? { ...c, status: action.toStatus } : c,
      );

      let updatedAnimals = state.animals;
      let timelineEvents = [
        ...state.timelineEvents,
        {
          id: nextId('tl', state.timelineEvents),
          animalId,
          type: timelineType,
          occurredOn: new Date().toISOString().slice(0, 10),
          personName,
        } satisfies PrototypeFlowState['timelineEvents'][number],
      ];

      if (
        action.toStatus === 'MEETING_SCHEDULED' &&
        candidate.status !== 'MEETING_SCHEDULED'
      ) {
        const animal = state.animals.find((a) => a.id === animalId);
        if (animal && animal.status === 'READY') {
          updatedAnimals = state.animals.map((a) =>
            a.id === animalId ? { ...a, status: 'IN_PROCESS' as const } : a,
          );
          timelineEvents = [
            ...timelineEvents,
            {
              id: nextId('tl', state.timelineEvents, 1),
              animalId,
              type: 'ANIMAL_IN_PROCESS',
              occurredOn: new Date().toISOString().slice(0, 10),
            },
          ];
        }
      }

      return {
        ...state,
        candidates: updatedCandidates,
        animals: updatedAnimals,
        timelineEvents,
      };
    }

    case 'SCHEDULE_MEETING': {
      const candidate = state.candidates.find(
        (c) => c.id === action.candidateId,
      );
      if (!candidate) return state;

      // The reducer is the source of truth for the transition.
      if (
        candidate.status !== 'CONTACT_PENDING' &&
        candidate.status !== 'MEETING_SCHEDULED'
      ) {
        return state;
      }
      if (!isRealDate(action.scheduledOn)) return state;

      const isFirstMeeting = candidate.status === 'CONTACT_PENDING';

      const meeting: PrototypeFlowState['meetings'][number] = {
        id: nextId('meeting', state.meetings),
        candidateId: candidate.id,
        type: action.meetingType,
        scheduledOn: action.scheduledOn,
        status: 'SCHEDULED',
        notes: action.notes,
      };

      const personName = candidate.person.name;
      const timelineEvent: PrototypeFlowState['timelineEvents'][number] = {
        id: nextId('tl', state.timelineEvents),
        animalId: candidate.animalId,
        type: 'MEETING_SCHEDULED',
        occurredOn: action.scheduledOn,
        personName,
      };

      const updatedCandidates = isFirstMeeting
        ? state.candidates.map((c) =>
            c.id === candidate.id
              ? { ...c, status: 'MEETING_SCHEDULED' as const }
              : c,
          )
        : state.candidates;

      let updatedAnimals = state.animals;
      let timelineEvents = [
        ...state.timelineEvents,
        timelineEvent,
        ...(isFirstMeeting
          ? [
              {
                id: nextId('tl', state.timelineEvents, 1),
                animalId: candidate.animalId,
                type: 'ANIMAL_IN_PROCESS',
                occurredOn: action.scheduledOn,
              } satisfies PrototypeFlowState['timelineEvents'][number],
            ]
          : []),
      ];

      if (isFirstMeeting) {
        const animal = state.animals.find((a) => a.id === candidate.animalId);
        if (animal && animal.status === 'READY') {
          updatedAnimals = state.animals.map((a) =>
            a.id === candidate.animalId
              ? { ...a, status: 'IN_PROCESS' as const }
              : a,
          );
        }
      }

      return {
        ...state,
        meetings: [...state.meetings, meeting],
        candidates: updatedCandidates,
        animals: updatedAnimals,
        timelineEvents,
      };
    }

    case 'COMPLETE_MEETING': {
      const meeting = state.meetings.find((m) => m.id === action.meetingId);
      if (!meeting || meeting.status !== 'SCHEDULED') return state;

      return {
        ...state,
        meetings: state.meetings.map((m) =>
          m.id === action.meetingId
            ? {
                ...m,
                status: 'COMPLETED' as const,
                result: action.result,
                notes: action.notes ?? m.notes,
              }
            : m,
        ),
      };
    }

    case 'MARK_DECISION_PENDING': {
      const candidate = state.candidates.find(
        (c) => c.id === action.candidateId,
      );
      if (!candidate || candidate.status !== 'MEETING_SCHEDULED') return state;

      const hasCompletedMeeting = state.meetings.some(
        (m) =>
          m.candidateId === candidate.id &&
          m.status === 'COMPLETED' &&
          !!m.result,
      );
      if (!hasCompletedMeeting) return state;

      const personName = candidate.person.name;
      const timelineEvent: PrototypeFlowState['timelineEvents'][number] = {
        id: nextId('tl', state.timelineEvents),
        animalId: candidate.animalId,
        type: 'DECISION_PENDING',
        occurredOn: new Date().toISOString().slice(0, 10),
        personName,
      };

      return {
        ...state,
        candidates: state.candidates.map((c) =>
          c.id === action.candidateId
            ? { ...c, status: 'DECISION_PENDING' as const }
            : c,
        ),
        timelineEvents: [...state.timelineEvents, timelineEvent],
      };
    }

    case 'CONFIRM_ADOPTION': {
      const candidate = state.candidates.find(
        (c) => c.id === action.candidateId,
      );
      if (!candidate || candidate.status !== 'DECISION_PENDING') return state;

      const animal = state.animals.find((a) => a.id === candidate.animalId);
      if (!animal || animal.status !== 'IN_PROCESS') return state;

      const hasActiveAdoption = state.adoptions.some(
        (a) => a.animalId === animal.id && a.status === 'ACTIVE',
      );
      if (hasActiveAdoption) return state;

      const adoptionId = nextId('adoption', state.adoptions);
      const adoption: PrototypeFlowState['adoptions'][number] = {
        id: adoptionId,
        animalId: animal.id,
        candidateId: candidate.id,
        adoptionDate: action.adoptionDate,
        status: 'ACTIVE',
        handoverNotes: action.handoverNotes,
      };

      const updatedCandidates = state.candidates.map((c) => {
        if (c.id === candidate.id) {
          return { ...c, status: 'SELECTED' as const };
        }
        if (c.animalId === animal.id) {
          const terminalStatuses: readonly string[] = [
            'SELECTED',
            'NOT_SELECTED',
            'WITHDRAWN',
          ];
          if (!terminalStatuses.includes(c.status)) {
            return { ...c, status: 'NOT_SELECTED' as const };
          }
        }
        return c;
      });

      const updatedAnimals = state.animals.map((a) =>
        a.id === animal.id ? { ...a, status: 'ADOPTED' as const } : a,
      );

      const followUpDates = [7, 30, 60];
      const adoptionDate = new Date(action.adoptionDate);
      const followUps: PrototypeFlowState['followUps'][number][] =
        followUpDates.map((days, index) => {
          const due = new Date(adoptionDate);
          due.setDate(due.getDate() + days);
          const dueStr = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
          return {
            id: nextId('fu', state.followUps, index),
            animalId: animal.id,
            adoptionId,
            dueDate: dueStr,
            status: 'PENDING' as const,
          };
        });

      const personName = candidate.person.name;
      const today = new Date().toISOString().slice(0, 10);
      const adoptionEvent: PrototypeFlowState['timelineEvents'][number] = {
        id: nextId('tl', state.timelineEvents),
        animalId: animal.id,
        type: 'ADOPTION_CONFIRMED',
        occurredOn: today,
        personName,
      };
      const followUpEvent: PrototypeFlowState['timelineEvents'][number] = {
        id: nextId('tl', state.timelineEvents, 1),
        animalId: animal.id,
        type: 'FOLLOW_UPS_PLANNED',
        occurredOn: today,
      };

      return {
        ...state,
        candidates: updatedCandidates,
        animals: updatedAnimals,
        adoptions: [...state.adoptions, adoption],
        followUps: [...state.followUps, ...followUps],
        timelineEvents: [...state.timelineEvents, adoptionEvent, followUpEvent],
      };
    }

    case 'COMPLETE_FOLLOWUP': {
      const followUp = state.followUps.find((f) => f.id === action.followUpId);
      if (!followUp || followUp.status !== 'PENDING') return state;

      const today = new Date().toISOString().slice(0, 10);
      return {
        ...state,
        followUps: state.followUps.map((f) =>
          f.id === action.followUpId
            ? {
                ...f,
                status: 'COMPLETED' as const,
                outcome: action.outcome,
                notes: action.notes,
                completedAt: today,
              }
            : f,
        ),
      };
    }

    default:
      return state;
  }
}
