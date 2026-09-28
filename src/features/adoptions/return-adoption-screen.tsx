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
  useReturnAdoption,
} from '@/features/adoptions/active-adoption-queries';
import { useAuth } from '@/features/auth/auth-provider';

export function ReturnAdoptionScreen() {
  const { t } = useTranslation();
  const { supabase, profile } = useAuth();
  const params = useLocalSearchParams<{ adoptionId: string }>();
  const adoptionId = Array.isArray(params.adoptionId)
    ? params.adoptionId[0]
    : params.adoptionId;
  const shelterId = profile?.shelterId ?? null;

  const adoptionQuery = useAdoptionById(supabase, shelterId, adoptionId);
  const returnMutation = useReturnAdoption(supabase, shelterId);

  const submissionStartedRef = useRef(false);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [hasMutationError, setHasMutationError] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const trimmedReason = reason.trim();
  const isReasonValid = trimmedReason.length > 0;
  const isDisabled =
    returnMutation.isPending || !isReasonValid || !acknowledged;

  const adoption = adoptionQuery.data;
  const personName = adoption?.candidate.person.name ?? '';
  const animalName = adoption?.animal.name ?? '';

  function handleSubmit() {
    if (!adoptionId || isDisabled || submissionStartedRef.current) {
      return;
    }
    submissionStartedRef.current = true;
    setHasMutationError(false);
    returnMutation.mutate(
      {
        adoptionId,
        reason: trimmedReason,
        notes: notes.trim().length > 0 ? notes.trim() : null,
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

  if (adoptionQuery.isLoading) {
    return <Stack.Screen options={{ title: t('adoptions.return.title') }} />;
  }

  if (adoptionQuery.isError) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('adoptions.return.title') }} />
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
        <Stack.Screen options={{ title: t('adoptions.return.title') }} />
        <StateView
          description={t('adoptions.detail.notFoundDescription')}
          title={t('adoptions.detail.notFoundTitle')}
          tone="info"
        />
      </View>
    );
  }

  if (confirmed) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('adoptions.return.title') }} />
        <StateView
          align="center"
          description={t('adoptions.return.successDescription')}
          primaryAction={{
            label: t('adoptions.return.backToAdoption'),
            onPress: () =>
              router.replace({
                pathname: '/adoptions/[adoptionId]',
                params: { adoptionId },
              }),
          }}
          title={t('adoptions.return.successTitle')}
          tone="info"
        />
      </View>
    );
  }

  if (adoption.status !== 'ACTIVE') {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('adoptions.return.title') }} />
        <StateView
          description={t('adoptions.return.successDescription')}
          title={t('adoptions.return.successTitle')}
          tone="info"
          primaryAction={{
            label: t('adoptions.return.backToAdoption'),
            onPress: () =>
              router.replace({
                pathname: '/adoptions/[adoptionId]',
                params: { adoptionId },
              }),
          }}
        />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: t('adoptions.return.title') }} />

      <View style={styles.header}>
        <ScreenHeader
          subtitle={t('adoptions.return.subtitle', {
            personName,
            animalName,
          })}
          title={t('adoptions.return.title')}
        />
      </View>

      <View style={styles.section}>
        <Card padding="comfortable" variant="elevated">
          <Text style={styles.fieldLabel}>{t('adoptions.return.reason')}</Text>
          <TextInput
            accessibilityLabel={t('adoptions.return.reason')}
            editable={!returnMutation.isPending}
            multiline
            onChangeText={setReason}
            placeholder={t('adoptions.return.reasonPlaceholder')}
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
            value={reason}
          />

          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>{t('adoptions.return.notes')}</Text>
          <TextInput
            accessibilityLabel={t('adoptions.return.notes')}
            editable={!returnMutation.isPending}
            multiline
            onChangeText={setNotes}
            placeholder={t('adoptions.return.notesPlaceholder')}
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
            value={notes}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Card padding="comfortable" variant="subtle">
          <Text style={styles.warning}>{t('adoptions.return.warning')}</Text>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acknowledged }}
            disabled={returnMutation.isPending}
            onPress={() => setAcknowledged((value) => !value)}
            style={({ pressed }) => [
              styles.acknowledgementRow,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[styles.checkbox, acknowledged && styles.checkboxChecked]}
            >
              {acknowledged ? <Text style={styles.checkboxMark}>✓</Text> : null}
            </View>
            <Text style={styles.acknowledgementLabel}>
              {t('adoptions.return.acknowledgement')}
            </Text>
          </Pressable>
        </Card>
      </View>

      {!isReasonValid && !returnMutation.isPending ? (
        <Text accessibilityRole="alert" style={styles.hint}>
          {t('adoptions.return.missingReason')}
        </Text>
      ) : null}
      {!acknowledged && !returnMutation.isPending ? (
        <Text accessibilityRole="alert" style={styles.hint}>
          {t('adoptions.return.missingAcknowledgement')}
        </Text>
      ) : null}
      {hasMutationError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {t('adoptions.return.error')}
        </Text>
      ) : null}

      <View style={styles.actionStack}>
        <PrimaryButton
          accessibilityLabel={t('adoptions.return.submit')}
          disabled={isDisabled}
          fullWidth
          label={
            returnMutation.isPending
              ? t('adoptions.return.submitting')
              : t('adoptions.return.submit')
          }
          loading={returnMutation.isPending}
          onPress={handleSubmit}
        />
        <SecondaryButton
          accessibilityLabel={t('adoptions.return.cancel')}
          disabled={returnMutation.isPending}
          fullWidth
          label={t('adoptions.return.cancel')}
          onPress={() => router.back()}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  acknowledgementLabel: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  acknowledgementRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionStack: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  checkbox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxMark: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '900',
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
  pressed: {
    opacity: 0.78,
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
