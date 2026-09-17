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
    clearLastResponse: jest.fn(async () => undefined),
    addResponseListener: jest.fn((next) => {
      listener = next;
      return unsubscribe;
    }),
  };
  return {
    source,
    unsubscribe,
    getLastResponse: source.getLastResponse as jest.Mock,
    clearLastResponse: source.clearLastResponse as jest.Mock,
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

  it('clears a recovered cold-start response so a new mount does not navigate again', async () => {
    const { source, getLastResponse, clearLastResponse } = createSource();
    let isCleared = false;
    getLastResponse.mockImplementation(async () =>
      isCleared ? null : validEvent('cold-start-clear-1'),
    );
    clearLastResponse.mockImplementation(async () => {
      isCleared = true;
    });
    const navigate = jest.fn();

    const first = await render(
      <NotificationResponseProvider navigate={navigate} source={source}>
        {null}
      </NotificationResponseProvider>,
    );

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(expectedHref);
    });
    await waitFor(() => {
      expect(clearLastResponse).toHaveBeenCalledTimes(1);
    });

    await first.unmount();

    const second = await render(
      <NotificationResponseProvider navigate={navigate} source={source}>
        {null}
      </NotificationResponseProvider>,
    );

    expect(navigate).toHaveBeenCalledTimes(1);

    await second.unmount();
  });

  it('clears the recovered response when the listener already handled the same tap', async () => {
    const { source, getLastResponse, clearLastResponse, emit } = createSource();
    let isCleared = false;
    let resolveLast!: (event: NotificationResponseEvent | null) => void;
    getLastResponse.mockImplementation(() => {
      if (isCleared) return Promise.resolve(null);
      return new Promise((resolve) => {
        resolveLast = resolve;
      });
    });
    clearLastResponse.mockImplementation(async () => {
      isCleared = true;
    });
    const navigate = jest.fn();

    const first = await render(
      <NotificationResponseProvider navigate={navigate} source={source}>
        {null}
      </NotificationResponseProvider>,
    );

    const event = validEvent('cold-start-listener-1');
    await act(async () => {
      emit(event);
    });

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(clearLastResponse).not.toHaveBeenCalled();

    await act(async () => {
      resolveLast(event);
    });

    await waitFor(() => {
      expect(clearLastResponse).toHaveBeenCalledTimes(1);
    });
    expect(navigate).toHaveBeenCalledTimes(1);

    await first.unmount();

    const second = await render(
      <NotificationResponseProvider navigate={navigate} source={source}>
        {null}
      </NotificationResponseProvider>,
    );

    expect(navigate).toHaveBeenCalledTimes(1);

    await second.unmount();
  });

  it('does not clear the cold-start response when the payload is invalid', async () => {
    const { source, getLastResponse, clearLastResponse } = createSource();
    getLastResponse.mockResolvedValue({ identifier: 'bad-cold-1', data: {} });
    const navigate = jest.fn();

    await render(
      <NotificationResponseProvider navigate={navigate} source={source}>
        {null}
      </NotificationResponseProvider>,
    );

    await waitFor(() => {
      expect(getLastResponse).toHaveBeenCalled();
    });

    expect(navigate).not.toHaveBeenCalled();
    expect(clearLastResponse).not.toHaveBeenCalled();
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
