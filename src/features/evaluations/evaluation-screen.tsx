import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';
import { formatDate } from '@/i18n/format';
import { getCandidateDetailById } from '@/features/candidates/mock-candidates';
import { parseOccurredOn } from '@/features/animals/presenters';
import { getMockAnimalById } from '@/features/animals/mock-animals';
import { getEvaluationForCandidate } from './mock-evaluations';
import {
  getEvaluationFitLabel,
  getEvaluationRecommendationLabel,
} from './presenters';

export function EvaluationScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ candidateId: string }>();
  const candidateId = Array.isArray(params.candidateId)
    ? params.candidateId[0]
    : params.candidateId;
  const candidate = getCandidateDetailById(candidateId);
  const animal = candidate ? getMockAnimalById(candidate.animalId) : undefined;
  const evaluation = getEvaluationForCandidate(candidateId);

  const title = candidate ? candidate.person.name : t('evaluations.title');

  if (!candidate || !animal || !evaluation) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title }} />
        <Text accessibilityRole="header" style={styles.title}>
          {t('evaluations.emptyTitle')}
        </Text>
        <Text style={styles.description}>
          {t('evaluations.emptyDescription')}
        </Text>
        <Link
          href={{
            pathname: '/animals/candidate/[candidateId]',
            params: { candidateId },
          }}
          asChild
        >
          <View style={styles.backButton}>
            <Text style={styles.backButtonText}>
              {t('evaluations.backToCandidate')}
            </Text>
          </View>
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t('evaluations.title') }} />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('evaluations.summary')}</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('evaluations.animal')}</Text>
          <Text style={styles.summaryValue}>{animal.name}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('evaluations.candidate')}</Text>
          <Text style={styles.summaryValue}>{candidate.person.name}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('evaluations.fit')}</Text>
          <Text style={styles.summaryValue}>
            {getEvaluationFitLabel(t, evaluation.overallFit)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('evaluations.recordedOn')}</Text>
          <Text style={styles.summaryValue}>
            {formatDate(parseOccurredOn(evaluation.recordedOn), {
              dateStyle: 'medium',
            })}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {t('evaluations.positiveFactors')}
        </Text>
        {evaluation.positiveFactors.map((factor) => (
          <Text key={factor} style={styles.bullet}>
            • {factor}
          </Text>
        ))}
        <Text style={[styles.sectionTitle, styles.spacedTop]}>
          {t('evaluations.concerns')}
        </Text>
        {evaluation.concerns.length === 0 ? (
          <Text style={styles.muted}>{t('evaluations.noConcerns')}</Text>
        ) : (
          evaluation.concerns.map((concern) => (
            <Text key={concern} style={styles.bullet}>
              • {concern}
            </Text>
          ))
        )}
      </View>

      {evaluation.notes ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('evaluations.notes')}</Text>
          <Text style={styles.bodyText}>{evaluation.notes}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {t('evaluations.recommendation')}
        </Text>
        <Text style={styles.recommendation}>
          {getEvaluationRecommendationLabel(t, evaluation.recommendation)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 50,
    paddingHorizontal: 20,
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
  bullet: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    paddingVertical: 3,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
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
  muted: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  recommendation: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '900',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 10,
  },
  spacedTop: {
    marginTop: 14,
  },
  stateContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 14,
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 6,
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
});
