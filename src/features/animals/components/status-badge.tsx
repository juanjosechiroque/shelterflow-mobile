import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';

import { getAnimalStatusLabel } from '../presenters';
import type { AnimalStatus } from '../types';

interface StatusBadgeProps {
  status: AnimalStatus;
}

const toneStyles: Record<
  AnimalStatus,
  { backgroundColor: string; color: string }
> = {
  ADOPTED: { backgroundColor: colors.infoSoft, color: colors.info },
  IN_PROCESS: { backgroundColor: colors.warningSoft, color: colors.warning },
  NOT_AVAILABLE: {
    backgroundColor: colors.surfaceMuted,
    color: colors.textMuted,
  },
  PREPARING: { backgroundColor: colors.surfaceMuted, color: colors.textMuted },
  READY: { backgroundColor: colors.primarySoft, color: colors.primary },
  REEVALUATION: {
    backgroundColor: colors.warningSoft,
    color: colors.warning,
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();
  const tone = toneStyles[status];

  return (
    <View style={[styles.badge, { backgroundColor: tone.backgroundColor }]}>
      <Text style={[styles.label, { color: tone.color }]}>
        {getAnimalStatusLabel(t, status)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
