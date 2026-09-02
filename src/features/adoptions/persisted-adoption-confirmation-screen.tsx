import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, spacing, typography } from '@/constants/theme';
import { Card, PrimaryButton, ScreenHeader, StateView } from '@/components/ui';
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
  const [confirmedAdoptionId, setConfirmedAdoptionId] = useState<string | null>(
    null,
  );

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
        onSuccess: (adoptionId) => {
          setConfirmedAdoptionId(adoptionId);
        },
      },
    );
  }

  if (candidateQuery.isLoading) {
    return <Stack.Screen options={{ title: t('adoptions.persisted.title') }} />;
  }

  if (candidateQuery.isError) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('adoptions.persisted.title') }} />
        <StateView
          description={t('adoptions.persisted.loadErrorDescription')}
          primaryAction={{
            label: t('adoptions.persisted.retry'),
            onPress: () => {
              void candidateQuery.refetch();
            },
          }}
          title={t('adoptions.persisted.loadErrorTitle')}
          tone="error"
        />
      </View>
    );
  }

  if (!candidate) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('adoptions.persisted.title') }} />
        <StateView
          description={t('adoptions.persisted.notFoundDescription')}
          title={t('adoptions.persisted.notFoundTitle')}
          tone="info"
        />
      </View>
    );
  }

  if (confirmedAdoptionId) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('adoptions.persisted.title') }} />
        <StateView
          align="center"
          description={t('adoptions.persisted.successDescription')}
          primaryAction={{
            label: t('adoptions.persisted.viewAdoption'),
            onPress: () =>
              router.replace({
                pathname: '/adoptions/[adoptionId]',
                params: { adoptionId: confirmedAdoptionId },
              }),
          }}
          secondaryAction={{
            label: t('adoptions.persisted.backToToday'),
            onPress: () => router.replace('/'),
          }}
          title={t('adoptions.persisted.successTitle')}
          tone="info"
        />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: t('adoptions.persisted.title') }} />
      <View style={styles.header}>
        <ScreenHeader
          subtitle={t('adoptions.persisted.subtitle', {
            personName: candidate.personName,
            animalName: candidate.animal.name,
          })}
          title={t('adoptions.persisted.title')}
        />
      </View>

      <View style={styles.section}>
        <Card padding="comfortable" variant="elevated">
          <SummaryRow
            label={t('adoptions.persisted.animal')}
            value={candidate.animal.name}
          />
          <View style={styles.divider} />
          <SummaryRow
            label={t('adoptions.persisted.candidate')}
            value={candidate.personName}
          />
          <View style={styles.divider} />
          <SummaryRow
            label={t('adoptions.persisted.status')}
            value={
              isDecisionPending
                ? t('adoptions.persisted.decisionPending')
                : getCandidateStatusLabel(
                    t,
                    candidate.status as CandidateStatus,
                  )
            }
          />
        </Card>
      </View>

      {!isDecisionPending ? (
        <Text accessibilityRole="alert" style={styles.warningText}>
          {t('adoptions.persisted.unavailable')}
        </Text>
      ) : null}
      {hasMutationError ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {t('adoptions.persisted.error')}
        </Text>
      ) : null}

      <View style={styles.actionWrapper}>
        <PrimaryButton
          accessibilityLabel={t('adoptions.persisted.confirm')}
          disabled={!isDecisionPending || isSubmitting}
          fullWidth
          label={
            isSubmitting
              ? t('adoptions.persisted.confirming')
              : t('adoptions.persisted.confirm')
          }
          loading={isSubmitting}
          onPress={handleConfirm}
        />
      </View>
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
  actionWrapper: {
    marginTop: spacing.lg,
  },
  container: {
    backgroundColor: colors.background,
    flexGrow: 1,
    paddingBottom: spacing['3xl'],
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  divider: {
    backgroundColor: colors.borderSubtle,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    marginTop: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  section: {
    marginTop: spacing.md,
  },
  stateContainer: {
    backgroundColor: colors.background,
    flex: 1,
  },
  summaryLabel: {
    ...typography.metaStrong,
    color: colors.textSubtle,
    flex: 1,
    textTransform: 'uppercase',
  },
  summaryRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  summaryValue: {
    ...typography.bodyStrong,
    color: colors.text,
    flex: 2,
    textAlign: 'right',
  },
  warningText: {
    ...typography.body,
    color: colors.warning,
    marginTop: spacing.md,
  },
});
