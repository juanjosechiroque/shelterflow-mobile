import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

/**
 * Local follow-up reminders.
 *
 * This adapter wraps the official Expo SDK 57 notifications module and keeps
 * the metadata of what was scheduled in local storage, so a reminder can be
 * listed, identified, and cancelled without a backend. A scheduled
 * notification is never reported as delivered: it is only reported as
 * scheduled. No signed URLs or tokens are persisted here.
 */

export const FOLLOWUP_REMINDER_TYPE = 'followup_reminder';
export const FOLLOWUP_REMINDER_CHANNEL_ID = 'followups';
export const NOTIFICATION_STORAGE_KEY = 'shelterflow.notifications.followups';

export interface FollowupReminder {
  notificationId: string;
  adoptionId: string;
  followupId: string;
  dueDate: string;
  scheduledAt: string;
}

export type ReminderPermission = 'granted' | 'denied' | 'undetermined';

export type ScheduleFollowupReminderResult =
  | { status: 'scheduled'; reminder: FollowupReminder }
  | { status: 'already_scheduled'; reminder: FollowupReminder }
  | { status: 'permission_denied'; permission: ReminderPermission }
  | { status: 'invalid_date' }
  | { status: 'error'; message: string };

export type CancelFollowupReminderResult =
  | { status: 'cancelled' }
  | { status: 'not_found' }
  | { status: 'error'; message: string };

export interface ScheduleFollowupReminderInput {
  adoptionId: string;
  followupId: string;
  dueDate: string;
  title: string;
  body: string;
  now?: Date;
}

export interface NotificationNativeApi {
  getPermissionsAsync(): Promise<{ status: string; canAskAgain?: boolean }>;
  requestPermissionsAsync(): Promise<{ status: string; canAskAgain?: boolean }>;
  scheduleNotificationAsync(request: {
    content: {
      title: string;
      body: string;
      data: Record<string, unknown>;
    };
    trigger: { date: Date; channelId?: string };
  }): Promise<string>;
  cancelScheduledNotificationAsync(identifier: string): Promise<void>;
  getAllScheduledNotificationsAsync(): Promise<{ identifier: string }[]>;
  ensureChannelAsync?(): Promise<void>;
}

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface LocalNotificationAdapter {
  getPermission(): Promise<ReminderPermission>;
  requestPermission(): Promise<ReminderPermission>;
  scheduleFollowupReminder(
    input: ScheduleFollowupReminderInput,
  ): Promise<ScheduleFollowupReminderResult>;
  cancelFollowupReminder(input: {
    adoptionId: string;
    followupId: string;
  }): Promise<CancelFollowupReminderResult>;
  listScheduledReminders(): Promise<FollowupReminder[]>;
  isFollowupScheduled(input: {
    adoptionId: string;
    followupId: string;
  }): Promise<boolean>;
}

export interface LocalNotificationAdapterOptions {
  native: NotificationNativeApi;
  storage: KeyValueStorage;
}

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

function toPermission(status: string): ReminderPermission {
  if (status === 'granted' || status === 'denied') return status;
  return 'undetermined';
}

/**
 * Resolves a `YYYY-MM-DD` due date to 09:00 local time. Returns `null` when
 * the value is malformed or already in the past, so a reminder is never
 * scheduled for a time that already passed.
 */
export function resolveReminderDate(dueDate: string, now: Date): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate);
  if (!match) return null;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    9,
    0,
    0,
    0,
  );
  if (Number.isNaN(date.getTime())) return null;
  if (date.getTime() <= now.getTime()) return null;
  return date;
}

