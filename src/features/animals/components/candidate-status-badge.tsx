import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';

import { getCandidateStatusLabel } from '../presenters';
import type { CandidateStatus } from '../types';

const toneStyles: Record<
  CandidateStatus,
  { backgroundColor: string; color: string }
> = {
  CONTACT_PENDING: {
    backgroundColor: colors.primarySoft,
    color: colors.primary,
  },
  DECISION_PENDING: {
    backgroundColor: colors.warningSoft,
    color: colors.warning,
  },
  EVALUATED: { backgroundColor: colors.primarySoft, color: colors.primary },
  MEETING_SCHEDULED: { backgroundColor: colors.infoSoft, color: colors.info },
  NEEDS_EVALUATION: {
    backgroundColor: colors.warningSoft,
    color: colors.warning,
  },
  NOT_SELECTED: {
    backgroundColor: colors.surfaceMuted,
    color: colors.textMuted,
  },
  SELECTED: { backgroundColor: colors.infoSoft, color: colors.info },
  WITHDRAWN: {
    backgroundColor: colors.surfaceMuted,
    color: colors.textMuted,
  },
};

interface CandidateStatusBadgeProps {
  status: CandidateStatus;
}

export function CandidateStatusBadge({ status }: CandidateStatusBadgeProps) {
  const { t } = useTranslation();
  const tone = toneStyles[status];

  return (
    <View style={[styles.badge, { backgroundColor: tone.backgroundColor }]}>
      <Text style={[styles.label, { color: tone.color }]}>
        {getCandidateStatusLabel(t, status)}
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
