import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';
import { formatDate } from '@/i18n/format';

import { getTimelineEventLabel, parseOccurredOn } from '../presenters';
import type { MockTimelineEvent } from '../types';

interface TimelineEventItemProps {
  animalName: string;
  event: MockTimelineEvent;
  isLast: boolean;
}

export function TimelineEventItem({
  animalName,
  event,
  isLast,
}: TimelineEventItemProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.item}>
      <View style={styles.markerColumn}>
        <View style={styles.dot} />
        {isLast ? null : <View style={styles.line} />}
      </View>
      <View style={[styles.content, isLast && styles.contentLast]}>
        <Text style={styles.date}>
          {formatDate(parseOccurredOn(event.occurredOn), {
            dateStyle: 'medium',
          })}
        </Text>
        <Text style={styles.label}>
          {getTimelineEventLabel(t, event, animalName)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingBottom: 18,
  },
  contentLast: {
    paddingBottom: 0,
  },
  date: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  dot: {
    backgroundColor: colors.primary,
    borderRadius: 5,
    height: 10,
    marginTop: 4,
    width: 10,
  },
  item: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: 4,
  },
  line: {
    backgroundColor: colors.border,
    flex: 1,
    marginTop: 4,
    width: 2,
  },
  markerColumn: {
    alignItems: 'center',
    width: 10,
  },
});
