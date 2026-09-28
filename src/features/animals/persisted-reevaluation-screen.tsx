import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, radii, spacing, typography } from '@/constants/theme';
import {
  Card,
  PrimaryButton,
  ScreenHeader,
  SecondaryButton,
  StateView,
} from '@/components/ui';
import {
  useAnimalById,
  useCompleteReevaluation,
} from '@/features/animals/persisted-animal-queries';
import type { ReevaluationNextStatus } from '@/features/animals/persisted-animal-repository';
import { useAuth } from '@/features/auth/auth-provider';

export function PersistedReevaluationScreen() {
  const { t } = useTranslation();
  const { supabase, profile } = useAuth();
  const params = useLocalSearchParams<{ animalId: string }>();
  const animalId = Array.isArray(params.animalId)
    ? params.animalId[0]
    : params.animalId;
  const shelterId = profile?.shelterId ?? null;

  const animalQuery = useAnimalById(supabase, shelterId, animalId);
  const reevaluationMutation = useCompleteReevaluation(supabase, shelterId);

  const submissionStartedRef = useRef(false);
  const [decision, setDecision] = useState<ReevaluationNextStatus | null>(null);
  const [hasMutationError, setHasMutationError] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const isSubmitting = reevaluationMutation.isPending;
  const isDisabled = isSubmitting || decision === null;

  function handleSubmit() {
    if (!animalId || isDisabled || submissionStartedRef.current) {
      return;
    }
    submissionStartedRef.current = true;
    setHasMutationError(false);
    reevaluationMutation.mutate(
      { animalId, nextStatus: decision as ReevaluationNextStatus },
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

  if (animalQuery.isLoading) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('adoptions.reevaluation.title') }} />
        <Text accessibilityRole="progressbar" style={styles.loading}>
          {t('animals.detail.loading')}
        </Text>
      </View>
    );
  }

  if (animalQuery.isError) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('adoptions.reevaluation.title') }} />
        <StateView
          description={t('animals.detail.loadErrorDescription')}
          primaryAction={{
            label: t('animals.detail.retry'),
            onPress: () => {
              void animalQuery.refetch();
            },
          }}
          title={t('animals.detail.loadErrorTitle')}
          tone="error"
        />
      </View>
    );
  }

  if (!animalQuery.data) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('adoptions.reevaluation.title') }} />
        <StateView
          description={t('adoptions.reevaluation.notFoundDescription')}
          title={t('adoptions.reevaluation.notFoundTitle')}
          tone="info"
          primaryAction={{
            label: t('animals.detail.goBack'),
            onPress: () => router.back(),
          }}
        />
      </View>
    );
  }

  if (confirmed) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('adoptions.reevaluation.title') }} />
        <StateView
          align="center"
          description={t('adoptions.reevaluation.successDescription', {
            animalName: animalQuery.data.name,
          })}
          primaryAction={{
            label: t('adoptions.reevaluation.backToAnimal'),
            onPress: () =>
              router.replace({
                pathname: '/animals/[animalId]',
                params: { animalId: animalQuery.data?.id ?? animalId ?? '' },
              }),
          }}
          title={t('adoptions.reevaluation.successTitle')}
          tone="info"
        />
      </View>
    );
  }

  if (animalQuery.data.status !== 'REEVALUATION') {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('adoptions.reevaluation.title') }} />
        <StateView
          description={t('adoptions.reevaluation.invalidStateDescription')}
          title={t('adoptions.reevaluation.invalidStateTitle')}
          tone="info"
          primaryAction={{
            label: t('animals.detail.goBack'),
            onPress: () => router.back(),
          }}
        />
      </View>
    );
  }

  const animalName = animalQuery.data.name;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: t('adoptions.reevaluation.title') }} />

      <View style={styles.header}>
        <ScreenHeader
          subtitle={t('adoptions.reevaluation.subtitle', { animalName })}
          title={t('adoptions.reevaluation.title')}
        />
      </View>

      <View style={styles.section}>
        <Card padding="comfortable" variant="elevated">
          <Text style={styles.contextCopy}>
            {t('adoptions.reevaluation.context')}
          </Text>

          <View style={styles.options}>
            <DecisionOption
              accessibilityLabel={t(
                'adoptions.reevaluation.options.ready.label',
              )}
              description={t(
                'adoptions.reevaluation.options.ready.description',
              )}
              isSelected={decision === 'READY'}
              label={t('adoptions.reevaluation.options.ready.label')}
              onPress={() => setDecision('READY')}
              tone="ready"
            />
            <DecisionOption
              accessibilityLabel={t(
                'adoptions.reevaluation.options.notAvailable.label',
              )}
              description={t(
                'adoptions.reevaluation.options.notAvailable.description',
              )}
              isSelected={decision === 'NOT_AVAILABLE'}
              label={t('adoptions.reevaluation.options.notAvailable.label')}
              onPress={() => setDecision('NOT_AVAILABLE')}
              tone="notAvailable"
            />
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Card padding="comfortable" variant="subtle">
          <Text style={styles.warning}>
            {t('adoptions.reevaluation.warning')}
          </Text>
        </Card>
      </View>

      {decision === null && !isSubmitting ? (
        <Text accessibilityRole="alert" style={styles.hint}>
          {t('adoptions.reevaluation.missingDecision')}
        </Text>
      ) : null}
      {hasMutationError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {t('adoptions.reevaluation.error')}
        </Text>
      ) : null}

      <View style={styles.actionStack}>
        <PrimaryButton
          accessibilityLabel={t('adoptions.reevaluation.submit')}
          disabled={isDisabled}
          fullWidth
          label={
            isSubmitting
              ? t('adoptions.reevaluation.submitting')
              : t('adoptions.reevaluation.submit')
          }
          loading={isSubmitting}
          onPress={handleSubmit}
        />
        <SecondaryButton
          accessibilityLabel={t('adoptions.reevaluation.cancel')}
          disabled={isSubmitting}
          fullWidth
          label={t('adoptions.reevaluation.cancel')}
          onPress={() => router.back()}
        />
      </View>
    </ScrollView>
  );
}

