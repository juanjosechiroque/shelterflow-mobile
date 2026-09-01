import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';
import { formatDate } from '@/i18n/format';
import { CandidateStatusBadge } from '@/features/animals/components/candidate-status-badge';
import { getMockAnimalById } from '@/features/animals/mock-animals';
import {
  getCandidateStatusLabel,
  parseOccurredOn,
} from '@/features/animals/presenters';
import { getCandidateDetailById } from '@/features/candidates/mock-candidates';

export function AdoptionConfirmationScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ candidateId: string }>();
  const candidateId = Array.isArray(params.candidateId)
    ? params.candidateId[0]
    : params.candidateId;
  const candidate = getCandidateDetailById(candidateId);
  const animal = candidate ? getMockAnimalById(candidate.animalId) : undefined;

  const [confirmed, setConfirmed] = useState(false);

  const canConfirm = candidate?.status === 'DECISION_PENDING' && !confirmed;

  function handleConfirm() {
    setConfirmed(true);
  }

  if (!candidate || !animal) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('adoptions.confirm.title') }} />
        <Text accessibilityRole="header" style={styles.title}>
          {t('adoptions.notFoundTitle')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: t('adoptions.confirm.title') }} />

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{t('adoptions.confirm.headline')}</Text>
        <Text style={styles.heroSubtitle}>
          {t('adoptions.confirm.subtitle', {
            personName: candidate.person.name,
            animalName: animal.name,
          })}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {t('adoptions.confirm.animal')}
          </Text>
          <Text style={styles.summaryValue}>{animal.name}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {t('adoptions.confirm.candidate')}
          </Text>
          <Text style={styles.summaryValue}>{candidate.person.name}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {t('adoptions.confirm.candidateStatus')}
          </Text>
          <CandidateStatusBadge status={candidate.status} />
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {t('adoptions.confirm.appliedOn')}
          </Text>
          <Text style={styles.summaryValue}>
            {formatDate(parseOccurredOn(candidate.applicationDate), {
              dateStyle: 'medium',
            })}
          </Text>
        </View>
      </View>

      <View style={styles.warningCard}>
        <Text style={styles.warningText}>{t('adoptions.confirm.warning')}</Text>
      </View>

      {confirmed ? (
        <View style={styles.successCard}>
          <Text accessibilityRole="alert" style={styles.successTitle}>
            {t('adoptions.confirm.successTitle')}
          </Text>
          <Text style={styles.successText}>
            {t('adoptions.confirm.successDescription')}
          </Text>
          <Link href="/animals" asChild>
            <Pressable accessibilityRole="button" style={styles.doneButton}>
              <Text style={styles.doneButtonText}>
                {t('adoptions.confirm.done')}
              </Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canConfirm }}
          disabled={!canConfirm}
          onPress={handleConfirm}
          style={({ pressed }) => [
            styles.confirmButton,
            !canConfirm && styles.confirmButtonDisabled,
            pressed && styles.confirmButtonPressed,
          ]}
        >
          <Text style={styles.confirmButtonText}>
            {canConfirm
              ? t('adoptions.confirm.action')
              : t('adoptions.confirm.unavailable', {
                  status: getCandidateStatusLabel(t, candidate.status),
                })}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
  },
  confirmButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 54,
    paddingHorizontal: 20,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  confirmButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  confirmButtonText: {
    color: colors.surface,
    fontSize: 17,
    fontWeight: '900',
  },
  container: {
    backgroundColor: colors.background,
    padding: 20,
    paddingBottom: 48,
  },
  doneButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 50,
    paddingHorizontal: 20,
  },
  doneButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  hero: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    marginTop: 4,
    padding: 18,
  },
  heroSubtitle: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 6,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  stateContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  successCard: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 24,
    padding: 20,
  },
  successText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
  },
  successTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 14,
    flex: 1,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    flex: 2,
    textAlign: 'right',
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  warningCard: {
    backgroundColor: colors.warningSoft,
    borderRadius: 14,
    marginTop: 18,
    padding: 16,
  },
  warningText: {
    color: colors.warning,
    fontSize: 14,
    lineHeight: 21,
  },
});
