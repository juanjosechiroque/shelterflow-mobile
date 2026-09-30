import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/features/auth/auth-provider';

import { colors } from '@/constants/theme';
import { CandidateStatusBadge } from '@/features/animals/components/candidate-status-badge';
import {
  getAnimalSexLabel,
  getAnimalSizeLabel,
  getAnimalSpeciesLabel,
  getCandidateStatusLabel,
} from '@/features/animals/presenters';
import { getCandidateSourceLabel } from '@/features/candidates/presenters';
import { formatDate } from '@/i18n/format';

import { useCandidateById } from './candidate-queries';
import {
  useBridgeEvaluatedToContactPending,
  useMarkDecisionPending,
} from './candidate-mutations';

export function CandidateScreen() {
  const { t } = useTranslation();
  const { supabase, profile } = useAuth();

  const params = useLocalSearchParams<{ candidateId: string }>();
  const candidateId = Array.isArray(params.candidateId)
    ? params.candidateId[0]
    : params.candidateId;
  const shelterId = profile?.shelterId;

  const {
    data: candidate,
    isLoading,
    isError,
    refetch,
  } = useCandidateById(supabase, shelterId ?? '', candidateId ?? '');

  const bridgeContact = useBridgeEvaluatedToContactPending(
    supabase,
    shelterId ?? '',
    candidateId ?? '',
  );
  const markDecision = useMarkDecisionPending(
    supabase,
    shelterId ?? '',
    candidateId ?? '',
  );

  if (!shelterId || !candidateId) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('candidates.notFoundTitle') }} />
        <Text accessibilityRole="header" style={styles.title}>
          {t('candidates.notFoundTitle')}
        </Text>
        <Text style={styles.description}>
          {t('candidates.notFoundDescription')}
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('candidates.loadingTitle') }} />
        <Text style={styles.description}>{t('candidates.loading')}</Text>
      </View>
    );
  }

  if (isError || !candidate) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('candidates.notFoundTitle') }} />
        <Text accessibilityRole="header" style={styles.title}>
          {t('candidates.notFoundTitle')}
        </Text>
        <Text style={styles.description}>
          {t('candidates.notFoundDescription')}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => refetch()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
        >
          <Text style={styles.backButtonText}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  const canContinueContact = candidate.status === 'EVALUATED';
  const canMarkDecision = candidate.status === 'MEETING_SCHEDULED';

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: candidate.person.name }} />

      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {candidate.person.name.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={styles.heroCopy}>
          <Text accessibilityRole="header" style={styles.name}>
            {candidate.person.name}
          </Text>
          <CandidateStatusBadge status={candidate.status} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('candidates.overview')}</Text>
        <View style={styles.card}>
          <InfoRow
            label={t('candidates.animal')}
            value={candidate.animal.name}
            hint={t('candidates.animalHint', {
              species: getAnimalSpeciesLabel(t, candidate.animal.species),
              sex: getAnimalSexLabel(t, candidate.animal.sex),
              size: getAnimalSizeLabel(t, candidate.animal.size),
            })}
          />
          <InfoRow
            label={t('candidates.source')}
            value={getCandidateSourceLabel(t, candidate.source)}
          />
          <InfoRow
            label={t('candidates.appliedOn')}
            value={formatDate(new Date(candidate.created_at), {
              dateStyle: 'medium',
            })}
          />
          {candidate.person.email ? (
            <InfoRow
              label={t('candidates.email')}
              value={candidate.person.email}
            />
          ) : null}
          <InfoRow
            label={t('candidates.phone')}
            value={candidate.person.phone}
          />
        </View>
      </View>

      {candidate.notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('candidates.notes')}</Text>
          <View style={styles.card}>
            <Text style={styles.bodyText}>{candidate.notes}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('candidates.actions')}</Text>
        <View style={styles.actionList}>
          <ActionLink
            href={{
              pathname: '/animals/candidate/[candidateId]/evaluation',
              params: { candidateId: candidate.id },
            }}
            label={
              candidate.status !== 'NEEDS_EVALUATION'
                ? t('candidates.viewEvaluation')
                : t('candidates.registerEvaluation')
            }
            variant={
              candidate.status === 'NEEDS_EVALUATION' ? 'primary' : 'secondary'
            }
          />
          <ActionLink
            href={{
              pathname: '/animals/candidate/[candidateId]/meetings',
              params: { candidateId: candidate.id },
            }}
            label={t('candidates.viewMeetings')}
          />
          {canContinueContact ? (
            <ActionButton
              label={t('candidates.continueContact')}
              onPress={() => bridgeContact.mutate()}
              disabled={bridgeContact.isPending}
            />
          ) : null}
          {canMarkDecision ? (
            <ActionButton
              label={t('candidates.markDecisionPending')}
              onPress={() => markDecision.mutate()}
              disabled={markDecision.isPending}
            />
          ) : null}
          {candidate.status === 'DECISION_PENDING' ? (
            <ActionLink
              href={{
                pathname: '/animals/candidate/[candidateId]/confirm-adoption',
                params: { candidateId: candidate.id },
              }}
              label={t('candidates.confirmAdoption')}
              variant="primary"
            />
          ) : null}
        </View>
      </View>

      {bridgeContact.isError ? (
        <Text style={styles.hint}>{t('candidates.contactError')}</Text>
      ) : null}
      {markDecision.isError ? (
        <Text style={styles.hint}>{t('candidates.decisionError')}</Text>
      ) : null}

      {!canContinueContact &&
      !canMarkDecision &&
      candidate.status !== 'DECISION_PENDING' ? (
        <Text style={styles.hint}>
          {t('candidates.confirmHint', {
            status: getCandidateStatusLabel(t, candidate.status),
          })}
        </Text>
      ) : null}
    </ScrollView>
  );
}

function InfoRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
      {hint ? <Text style={styles.infoHint}>{hint}</Text> : null}
    </View>
  );
}

function ActionLink({
  href,
  label,
  variant = 'secondary',
}: {
  href: Href;
  label: string;
  variant?: 'primary' | 'secondary';
}) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(href)}
      style={({ pressed }) => [
        styles.action,
        isPrimary && styles.actionEmphasized,
        pressed && styles.actionPressed,
      ]}
    >
      <Text
        style={[styles.actionLabel, isPrimary && styles.actionLabelEmphasized]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ActionButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        styles.actionEmphasized,
        pressed && styles.actionPressed,
        disabled && styles.actionDisabled,
      ]}
    >
      <Text style={[styles.actionLabel, styles.actionLabelEmphasized]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 16,
  },
  actionDisabled: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.surfaceMuted,
  },
  actionEmphasized: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  actionLabelEmphasized: {
    color: colors.surface,
  },
  actionList: {
    gap: 12,
  },
  actionPressed: {
    backgroundColor: colors.primaryPressed,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  avatarText: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '900',
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 50,
    paddingHorizontal: 20,
  },
  backButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  backButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  bodyText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  container: {
    backgroundColor: colors.background,
    padding: 20,
    paddingBottom: 40,
  },
  description: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
    textAlign: 'center',
  },
  hero: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 16,
    padding: 18,
  },
  heroCopy: {
    flex: 1,
    gap: 8,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  infoHint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  infoRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  infoValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 3,
  },
  name: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 12,
  },
  stateContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
});
