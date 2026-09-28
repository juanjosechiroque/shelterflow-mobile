import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, spacing, typography } from '@/constants/theme';

import type { MockCandidateDetail } from '@/features/candidates/types';
import { CandidateStatusBadge } from './candidate-status-badge';

interface CandidateRowProps {
  candidate: MockCandidateDetail;
}

export function CandidateRow({ candidate }: CandidateRowProps) {
  const { t } = useTranslation();

  return (
    <Link
      href={{
        pathname: '/animals/candidate/[candidateId]',
        params: { candidateId: candidate.id },
      }}
      asChild
    >
      <Pressable
        accessibilityLabel={t('animals.candidates.rowAccessibility', {
          name: candidate.person.name,
        })}
        accessibilityRole="button"
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <View style={styles.identity}>
          <View style={styles.initials}>
            <Text style={styles.initialsText}>
              {candidate.person.name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{candidate.person.name}</Text>
        </View>
        <CandidateStatusBadge status={candidate.status} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  identity: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: spacing.sm,
  },
  initials: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  initialsText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  name: {
    ...typography.bodyStrong,
    color: colors.text,
    flex: 1,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowPressed: {
    opacity: 0.7,
  },
});
