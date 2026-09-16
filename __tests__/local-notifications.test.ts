import {
  createLocalNotificationAdapter,
  FOLLOWUP_REMINDER_TYPE,
  NOTIFICATION_STORAGE_KEY,
  resolveReminderDate,
  type KeyValueStorage,
  type NotificationNativeApi,
} from '@/lib/local-notifications';

const adoptionId = '00000000-0000-4000-8000-000000000091';
const followupId = '00000000-0000-4000-8000-000000000113';
const now = new Date('2026-09-16T10:00:00');
const futureDueDate = '2026-12-01';

function createStorage() {
  const map = new Map<string, string>();
  const storage: KeyValueStorage = {
    getItem: jest.fn(async (key) => map.get(key) ?? null),
    setItem: jest.fn(async (key, value) => {
      map.set(key, value);
    }),
  };
  return { storage, map };
}

function createNative() {
  const scheduled = new Map<string, { identifier: string }>();
  let counter = 0;
  const native: NotificationNativeApi & {
    scheduled: Map<string, { identifier: string }>;
  } = {
    getPermissionsAsync: jest.fn(async () => ({
      status: 'granted',
      canAskAgain: true,
    })),
    requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    scheduleNotificationAsync: jest.fn(async () => {
      counter += 1;
      const identifier = `notif-${counter}`;
      scheduled.set(identifier, { identifier });
      return identifier;
    }),
    cancelScheduledNotificationAsync: jest.fn(async (identifier) => {
      scheduled.delete(identifier);
    }),
    getAllScheduledNotificationsAsync: jest.fn(async () =>
      Array.from(scheduled.values()),
    ),
    ensureChannelAsync: jest.fn(async () => undefined),
    scheduled,
  };
  return native;
}

function createAdapter() {
  const { storage, map } = createStorage();
  const native = createNative();
  const adapter = createLocalNotificationAdapter({ native, storage });
  return { adapter, native, storage, map };
}

const scheduleInput = {
  adoptionId,
  followupId,
  dueDate: futureDueDate,
  title: 'Follow-up for Luna',
  body: 'Remember to complete the follow-up.',
  now,
};

describe('resolveReminderDate', () => {
  it('resolves a future due date to 09:00 local time', () => {
    const date = resolveReminderDate(futureDueDate, now);

    expect(date?.getHours()).toBe(9);
    expect(date?.getMinutes()).toBe(0);
  });

  it('rejects malformed and past due dates', () => {
    expect(resolveReminderDate('01/12/2026', now)).toBeNull();
    expect(resolveReminderDate('2026-01-01', now)).toBeNull();
  });
});

