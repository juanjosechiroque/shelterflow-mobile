export type MeetingStatus =
  'SCHEDULED' | 'COMPLETED' | 'CANCELED' | 'RESCHEDULED';
export type MeetingResult =
  'STRONG_MATCH' | 'GOOD' | 'CONCERNS' | 'NOT_RECOMMENDED';
export type MeetingType =
  'INTERVIEW' | 'VISIT' | 'MEET_AND_GREET' | 'HOME_VISIT';

export interface MockMeeting {
  id: string;
  candidateId: string;
  type: MeetingType;
  scheduledOn: string;
  status: MeetingStatus;
  result?: MeetingResult;
  notes?: string;
}
