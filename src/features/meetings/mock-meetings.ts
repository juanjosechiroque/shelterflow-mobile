import type { MockMeeting } from './types';

export const mockMeetings: readonly MockMeeting[] = [
  {
    id: 'luna-ana-meeting-1',
    candidateId: 'luna-ana',
    type: 'MEET_AND_GREET',
    scheduledOn: '2026-08-01',
    status: 'COMPLETED',
    result: 'STRONG_MATCH',
    notes: 'La interacción con Luna fue muy positiva.',
  },
  {
    id: 'luna-ana-meeting-2',
    candidateId: 'luna-ana',
    type: 'HOME_VISIT',
    scheduledOn: '2026-08-18',
    status: 'COMPLETED',
    result: 'GOOD',
    notes: 'El hogar es adecuado; se recomendó continuar.',
  },
  {
    id: 'luna-carlos-meeting',
    candidateId: 'luna-carlos',
    type: 'MEET_AND_GREET',
    scheduledOn: '2026-08-25',
    status: 'SCHEDULED',
  },
];

export function getMeetingsForCandidate(
  candidateId: string,
): readonly MockMeeting[] {
  return mockMeetings.filter((meeting) => meeting.candidateId === candidateId);
}
