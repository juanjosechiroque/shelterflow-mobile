import type { MockMeeting } from './types';

export const mockMeetings: readonly MockMeeting[] = [
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
