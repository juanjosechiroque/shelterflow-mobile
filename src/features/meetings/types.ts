export type MeetingStatus =
  'SCHEDULED' | 'COMPLETED' | 'CANCELED' | 'RESCHEDULED';
export type MeetingResult =
  'STRONG_MATCH' | 'GOOD' | 'CONCERNS' | 'NOT_RECOMMENDED';

export interface MockMeeting {
  id: string;
  candidateId: string;
  type: 'INTERVIEW' | 'VISIT' | 'MEET_AND_GREET' | 'HOME_VISIT';
  scheduledOn: string;
  status: MeetingStatus;
  result?: MeetingResult;
  notes?: string;
}
