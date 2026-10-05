import type { Href } from 'expo-router';

import { FOLLOWUP_REMINDER_TYPE } from '@/lib/local-notifications';

/**
 * Payload parsing and routing for follow-up reminder notifications.
 *
 * The payload is treated as untrusted: an invalid or unexpected value never
 * navigates. A valid payload routes to the existing follow-up completion
 * screen, which already handles a follow-up that does not exist or is not
 * available.
 */

export interface FollowupNotificationPayload {
  adoptionId: string;
  followupId: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function buildFollowupReminderData(input: {
  adoptionId: string;
  followupId: string;
}): Record<string, unknown> {
  return {
    type: FOLLOWUP_REMINDER_TYPE,
    adoptionId: input.adoptionId,
    followupId: input.followupId,
  };
}

export function parseFollowupNotificationPayload(
  data: unknown,
): FollowupNotificationPayload | null {
  if (typeof data !== 'object' || data === null) return null;

  const record = data as Record<string, unknown>;
  if (record.type !== FOLLOWUP_REMINDER_TYPE) return null;
  if (!isUuid(record.adoptionId) || !isUuid(record.followupId)) return null;

  return {
    adoptionId: record.adoptionId,
    followupId: record.followupId,
  };
}

export function followupCompletionHref(
  payload: FollowupNotificationPayload,
): Href {
  return {
    pathname: '/adoptions/[adoptionId]/followups/[followupId]/complete',
    params: {
      adoptionId: payload.adoptionId,
      followupId: payload.followupId,
    },
  };
}
