import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SecondaryButton } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import {
  localNotificationAdapter,
  type LocalNotificationAdapter,
} from '@/lib/local-notifications';

export interface FollowupReminderControlProps {
  adoptionId: string;
  followupId: string;
  dueDate: string;
  animalName: string;
  personName: string;
  adapter?: LocalNotificationAdapter;
}

type ReminderFeedback =
  | { kind: 'scheduled' }
  | { kind: 'cancelled' }
  | { kind: 'permission_denied' }
  | { kind: 'invalid_date' }
  | { kind: 'error'; action: 'schedule' | 'cancel' };

export function FollowupReminderControl({
  adoptionId,
  followupId,
  dueDate,
  animalName,
  personName,
  adapter = localNotificationAdapter,
}: FollowupReminderControlProps) {
  const { t } = useTranslation();
  const [isScheduled, setIsScheduled] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [feedback, setFeedback] = useState<ReminderFeedback | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    void adapter
      .isFollowupScheduled({ adoptionId, followupId })
      .then((scheduled) => {
        if (isMounted) setIsScheduled(scheduled);
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, [adapter, adoptionId, followupId]);

  async function handleSchedule() {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsBusy(true);
    setFeedback(null);
    try {
      const permission = await adapter.requestPermission();
      if (permission !== 'granted') {
        setFeedback({ kind: 'permission_denied' });
        return;
      }

      const result = await adapter.scheduleFollowupReminder({
        adoptionId,
        followupId,
        dueDate,
        title: t('notifications.followupReminder.title', { animalName }),
        body: t('notifications.followupReminder.body', { personName }),
      });

      if (
        result.status === 'scheduled' ||
        result.status === 'already_scheduled'
      ) {
        setIsScheduled(true);
        setFeedback({ kind: 'scheduled' });
      } else if (result.status === 'permission_denied') {
        setFeedback({ kind: 'permission_denied' });
      } else if (result.status === 'invalid_date') {
        setFeedback({ kind: 'invalid_date' });
      } else {
        setFeedback({ kind: 'error', action: 'schedule' });
      }
    } catch {
      setFeedback({ kind: 'error', action: 'schedule' });
    } finally {
      busyRef.current = false;
      setIsBusy(false);
    }
  }

  async function handleCancel() {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsBusy(true);
    setFeedback(null);
    try {
      const result = await adapter.cancelFollowupReminder({
        adoptionId,
        followupId,
      });
      if (result.status === 'error') {
        setFeedback({ kind: 'error', action: 'cancel' });
      } else {
        setIsScheduled(false);
        setFeedback({ kind: 'cancelled' });
      }
    } catch {
      setFeedback({ kind: 'error', action: 'cancel' });
    } finally {
      busyRef.current = false;
      setIsBusy(false);
    }
  }

  const isErrorFeedback = feedback?.kind === 'error';
  const retryIsCancel = isErrorFeedback && feedback.action === 'cancel';

  return (
    <View style={styles.container}>
      {isScheduled ? (
        <SecondaryButton
          accessibilityLabel={t('notifications.followupReminder.cancel')}
          disabled={isBusy}
          fullWidth
          label={t('notifications.followupReminder.cancel')}
          onPress={() => void handleCancel()}
        />
      ) : (
        <SecondaryButton
          accessibilityLabel={t('notifications.followupReminder.schedule')}
          disabled={isBusy}
          fullWidth
          label={
            isBusy
              ? t('notifications.followupReminder.scheduling')
              : t('notifications.followupReminder.schedule')
          }
          onPress={() => void handleSchedule()}
        />
      )}

      {isBusy ? (
        <Text accessibilityRole="progressbar" style={styles.hint}>
          {t('notifications.followupReminder.scheduling')}
        </Text>
      ) : null}

      {feedback?.kind === 'scheduled' ? (
        <Text style={styles.success}>
          {t('notifications.followupReminder.scheduled')}
        </Text>
      ) : null}
      {feedback?.kind === 'cancelled' ? (
        <Text style={styles.hint}>
          {t('notifications.followupReminder.cancelled')}
        </Text>
      ) : null}
      {feedback?.kind === 'permission_denied' ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {t('notifications.followupReminder.permissionDenied')}
        </Text>
      ) : null}
      {feedback?.kind === 'invalid_date' ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {t('notifications.followupReminder.invalidDate')}
        </Text>
      ) : null}
      {isErrorFeedback ? (
        <View style={styles.errorRow}>
          <Text accessibilityRole="alert" style={styles.error}>
            {t('notifications.followupReminder.error')}
          </Text>
          <SecondaryButton
            accessibilityLabel={t('common.retry')}
            disabled={isBusy}
            fullWidth={false}
            label={t('common.retry')}
            onPress={() => {
              if (retryIsCancel) {
                void handleCancel();
              } else {
                void handleSchedule();
              }
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  error: {
    ...typography.meta,
    color: colors.danger,
  },
  errorRow: {
    gap: spacing.xs,
  },
  hint: {
    ...typography.meta,
    color: colors.textMuted,
  },
  success: {
    ...typography.meta,
    color: colors.primary,
  },
});
