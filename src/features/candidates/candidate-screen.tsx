import { Link, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';
import { CandidateStatusBadge } from '@/features/animals/components/candidate-status-badge';
import { usePrototypeFlow } from '@/features/prototype-flow/prototype-flow-provider';
import {
  selectAnimalById,
  selectCandidateById,
  selectEvaluationForCandidate,
  canMarkDecisionPending,
} from '@/features/prototype-flow/prototype-flow-selectors';
import {
  getAnimalSexLabel,
  getAnimalSizeLabel,
  getAnimalSpeciesLabel,
  getCandidateStatusLabel,
} from '@/features/animals/presenters';
import { getCandidateSourceLabel } from './presenters';
import { formatDate } from '@/i18n/format';

export function CandidateScreen() {
  const { t } = useTranslation();
  const { state, commands } = usePrototypeFlow();
  const params = useLocalSearchParams<{ candidateId: string }>();
  const candidateId = Array.isArray(params.candidateId)
    ? params.candidateId[0]
    : params.candidateId;
  const candidate = selectCandidateById(state, candidateId);
  const animal = candidate
    ? selectAnimalById(state, candidate.animalId)
    : undefined;
  const evaluation = candidate
    ? selectEvaluationForCandidate(state, candidate.id)
    : undefined;

  if (!candidate || !animal) {
    return (
      <View style={styles.notFound}>
        <Stack.Screen options={{ title: t('candidates.notFoundTitle') }} />
        <Text accessibilityRole="header" style={styles.notFoundTitle}>
          {t('candidates.notFoundTitle')}
        </Text>
        <Text style={styles.notFoundDescription}>
          {t('candidates.notFoundDescription')}
        </Text>
      </View>
    );
  }

  const canConfirm = candidate.status === 'DECISION_PENDING';
  const hasEvaluation = !!evaluation;
  const canContinueContact = candidate.status === 'EVALUATED';
  const canMarkDecision = canMarkDecisionPending(state, candidate.id);

  function handleContinueContact(candidateId: string) {
    commands.continueContact(candidateId);
  }

  function handleMarkDecisionPending(candidateId: string) {
    commands.markDecisionPending(candidateId);
  }

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
            value={animal.name}
            hint={t('candidates.animalHint', {
              species: getAnimalSpeciesLabel(t, animal.species),
              sex: getAnimalSexLabel(t, animal.sex),
              size: getAnimalSizeLabel(t, animal.size),
            })}
          />
          <InfoRow
            label={t('candidates.source')}
            value={getCandidateSourceLabel(t, candidate.source)}
          />
          <InfoRow
            label={t('candidates.appliedOn')}
            value={formatDate(
              new Date(candidate.applicationDate + 'T12:00:00'),
              {
                dateStyle: 'medium',
              },
            )}
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

      {candidate.person.notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('candidates.notes')}</Text>
          <View style={styles.card}>
            <Text style={styles.bodyText}>{candidate.person.notes}</Text>
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
              hasEvaluation
                ? t('candidates.viewEvaluation')
                : t('candidates.registerEvaluation')
            }
            variant={hasEvaluation ? 'secondary' : 'primary'}
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
              onPress={() => handleContinueContact(candidate.id)}
            />
          ) : null}
          {canMarkDecision ? (
            <ActionButton
              label={t('candidates.markDecisionPending')}
              onPress={() => handleMarkDecisionPending(candidate.id)}
            />
          ) : null}
          {canConfirm ? (
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
        {!hasEvaluation ? (
          <Text style={styles.hint}>{t('candidates.noEvaluationHint')}</Text>
        ) : null}
        {!canConfirm && !canContinueContact && !canMarkDecisionPending ? (
          <Text style={styles.hint}>
            {t('candidates.confirmHint', {
              status: getCandidateStatusLabel(t, candidate.status),
            })}
          </Text>
        ) : null}
      </View>
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
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.action,
          isPrimary && styles.actionEmphasized,
          pressed &&
            (isPrimary ? styles.actionPressedEmphasized : styles.actionPressed),
        ]}
      >
        <Text
          style={[
            styles.actionLabel,
            isPrimary && styles.actionLabelEmphasized,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

function ActionButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        styles.actionEmphasized,
        pressed && styles.actionPressedEmphasized,
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
    minHeight: 54,
    paddingHorizontal: 16,
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
    opacity: 0.7,
  },
  actionPressedEmphasized: {
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
  notFound: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  notFoundDescription: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
  notFoundTitle: {
    color: colors.text,
    fontSize: 22,
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
});
