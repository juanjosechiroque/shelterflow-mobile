import { useEffect, useRef, type ReactNode } from 'react';
import { router, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';

import {
  followupCompletionHref,
  parseFollowupNotificationPayload,
} from './notification-deep-link';

/**
 * Routes notification taps to the follow-up completion screen.
 *
 * Foreground and background taps arrive through the response listener; a cold
 * start is recovered once with `getLastNotificationResponseAsync`. A response
 * identifier is handled at most once per session so the cold-start recovery
 * cannot navigate twice. Invalid payloads are ignored, and a follow-up that
 * no longer exists or is unavailable is handled by the destination screen.
 */

export interface NotificationResponseEvent {
  identifier: string;
  data: unknown;
}

export interface NotificationResponseSource {
  configureForegroundHandler(): void;
  getLastResponse(): Promise<NotificationResponseEvent | null>;
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

    const handleResponse = (event: NotificationResponseEvent) => {
      if (handledRef.current.has(event.identifier)) return;
      handledRef.current.add(event.identifier);

      const payload = parseFollowupNotificationPayload(event.data);
      if (!payload) return;

      const href = followupCompletionHref(payload);
      if (navigate) {
        navigate(href);
      } else {
        router.push(href);
      }
    };

    const unsubscribe = activeSource.addResponseListener(handleResponse);
    void activeSource.getLastResponse().then((event) => {
      if (event) handleResponse(event);
    });

    return unsubscribe;
  }, [enabled, navigate]);

  return children;
}