type DecisionTone = 'ready' | 'notAvailable';

const toneStyles: Record<DecisionTone, { background: string; border: string }> =
  {
    notAvailable: {
      background: colors.surfaceMuted,
      border: colors.border,
    },
    ready: {
      background: colors.primarySoft,
      border: colors.primary,
    },
  };

function DecisionOption({
  accessibilityLabel,
  description,
  isSelected,
  label,
  onPress,
  tone,
}: {
  accessibilityLabel: string;
  description: string;
  isSelected: boolean;
  label: string;
  onPress: () => void;
  tone: DecisionTone;
}) {
  const palette = toneStyles[tone];
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
        pressed && styles.optionPressed,
      ]}
    >
      <View accessible={false} style={styles.optionHeader}>
        <View
          style={[styles.optionRadio, isSelected && styles.optionRadioSelected]}
        >
          {isSelected ? <View style={styles.optionRadioMark} /> : null}
        </View>
        <Text
          style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}
        >
          {label}
        </Text>
      </View>
      <Text
        style={[
          styles.optionDescription,
          isSelected && styles.optionDescriptionSelected,
        ]}
      >
        {description}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionStack: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  container: {
    backgroundColor: colors.background,
    flexGrow: 1,
    paddingBottom: spacing['3xl'],
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  contextCopy: {
    ...typography.body,
    color: colors.text,
  },
  error: {
    ...typography.body,
    color: colors.danger,
    marginTop: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  hint: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  loading: {
    ...typography.body,
    color: colors.textMuted,
    padding: spacing.lg,
  },
  option: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    padding: spacing.md,
  },
  optionDescription: {
    ...typography.body,
    color: colors.textMuted,
  },
  optionDescriptionSelected: {
    color: colors.text,
  },
  optionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionLabel: {
    ...typography.bodyStrong,
    color: colors.text,
    flex: 1,
  },
  optionLabelSelected: {
    color: colors.primary,
  },
  optionPressed: {
    opacity: 0.85,
  },
  optionRadio: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  optionRadioMark: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    height: 10,
    width: 10,
  },
  optionRadioSelected: {
    borderColor: colors.primary,
  },
  options: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  section: {
    marginTop: spacing.md,
  },
  stateContainer: {
    backgroundColor: colors.background,
    flex: 1,
  },
  warning: {
    ...typography.body,
    color: colors.text,
  },
});