export function createLocalNotificationAdapter({
  native,
  storage,
}: LocalNotificationAdapterOptions): LocalNotificationAdapter {
  async function readStored(): Promise<FollowupReminder[]> {
    const raw = await storage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as FollowupReminder[]) : [];
    } catch {
      return [];
    }
  }

  async function writeStored(reminders: FollowupReminder[]): Promise<void> {
    await storage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(reminders));
  }

  /**
   * Drops stored metadata whose native notification no longer exists, so a
   * reminder the OS removed cannot block scheduling a new one.
   */
  async function reconcile(): Promise<FollowupReminder[]> {
    const stored = await readStored();
    if (stored.length === 0) return stored;

    let scheduled: { identifier: string }[];
    try {
      scheduled = await native.getAllScheduledNotificationsAsync();
    } catch {
      return stored;
    }

    const scheduledIds = new Set(scheduled.map((item) => item.identifier));
    const live = stored.filter((reminder) =>
      scheduledIds.has(reminder.notificationId),
    );
    if (live.length !== stored.length) await writeStored(live);
    return live;
  }

  return {
    async getPermission() {
      const result = await native.getPermissionsAsync();
      return toPermission(result.status);
    },

    async requestPermission() {
      const result = await native.requestPermissionsAsync();
      return toPermission(result.status);
    },

    async scheduleFollowupReminder(input) {
      let permission: ReminderPermission;
      try {
        permission = toPermission((await native.getPermissionsAsync()).status);
      } catch (error) {
        return { status: 'error', message: toMessage(error) };
      }
      if (permission !== 'granted') {
        return { status: 'permission_denied', permission };
      }

      const now = input.now ?? new Date();
      const date = resolveReminderDate(input.dueDate, now);
      if (!date) return { status: 'invalid_date' };

      const reminders = await reconcile();
      const existing = reminders.find(
        (reminder) =>
          reminder.adoptionId === input.adoptionId &&
          reminder.followupId === input.followupId,
      );
      if (existing) {
        return { status: 'already_scheduled', reminder: existing };
      }

      try {
        await native.ensureChannelAsync?.();
        const notificationId = await native.scheduleNotificationAsync({
          content: {
            title: input.title,
            body: input.body,
            data: {
              type: FOLLOWUP_REMINDER_TYPE,
              adoptionId: input.adoptionId,
              followupId: input.followupId,
            },
          },
          trigger: { date, channelId: FOLLOWUP_REMINDER_CHANNEL_ID },
        });
        const reminder: FollowupReminder = {
          notificationId,
          adoptionId: input.adoptionId,
          followupId: input.followupId,
          dueDate: input.dueDate,
          scheduledAt: now.toISOString(),
        };
        await writeStored([...reminders, reminder]);
        return { status: 'scheduled', reminder };
      } catch (error) {
        return { status: 'error', message: toMessage(error) };
      }
    },

    async cancelFollowupReminder({ adoptionId, followupId }) {
      const reminders = await reconcile();
      const target = reminders.find(
        (reminder) =>
          reminder.adoptionId === adoptionId &&
          reminder.followupId === followupId,
      );
      if (!target) return { status: 'not_found' };

      try {
        await native.cancelScheduledNotificationAsync(target.notificationId);
      } catch {
        // The OS notification may already be gone; the local metadata still
        // has to be removed so the reminder stops appearing as scheduled.
      }

      await writeStored(
        reminders.filter(
          (reminder) =>
            !(
              reminder.adoptionId === adoptionId &&
              reminder.followupId === followupId
            ),
        ),
      );
      return { status: 'cancelled' };
    },

    listScheduledReminders() {
      return reconcile();
    },

    async isFollowupScheduled({ adoptionId, followupId }) {
      const reminders = await reconcile();
      return reminders.some(
        (reminder) =>
          reminder.adoptionId === adoptionId &&
          reminder.followupId === followupId,
      );
    },
  };
}

function createExpoNotificationNativeApi(): NotificationNativeApi {
  return {
    getPermissionsAsync: () => Notifications.getPermissionsAsync(),
    requestPermissionsAsync: () => Notifications.requestPermissionsAsync(),
    scheduleNotificationAsync: ({ content, trigger }) =>
      Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: trigger.date,
          channelId: trigger.channelId,
        },
      }),
    cancelScheduledNotificationAsync: (identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier),
    getAllScheduledNotificationsAsync: () =>
      Notifications.getAllScheduledNotificationsAsync(),
    ensureChannelAsync: async () => {
      await Notifications.setNotificationChannelAsync(
        FOLLOWUP_REMINDER_CHANNEL_ID,
        {
          name: 'Follow-ups',
          importance: Notifications.AndroidImportance.DEFAULT,
        },
      );
    },
  };
}

export const localNotificationAdapter = createLocalNotificationAdapter({
  native: createExpoNotificationNativeApi(),
  storage: AsyncStorage,
});
