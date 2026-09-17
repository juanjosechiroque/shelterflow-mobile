import { useEffect, useRef, type ReactNode } from 'react';
import { router, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';

import {
  followupCompletionHref,
  parseFollowupNotificationPayload,
} from './notification-deep-link';

export interface NotificationResponseEvent {
  identifier: string;
  data: unknown;
}

export interface NotificationResponseSource {
  configureForegroundHandler(): void;
  getLastResponse(): Promise<NotificationResponseEvent | null>;
  clearLastResponse(): Promise<void>;
  addResponseListener(
    listener: (event: NotificationResponseEvent) => void,
  ): () => void;
}

export function createExpoNotificationResponseSource(): NotificationResponseSource {
  return {
    configureForegroundHandler() {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
    },
    async getLastResponse() {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (!response) return null;
      return {
        identifier: response.notification.request.identifier,
        data: response.notification.request.content.data,
      };
    },
    async clearLastResponse() {
      await Notifications.clearLastNotificationResponseAsync();
    },
    addResponseListener(listener) {
      const subscription =
        Notifications.addNotificationResponseReceivedListener((response) => {
          listener({
            identifier: response.notification.request.identifier,
            data: response.notification.request.content.data,
          });
        });
      return () => subscription.remove();
    },
  };
}

export interface NotificationResponseProviderProps {
  children: ReactNode;
  enabled?: boolean;
  source?: NotificationResponseSource;
  navigate?: (href: Href) => void;
}

export function NotificationResponseProvider({
  children,
  enabled = true,
  source,
  navigate,
}: NotificationResponseProviderProps): ReactNode {
  const sourceRef = useRef<NotificationResponseSource>(
    source ?? createExpoNotificationResponseSource(),
  );
  const handledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    const activeSource = sourceRef.current;
    activeSource.configureForegroundHandler();

    const handleResponse = (event: NotificationResponseEvent): boolean => {
      const payload = parseFollowupNotificationPayload(event.data);
      if (!payload) return false;
      if (handledRef.current.has(event.identifier)) return false;

      handledRef.current.add(event.identifier);
      const href = followupCompletionHref(payload);
      if (navigate) {
        navigate(href);
      } else {
        router.push(href);
      }
      return true;
    };

    const unsubscribe = activeSource.addResponseListener(handleResponse);
    void activeSource
      .getLastResponse()
      .then((event) => {
        if (!event) return undefined;
        const payload = parseFollowupNotificationPayload(event.data);
        if (!payload) return undefined;

        // The listener may have handled this identifier before the recovery
        // resolved. Navigation stays deduplicated, but the native response is
        // still cleared so it cannot replay on the next cold start.
        handleResponse(event);
        return activeSource.clearLastResponse();
      })
      .catch(() => undefined);

    return unsubscribe;
  }, [enabled, navigate]);

  return children;
}
