import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';
import {
  useAdoptionDecisionCandidate,
  useConfirmAdoption,
} from '@/features/adoptions/adoption-queries';
import { useAuth } from '@/features/auth/auth-provider';
import { getCandidateStatusLabel } from '@/features/animals/presenters';
import type { CandidateStatus } from '@/features/animals/types';

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDefaultFollowupDates(today = new Date()): {
  adoptionDate: string;
  followupDueDates: string[];
} {
  const adoption = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const afterDays = (days: number) => {
    const dueDate = new Date(adoption);
    dueDate.setDate(dueDate.getDate() + days);
    return localDateString(dueDate);
  };

  return {
    adoptionDate: localDateString(adoption),
    followupDueDates: [afterDays(7), afterDays(30), afterDays(60)],
  };
}

export function PersistedAdoptionConfirmationScreen() {
  const { t } = useTranslation();
  const { supabase, profile } = useAuth();
  const params = useLocalSearchParams<{ candidateId: string }>();
  const candidateId = Array.isArray(params.candidateId)
    ? params.candidateId[0]
    : params.candidateId;
  const shelterId = profile?.shelterId ?? null;
  const candidateQuery = useAdoptionDecisionCandidate(
    supabase,
    shelterId,
    candidateId,
  );
  const confirmMutation = useConfirmAdoption(supabase, shelterId);
  const submissionStartedRef = useRef(false);
  const [hasMutationError, setHasMutationError] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const candidate = candidateQuery.data;
  const isDecisionPending = candidate?.status === 'DECISION_PENDING';
  const isSubmitting = confirmMutation.isPending;

  function handleConfirm() {
    if (!candidateId || !isDecisionPending || submissionStartedRef.current) {
      return;
    }

    submissionStartedRef.current = true;
    setHasMutationError(false);
    const dates = getDefaultFollowupDates();

    confirmMutation.mutate(
      {
        candidateId,
        adoptionDate: dates.adoptionDate,
        handoverNotes: null,
        followupDueDates: dates.followupDueDates,
      },
      {
        onError: () => {
          submissionStartedRef.current = false;
          setHasMutationError(true);
        },
        onSuccess: () => {
          setConfirmed(true);
        },
      },
    );
  }

  if (candidateQuery.isLoading) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('adoptions.persisted.title') }} />
        <Text accessibilityRole="progressbar" style={styles.stateText}>
          {t('adoptions.persisted.loading')}
        </Text>
      </View>
    );
  }

  if (candidateQuery.isError) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('adoptions.persisted.title') }} />
        <Text accessibilityRole="header" style={styles.title}>
          {t('adoptions.persisted.loadErrorTitle')}
        </Text>
        <Text style={styles.stateText}>
          {t('adoptions.persisted.loadErrorDescription')}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void candidateQuery.refetch();
          }}
          style={({ pressed }) => [
            styles.confirmButton,
            pressed && styles.confirmButtonPressed,
          ]}
        >
          <Text style={styles.confirmButtonText}>
            {t('adoptions.persisted.retry')}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!candidate) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('adoptions.persisted.title') }} />
        <Text accessibilityRole="header" style={styles.title}>
          {t('adoptions.persisted.notFoundTitle')}
        </Text>
        <Text style={styles.stateText}>
          {t('adoptions.persisted.notFoundDescription')}
        </Text>
      </View>
    );
  }

  if (confirmed) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('adoptions.persisted.title') }} />
        <Text accessibilityRole="alert" style={styles.successTitle}>
          {t('adoptions.persisted.successTitle')}
        </Text>
        <Text style={styles.successDescription}>
          {t('adoptions.persisted.successDescription')}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/')}
          style={({ pressed }) => [
            styles.confirmButton,
            pressed && styles.confirmButtonPressed,
          ]}
        >
          <Text style={styles.confirmButtonText}>
            {t('adoptions.persisted.backToToday')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: t('adoptions.persisted.title') }} />
      <Text accessibilityRole="header" style={styles.title}>
        {t('adoptions.persisted.title')}
      </Text>
      <Text style={styles.subtitle}>
        {t('adoptions.persisted.subtitle', {
          personName: candidate.personName,
          animalName: candidate.animal.name,
        })}
      </Text>

      <View style={styles.card}>
        <SummaryRow
          label={t('adoptions.persisted.status')}
          value={
            isDecisionPending
              ? t('adoptions.persisted.decisionPending')
              : getCandidateStatusLabel(t, candidate.status as CandidateStatus)
          }
        />
        <SummaryRow
          label={t('adoptions.persisted.candidate')}
          value={candidate.personName}
        />
        <SummaryRow
          label={t('adoptions.persisted.animal')}
          value={candidate.animal.name}
        />
      </View>

      {!isDecisionPending ? (
        <Text accessibilityRole="alert" style={styles.unavailableText}>
          {t('adoptions.persisted.unavailable')}
        </Text>
      ) : null}
      {hasMutationError ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {t('adoptions.persisted.error')}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !isDecisionPending || isSubmitting }}
        disabled={!isDecisionPending || isSubmitting}
        onPress={handleConfirm}
        style={({ pressed }) => [
          styles.confirmButton,
          (!isDecisionPending || isSubmitting) && styles.confirmButtonDisabled,
          pressed && styles.confirmButtonPressed,
        ]}
      >
        <Text style={styles.confirmButtonText}>
          {isSubmitting
            ? t('adoptions.persisted.confirming')
            : t('adoptions.persisted.confirm')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 24,
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
    flexGrow: 1,
    padding: 20,
    paddingBottom: 48,
  },
  errorText: {
    color: colors.danger,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 16,
  },
  stateContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  stateText: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
  },
  successDescription: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
    textAlign: 'center',
  },
  successTitle: {
    color: colors.text,
    fontSize: 23,
    fontWeight: '900',
    textAlign: 'center',
  },
  summaryLabel: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 14,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  summaryValue: {
    color: colors.text,
    flex: 2,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'right',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  unavailableText: {
    color: colors.warning,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 16,
  },
});