describe('local notification adapter', () => {
  it('does not schedule when permission is denied', async () => {
    const { adapter, native } = createAdapter();
    native.getPermissionsAsync = jest.fn(async () => ({ status: 'denied' }));

    await expect(
      adapter.scheduleFollowupReminder(scheduleInput),
    ).resolves.toEqual({ status: 'permission_denied', permission: 'denied' });
    expect(native.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('reports a denied permission request', async () => {
    const { adapter, native } = createAdapter();
    native.requestPermissionsAsync = jest.fn(async () => ({
      status: 'denied',
    }));

    await expect(adapter.requestPermission()).resolves.toBe('denied');
  });

  it('schedules, lists, and cancels a reminder', async () => {
    const { adapter, native } = createAdapter();

    const scheduled = await adapter.scheduleFollowupReminder(scheduleInput);
    expect(scheduled.status).toBe('scheduled');
    expect(native.scheduleNotificationAsync).toHaveBeenCalledTimes(1);

    const listed = await adapter.listScheduledReminders();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      adoptionId,
      followupId,
      dueDate: futureDueDate,
    });

    await expect(
      adapter.cancelFollowupReminder({ adoptionId, followupId }),
    ).resolves.toEqual({ status: 'cancelled' });
    expect(await adapter.listScheduledReminders()).toEqual([]);
    await expect(
      adapter.cancelFollowupReminder({ adoptionId, followupId }),
    ).resolves.toEqual({ status: 'not_found' });
  });

  it('never schedules a duplicate reminder for the same follow-up', async () => {
    const { adapter, native } = createAdapter();

    await adapter.scheduleFollowupReminder(scheduleInput);
    const second = await adapter.scheduleFollowupReminder(scheduleInput);

    expect(second.status).toBe('already_scheduled');
    expect(native.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(await adapter.listScheduledReminders()).toHaveLength(1);
  });

  it('does not schedule a reminder for a due date in the past', async () => {
    const { adapter, native } = createAdapter();

    await expect(
      adapter.scheduleFollowupReminder({
        ...scheduleInput,
        dueDate: '2026-01-01',
      }),
    ).resolves.toEqual({ status: 'invalid_date' });
    expect(native.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('recovers persisted reminders and drops ones the OS removed', async () => {
    const { adapter, map } = createAdapter();
    const reminder = {
      notificationId: 'notif-existing',
      adoptionId,
      followupId,
      dueDate: futureDueDate,
      scheduledAt: now.toISOString(),
    };
    map.set(NOTIFICATION_STORAGE_KEY, JSON.stringify([reminder]));

    const native = createNative();
    native.scheduled.set('notif-existing', { identifier: 'notif-existing' });
    const recovered = createLocalNotificationAdapter({
      native,
      storage: {
        getItem: async (key) => map.get(key) ?? null,
        setItem: async (key, value) => {
          map.set(key, value);
        },
      },
    });

    expect(await recovered.listScheduledReminders()).toEqual([reminder]);

    native.scheduled.clear();
    expect(await recovered.listScheduledReminders()).toEqual([]);
  });

  it('cancels the native reminder when persisting its metadata fails', async () => {
    const { storage, map } = createStorage();
    const native = createNative();
    (storage.setItem as jest.Mock).mockRejectedValueOnce(
      new Error('storage full'),
    );
    const adapter = createLocalNotificationAdapter({ native, storage });

    await expect(
      adapter.scheduleFollowupReminder(scheduleInput),
    ).resolves.toEqual({ status: 'error', message: 'storage full' });

    expect(native.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'notif-1',
    );
    expect(native.scheduled.size).toBe(0);
    expect(map.has(NOTIFICATION_STORAGE_KEY)).toBe(false);
    expect(await adapter.listScheduledReminders()).toEqual([]);
  });

  it('lets a failed reminder be retried without leaving duplicates', async () => {
    const { storage } = createStorage();
    const native = createNative();
    (storage.setItem as jest.Mock).mockRejectedValueOnce(
      new Error('storage full'),
    );
    const adapter = createLocalNotificationAdapter({ native, storage });

    await adapter.scheduleFollowupReminder(scheduleInput);
    const retry = await adapter.scheduleFollowupReminder(scheduleInput);

    expect(retry.status).toBe('scheduled');
    expect(native.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(await adapter.listScheduledReminders()).toHaveLength(1);
    expect(native.scheduled.size).toBe(1);
  });

  it('persists only reminder metadata, never URLs or tokens', async () => {
    const { adapter, map } = createAdapter();

    await adapter.scheduleFollowupReminder(scheduleInput);

    const raw = map.get(NOTIFICATION_STORAGE_KEY) ?? '';
    expect(raw).not.toMatch(/https?:\/\//i);
    expect(raw).not.toMatch(/token/i);
    expect(raw).not.toMatch(/signed/i);

    const [entry] = JSON.parse(raw) as Record<string, unknown>[];
    expect(Object.keys(entry).sort()).toEqual(
      [
        'adoptionId',
        'dueDate',
        'followupId',
        'notificationId',
        'scheduledAt',
      ].sort(),
    );
  });

  it('embeds the reminder payload type with the follow-up identifiers', async () => {
    const { adapter, native } = createAdapter();

    await adapter.scheduleFollowupReminder(scheduleInput);

    const request = (native.scheduleNotificationAsync as jest.Mock).mock
      .calls[0][0];
    expect(request.content.data).toEqual({
      type: FOLLOWUP_REMINDER_TYPE,
      adoptionId,
      followupId,
    });
  });
});
