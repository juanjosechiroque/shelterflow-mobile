import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
  useAdoptionById,
  useCompleteFollowup,
} from '@/features/adoptions/active-adoption-queries';
import { useAuth } from '@/features/auth/auth-provider';
import {
  followupOutcomes,
  getFollowupOutcomeLabel,
  type FollowupOutcome,
} from '@/features/adoptions/labels';

export function CompleteFollowupScreen() {
  const { t } = useTranslation();
  const { supabase, profile } = useAuth();
  const params = useLocalSearchParams<{
    adoptionId: string;
    followupId: string;
  }>();
  const adoptionId = Array.isArray(params.adoptionId)
    ? params.adoptionId[0]
    : params.adoptionId;
  const followupId = Array.isArray(params.followupId)
    ? params.followupId[0]
    : params.followupId;
  const shelterId = profile?.shelterId ?? null;

  const adoptionQuery = useAdoptionById(supabase, shelterId, adoptionId);
  const completeMutation = useCompleteFollowup(supabase, shelterId);

  const submissionStartedRef = useRef(false);
  const [outcome, setOutcome] = useState<FollowupOutcome | null>(null);
  const [notes, setNotes] = useState('');
  const [hasMutationError, setHasMutationError] = useState(false);

  const isSubmitting = completeMutation.isPending;
  const isDisabled = isSubmitting || outcome === null;

  const adoption = adoptionQuery.data;
  const personName = adoption?.candidate.person.name ?? '';
  const animalName = adoption?.animal.name ?? '';

  function handleSubmit() {
    if (
      !adoptionId ||
      !followupId ||
      outcome === null ||
      submissionStartedRef.current
    ) {
      return;
    }
    submissionStartedRef.current = true;
    setHasMutationError(false);
    completeMutation.mutate(
      {
        adoptionId,
        followupId,
        outcome,
        notes: notes.trim().length > 0 ? notes.trim() : null,
      },
      {
        onError: () => {
          submissionStartedRef.current = false;
          setHasMutationError(true);
        },
        onSuccess: () => {
          router.replace({
            pathname: '/adoptions/[adoptionId]',
            params: { adoptionId },
          });
        },
      },
    );
  }

  if (adoptionQuery.isLoading) {
    return (
      <Stack.Screen
        options={{ title: t('adoptions.completeFollowup.title') }}
      />
    );
  }

  if (adoptionQuery.isError) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen
          options={{ title: t('adoptions.completeFollowup.title') }}
        />
        <StateView
          description={t('adoptions.detail.loadErrorDescription')}
          primaryAction={{
            label: t('adoptions.detail.retry'),
            onPress: () => {
              void adoptionQuery.refetch();
            },
          }}
          title={t('adoptions.detail.loadErrorTitle')}
          tone="error"
        />
      </View>
    );
  }

  if (!adoption) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen
          options={{ title: t('adoptions.completeFollowup.title') }}
        />
        <StateView
          description={t('adoptions.completeFollowup.notFoundDescription')}
          title={t('adoptions.completeFollowup.notFoundTitle')}
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
      <Stack.Screen
        options={{ title: t('adoptions.completeFollowup.title') }}
      />

      <View style={styles.header}>
        <ScreenHeader
          subtitle={t('adoptions.completeFollowup.subtitle', {
            personName,
            animalName,
          })}
          title={t('adoptions.completeFollowup.title')}
        />
      </View>

      <View style={styles.section}>
        <Card padding="comfortable" variant="elevated">
          <Text style={styles.fieldLabel}>
            {t('adoptions.completeFollowup.outcome')}
          </Text>
          <View style={styles.outcomeList}>
            {followupOutcomes.map((value) => {
              const isSelected = outcome === value;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  key={value}
                  onPress={() => setOutcome(value)}
                  style={({ pressed }) => [
                    styles.outcomeOption,
                    isSelected && styles.outcomeOptionSelected,
                    pressed && !isSelected && styles.outcomeOptionPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.outcomeOptionLabel,
                      isSelected && styles.outcomeOptionLabelSelected,
                    ]}
                  >
                    {getFollowupOutcomeLabel(t, value)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>
            {t('adoptions.completeFollowup.notes')}
          </Text>
          <TextInput
            accessibilityLabel={t('adoptions.completeFollowup.notes')}
            editable={!isSubmitting}
            multiline
            onChangeText={setNotes}
            placeholder={t('adoptions.completeFollowup.notesPlaceholder')}
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
            value={notes}
          />
        </Card>
      </View>

      {outcome === null && !isSubmitting ? (
        <Text accessibilityRole="alert" style={styles.hint}>
          {t('adoptions.completeFollowup.missingOutcome')}
        </Text>
      ) : null}
      {hasMutationError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {t('adoptions.completeFollowup.error')}
        </Text>
      ) : null}

      <View style={styles.actionStack}>
        <PrimaryButton
          accessibilityLabel={t('adoptions.completeFollowup.submit')}
          disabled={isDisabled}
          fullWidth
          label={
            isSubmitting
              ? t('adoptions.completeFollowup.submitting')
              : t('adoptions.completeFollowup.submit')
          }
          loading={isSubmitting}
          onPress={handleSubmit}
        />
        <SecondaryButton
          accessibilityLabel={t('adoptions.completeFollowup.cancel')}
          disabled={isSubmitting}
          fullWidth
          label={t('adoptions.completeFollowup.cancel')}
          onPress={() => router.back()}
        />
      </View>
    </ScrollView>
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
  divider: {
    backgroundColor: colors.borderSubtle,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },
  error: {
    ...typography.body,
    color: colors.danger,
    marginTop: spacing.md,
  },
  fieldLabel: {
    ...typography.metaStrong,
    color: colors.textSubtle,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  header: {
    marginBottom: spacing.lg,
  },
  hint: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    color: colors.text,
    fontSize: 15,
    minHeight: 96,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  outcomeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  outcomeOption: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  outcomeOptionLabel: {
    ...typography.metaStrong,
    color: colors.textMuted,
    textTransform: 'none',
  },
  outcomeOptionLabelSelected: {
    color: colors.onPrimary,
  },
  outcomeOptionPressed: {
    backgroundColor: colors.surfaceSunken,
  },
  outcomeOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  section: {
    marginTop: spacing.md,
  },
  stateContainer: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
