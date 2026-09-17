import { fireEvent, render } from '@testing-library/react-native';

import { FollowupReminderControl } from '@/features/notifications/components/followup-reminder-control';
import type { LocalNotificationAdapter } from '@/lib/local-notifications';
import i18n from '@/i18n';

const adoptionId = '00000000-0000-4000-8000-000000000091';
const followupId = '00000000-0000-4000-8000-000000000113';

function createAdapter(): LocalNotificationAdapter {
  return {
    getPermission: jest.fn(async () => 'granted' as const),
    requestPermission: jest.fn(async () => 'granted' as const),
    scheduleFollowupReminder: jest.fn(async () => ({
      status: 'scheduled' as const,
      reminder: {
        notificationId: 'notif-1',
        adoptionId,
        followupId,
        dueDate: '2026-12-01',
        scheduledAt: '2026-09-16T10:00:00.000Z',
      },
    })),
    cancelFollowupReminder: jest.fn(async () => ({
      status: 'cancelled' as const,
    })),
    listScheduledReminders: jest.fn(async () => []),
    isFollowupScheduled: jest.fn(async () => false),
  };
}

function renderControl(adapter: LocalNotificationAdapter) {
  return render(
    <FollowupReminderControl
      adapter={adapter}
      adoptionId={adoptionId}
      animalName="Luna"
      dueDate="2026-12-01"
      followupId={followupId}
      personName="Andrea Perez"
    />,
  );
}

describe('FollowupReminderControl', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('es');
  });

  it('shows a message when notification permission is denied', async () => {
    const adapter = createAdapter();
    adapter.requestPermission = jest.fn(async () => 'denied' as const);
    const screen = await renderControl(adapter);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Programar recordatorio' }),
    );

    expect(
      await screen.findByText(
        'Las notificaciones no están permitidas. Habilítalas en la configuración del dispositivo para programar recordatorios.',
      ),
    ).toBeTruthy();
    expect(adapter.scheduleFollowupReminder).not.toHaveBeenCalled();
  });

  it('schedules a reminder and then offers cancellation', async () => {
    const adapter = createAdapter();
    const screen = await renderControl(adapter);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Programar recordatorio' }),
    );

    expect(
      await screen.findByText(
        'Recordatorio programado. Aún no ha sido entregado.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Cancelar recordatorio' }),
    ).toBeTruthy();
    expect(adapter.scheduleFollowupReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        adoptionId,
        followupId,
        dueDate: '2026-12-01',
      }),
    );
  });

  it('cancels an already scheduled reminder', async () => {
    const adapter = createAdapter();
    adapter.isFollowupScheduled = jest.fn(async () => true);
    const screen = await renderControl(adapter);

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Cancelar recordatorio' }),
    );

    expect(await screen.findByText('Recordatorio cancelado.')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Programar recordatorio' }),
    ).toBeTruthy();
  });

  it('shows a retry when scheduling fails', async () => {
    const adapter = createAdapter();
    adapter.scheduleFollowupReminder = jest
      .fn()
      .mockResolvedValueOnce({ status: 'error', message: 'boom' })
      .mockResolvedValueOnce({
        status: 'scheduled',
        reminder: {
          notificationId: 'notif-2',
          adoptionId,
          followupId,
          dueDate: '2026-12-01',
          scheduledAt: '2026-09-16T10:00:00.000Z',
        },
      });
    const screen = await renderControl(adapter);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Programar recordatorio' }),
    );
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Reintentar' }),
    );

    expect(
      await screen.findByText(
        'Recordatorio programado. Aún no ha sido entregado.',
      ),
    ).toBeTruthy();
    expect(adapter.scheduleFollowupReminder).toHaveBeenCalledTimes(2);
  });

  it('renders the English interface when the language is English', async () => {
    await i18n.changeLanguage('en');
    const adapter = createAdapter();
    const screen = await renderControl(adapter);

    expect(
      screen.getByRole('button', { name: 'Schedule reminder' }),
    ).toBeTruthy();
  });
});
