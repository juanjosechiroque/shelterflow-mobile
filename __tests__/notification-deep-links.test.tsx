import { act, render, waitFor } from '@testing-library/react-native';
import type { Href } from 'expo-router';

import {
  buildFollowupReminderData,
  parseFollowupNotificationPayload,
} from '@/features/notifications/notification-deep-link';
import {
  NotificationResponseProvider,
  type NotificationResponseEvent,
  type NotificationResponseSource,
} from '@/features/notifications/notification-response-provider';
import i18n from '@/i18n';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

const adoptionId = '00000000-0000-4000-8000-000000000091';
const followupId = '00000000-0000-4000-8000-000000000113';

const expectedHref = {
  pathname: '/adoptions/[adoptionId]/followups/[followupId]/complete',
  params: { adoptionId, followupId },
} as Href;

function createSource() {
  let listener: ((event: NotificationResponseEvent) => void) | null = null;
  const unsubscribe = jest.fn();
  const source: NotificationResponseSource = {
    configureForegroundHandler: jest.fn(),
    getLastResponse: jest.fn(async () => null),
    addResponseListener: jest.fn((next) => {
      listener = next;
      return unsubscribe;
    }),
  };
  return {
    source,
    unsubscribe,
    getLastResponse: source.getLastResponse as jest.Mock,
    emit(event: NotificationResponseEvent) {
      listener?.(event);
    },
  };
}

function validEvent(identifier: string): NotificationResponseEvent {
  return {
    identifier,
    data: buildFollowupReminderData({ adoptionId, followupId }),
  };
}

describe('follow-up notification payloads', () => {
  it('parses a valid reminder payload', () => {
    expect(
      parseFollowupNotificationPayload(
        buildFollowupReminderData({ adoptionId, followupId }),
      ),
    ).toEqual({ adoptionId, followupId });
  });

  it('rejects invalid or unexpected payloads', () => {
    expect(parseFollowupNotificationPayload(null)).toBeNull();
    expect(parseFollowupNotificationPayload('nope')).toBeNull();
    expect(parseFollowupNotificationPayload({})).toBeNull();
    expect(
      parseFollowupNotificationPayload({
        type: 'other',
        adoptionId,
        followupId,
      }),
    ).toBeNull();
    expect(
      parseFollowupNotificationPayload({
        type: 'followup_reminder',
        adoptionId: 'not-a-uuid',
        followupId,
      }),
    ).toBeNull();
  });
});

describe('NotificationResponseProvider', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('es');
  });

  it('navigates when a notification is tapped in the foreground', async () => {
    const { source, emit } = createSource();
    const navigate = jest.fn();

    await render(
      <NotificationResponseProvider navigate={navigate} source={source}>
        {null}
      </NotificationResponseProvider>,
    );

    await act(async () => {
      emit(validEvent('foreground-1'));
    });

    expect(navigate).toHaveBeenCalledWith(expectedHref);
  });

  it('navigates when a notification is tapped from the background', async () => {
    const { source, emit } = createSource();
    const navigate = jest.fn();

    await render(
      <NotificationResponseProvider navigate={navigate} source={source}>
        {null}
      </NotificationResponseProvider>,
    );

    await act(async () => {
      emit(validEvent('background-1'));
    });

    expect(navigate).toHaveBeenCalledWith(expectedHref);
  });

  it('navigates on a cold start from the last notification response', async () => {
    const { source, getLastResponse } = createSource();
    getLastResponse.mockResolvedValue(validEvent('cold-start-1'));
    const navigate = jest.fn();

    await render(
      <NotificationResponseProvider navigate={navigate} source={source}>
        {null}
      </NotificationResponseProvider>,
    );

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(expectedHref);
    });
  });

  it('handles a response identifier only once across cold start and listener', async () => {
    const { source, getLastResponse, emit } = createSource();
    getLastResponse.mockResolvedValue(validEvent('duplicate-1'));
    const navigate = jest.fn();

    await render(
      <NotificationResponseProvider navigate={navigate} source={source}>
        {null}
      </NotificationResponseProvider>,
    );

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      emit(validEvent('duplicate-1'));
    });

    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('ignores invalid payloads without navigating', async () => {
    const { source, getLastResponse, emit } = createSource();
    getLastResponse.mockResolvedValue({
      identifier: 'bad-1',
      data: { nope: 1 },
    });
    const navigate = jest.fn();

    await render(
      <NotificationResponseProvider navigate={navigate} source={source}>
        {null}
      </NotificationResponseProvider>,
    );

    await act(async () => {
      emit({ identifier: 'bad-2', data: 'nope' });
    });

    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not subscribe while disabled', async () => {
    const { source, getLastResponse } = createSource();

    await render(
      <NotificationResponseProvider enabled={false} source={source}>
        {null}
      </NotificationResponseProvider>,
    );

    expect(source.configureForegroundHandler).not.toHaveBeenCalled();
    expect(source.addResponseListener).not.toHaveBeenCalled();
    expect(getLastResponse).not.toHaveBeenCalled();
  });
});
