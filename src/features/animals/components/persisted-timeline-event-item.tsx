import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, spacing, typography } from '@/constants/theme';
import { formatDate } from '@/i18n/format';

import type { PersistedTimelineEvent } from '../persisted-animal-repository';
import { getPersistedTimelineEventLabel } from '../persisted-timeline-presenter';

interface PersistedTimelineEventItemProps {
  animalName: string;
  event: PersistedTimelineEvent;
  isLast: boolean;
}

export function PersistedTimelineEventItem({
  animalName,
  event,
  isLast,
}: PersistedTimelineEventItemProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.item}>
      <View style={styles.markerColumn}>
        <View style={styles.dot} />
        {isLast ? null : <View style={styles.line} />}
      </View>
      <View style={[styles.content, isLast && styles.contentLast]}>
        <Text style={styles.date}>
          {formatDate(new Date(event.occurredAt), {
            dateStyle: 'medium',
          })}
        </Text>
        <Text style={styles.label}>
          {getPersistedTimelineEventLabel(t, event, animalName)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  contentLast: {
    paddingBottom: 0,
  },
  date: {
    ...typography.metaStrong,
    color: colors.textSubtle,
    textTransform: 'uppercase',
  },
  dot: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    height: 8,
    marginTop: 6,
    width: 8,
  },
  item: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  label: {
    ...typography.bodyStrong,
    color: colors.text,
    marginTop: spacing['2xs'],
  },
  line: {
    backgroundColor: colors.border,
    flex: 1,
    marginTop: spacing['2xs'],
    width: 2,
  },
  markerColumn: {
    alignItems: 'center',
    width: 10,
  },
});
