import { Link, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';
import { CandidateStatusBadge } from '@/features/animals/components/candidate-status-badge';
import { getMockAnimalById } from '@/features/animals/mock-animals';
import {
  getAnimalSexLabel,
  getAnimalSizeLabel,
  getAnimalSpeciesLabel,
  getCandidateStatusLabel,
  parseOccurredOn,
} from '@/features/animals/presenters';
import { getCandidateDetailById } from './mock-candidates';
import { getCandidateSourceLabel } from './presenters';
import { formatDate } from '@/i18n/format';

export function CandidateScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ candidateId: string }>();
  const candidateId = Array.isArray(params.candidateId)
    ? params.candidateId[0]
    : params.candidateId;
  const candidate = getCandidateDetailById(candidateId);
  const animal = candidate ? getMockAnimalById(candidate.animalId) : undefined;

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
  const hasEvaluation = candidate.status !== 'NEEDS_EVALUATION';

  return (
    <View style={styles.container}>
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
            value={formatDate(parseOccurredOn(candidate.applicationDate), {
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
            label={t('candidates.viewEvaluation')}
          />
          <ActionLink
            href={{
              pathname: '/animals/candidate/[candidateId]/meetings',
              params: { candidateId: candidate.id },
            }}
            label={t('candidates.viewMeetings')}
          />
          {canConfirm ? (
            <ActionLink
              href={{
                pathname: '/animals/candidate/[candidateId]/confirm-adoption',
                params: { candidateId: candidate.id },
              }}
              label={t('candidates.confirmAdoption')}
              emphasized
            />
          ) : null}
        </View>
        {!hasEvaluation ? (
          <Text style={styles.hint}>{t('candidates.noEvaluationHint')}</Text>
        ) : null}
        {!canConfirm ? (
          <Text style={styles.hint}>
            {t('candidates.confirmHint', {
              status: getCandidateStatusLabel(t, candidate.status),
            })}
          </Text>
        ) : null}
      </View>
    </View>
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
  emphasized,
}: {
  href: Href;
  label: string;
  emphasized?: boolean;
}) {
  return (
    <Link href={href} asChild>
      <View
        style={StyleSheet.flatten([
          styles.action,
          emphasized && styles.actionEmphasized,
        ])}
      >
        <Text
          style={[
            styles.actionLabel,
            emphasized && styles.actionLabelEmphasized,
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.actionChevron,
            emphasized && styles.actionChevronEmphasized,
          ]}
        >
          ›
        </Text>
      </View>
    </Link>
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
    justifyContent: 'space-between',
    minHeight: 54,
    paddingHorizontal: 16,
  },
  actionChevron: {
    color: colors.textMuted,
    fontSize: 24,
  },
  actionChevronEmphasized: {
    color: colors.surface,
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
    flex: 1,
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
