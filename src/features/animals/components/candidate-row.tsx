import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';

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
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  chevron: {
    color: colors.textMuted,
    fontSize: 24,
  },
  identity: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    paddingRight: 12,
  },
  initials: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  initialsText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  name: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    minHeight: 56,
  },
  rowPressed: {
    opacity: 0.7,
  },
});
