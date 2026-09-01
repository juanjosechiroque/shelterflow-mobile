import type { TFunction } from 'i18next';

import type { MeetingResult, MeetingStatus, MockMeeting } from './types';

const meetingTypeKeys: Record<
  MockMeeting['type'],
  | 'meetings.types.interview'
  | 'meetings.types.visit'
  | 'meetings.types.meetAndGreet'
  | 'meetings.types.homeVisit'
> = {
  HOME_VISIT: 'meetings.types.homeVisit',
  INTERVIEW: 'meetings.types.interview',
  MEET_AND_GREET: 'meetings.types.meetAndGreet',
  VISIT: 'meetings.types.visit',
};

const meetingStatusKeys: Record<
  MeetingStatus,
  | 'meetings.status.scheduled'
  | 'meetings.status.completed'
  | 'meetings.status.canceled'
  | 'meetings.status.rescheduled'
> = {
  CANCELED: 'meetings.status.canceled',
  COMPLETED: 'meetings.status.completed',
  RESCHEDULED: 'meetings.status.rescheduled',
  SCHEDULED: 'meetings.status.scheduled',
};

const meetingResultKeys: Record<
  MeetingResult,
  | 'meetings.results.strongMatch'
  | 'meetings.results.good'
  | 'meetings.results.concerns'
  | 'meetings.results.notRecommended'
> = {
  CONCERNS: 'meetings.results.concerns',
  GOOD: 'meetings.results.good',
  NOT_RECOMMENDED: 'meetings.results.notRecommended',
  STRONG_MATCH: 'meetings.results.strongMatch',
};

export function getMeetingTypeLabel(
  t: TFunction,
  type: MockMeeting['type'],
): string {
  return t(meetingTypeKeys[type]);
}

export function getMeetingStatusLabel(
  t: TFunction,
  status: MeetingStatus,
): string {
  return t(meetingStatusKeys[status]);
}

export function getMeetingResultLabel(
  t: TFunction,
  result: MeetingResult,
): string {
  return t(meetingResultKeys[result]);
}
