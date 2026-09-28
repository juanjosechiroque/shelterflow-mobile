import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { Card, PrimaryButton, SectionHeader, StateView } from '@/components/ui';
import { usePrototypeFlow } from '@/features/prototype-flow/prototype-flow-provider';
import {
  selectAnimalById,
  selectCandidatesForAnimal,
  selectTimelineForAnimal,
} from '@/features/prototype-flow/prototype-flow-selectors';

import { AnimalAvatar } from './components/animal-avatar';
import { CandidateRow } from './components/candidate-row';
import { StatusBadge } from './components/status-badge';
import { TimelineEventItem } from './components/timeline-event-item';
import {
  getAnimalSexLabel,
  getAnimalSizeLabel,
  getAnimalSpeciesLabel,
  getApproximateAgeLabel,
} from './presenters';
import type { AnimalStatus } from './types';

const nextStepKeys: Record<
  AnimalStatus,
  | 'animals.detail.nextSteps.preparing'
  | 'animals.detail.nextSteps.ready'
  | 'animals.detail.nextSteps.inProcess'
  | 'animals.detail.nextSteps.adopted'
  | 'animals.detail.nextSteps.reevaluation'
  | 'animals.detail.nextSteps.notAvailable'
> = {
  ADOPTED: 'animals.detail.nextSteps.adopted',
  IN_PROCESS: 'animals.detail.nextSteps.inProcess',
  NOT_AVAILABLE: 'animals.detail.nextSteps.notAvailable',
  PREPARING: 'animals.detail.nextSteps.preparing',
  READY: 'animals.detail.nextSteps.ready',
  REEVALUATION: 'animals.detail.nextSteps.reevaluation',
};

export function AnimalDetailScreen() {
  const { t } = useTranslation();
  const { state } = usePrototypeFlow();
  const params = useLocalSearchParams<{ animalId: string }>();
  const animalId = Array.isArray(params.animalId)
    ? params.animalId[0]
    : params.animalId;
  const animal = selectAnimalById(state, animalId);
  const candidates = animal ? selectCandidatesForAnimal(state, animal.id) : [];
  const timeline = animal ? selectTimelineForAnimal(state, animal.id) : [];

  if (!animal) {
    return (
      <View style={styles.notFoundContainer}>
        <Stack.Screen options={{ title: t('animals.detail.notFoundTitle') }} />
        <StateView
          title={t('animals.detail.notFoundTitle')}
          description={t('animals.detail.notFoundDescription')}
          tone="info"
          primaryAction={{
            label: t('animals.detail.goBack'),
            onPress: () => router.back(),
          }}
        />
      </View>
    );
  }

  const details = [
    {
      label: t('animals.detail.species'),
      value: getAnimalSpeciesLabel(t, animal.species),
    },
    {
      label: t('animals.detail.sex'),
      value: getAnimalSexLabel(t, animal.sex),
    },
    {
      label: t('animals.detail.age'),
      value: getApproximateAgeLabel(t, animal.approximateAgeMonths),
    },
    {
      label: t('animals.detail.size'),
      value: getAnimalSizeLabel(t, animal.size),
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: animal.name }} />

      <View style={styles.hero}>
        <AnimalAvatar animal={animal} size="large" />
        <View style={styles.heroCopy}>
          <Text accessibilityRole="header" style={styles.heroName}>
            {animal.name}
          </Text>
          <Text style={styles.heroMeta}>
            {getAnimalSpeciesLabel(t, animal.species)} ·{' '}
            {getAnimalSexLabel(t, animal.sex)} ·{' '}
            {getAnimalSizeLabel(t, animal.size)}
          </Text>
          <View style={styles.heroBadge}>
            <StatusBadge status={animal.status} />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('animals.detail.overview')} />
        <Card padding="comfortable" variant="elevated">
          <View style={styles.detailGrid}>
            {details.map((detail) => (
              <View key={detail.label} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{detail.label}</Text>
                <Text style={styles.detailValue}>{detail.value}</Text>
              </View>
            ))}
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('animals.detail.currentProcess')} />
        <Card padding="comfortable" variant="elevated">
          <View style={styles.processRow}>
            <Text style={styles.processLabel}>
              {t('animals.detail.activeCandidates')}
            </Text>
            <Text style={styles.processValue}>
              {t('animals.candidates.count', { count: candidates.length })}
            </Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.processLabel}>
            {t('animals.detail.nextStep')}
          </Text>
          <Text style={styles.nextStepValue}>
            {t(nextStepKeys[animal.status])}
          </Text>
          {animal.status === 'ADOPTED' ? (
            <Link
              href={{
                pathname: '/animals/followups/[animalId]',
                params: { animalId: animal.id },
              }}
              asChild
            >
              <PrimaryButton
                accessibilityLabel={t('animals.detail.reviewFollowUps')}
                fullWidth
                label={t('animals.detail.reviewFollowUps')}
                onPress={() => undefined}
              />
            </Link>
          ) : null}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('animals.candidates.title')} />
        <Card padding="comfortable" variant="elevated">
          {candidates.length === 0 ? (
            <Text style={styles.emptyCopy}>
              {t('animals.candidates.empty')}
            </Text>
          ) : (
            candidates.map((candidate, index) => (
              <View key={candidate.id}>
                {index > 0 ? <View style={styles.candidateDivider} /> : null}
                <CandidateRow candidate={candidate} />
              </View>
            ))
          )}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('animals.timeline.title')} />
        <Card padding="comfortable" variant="elevated">
          {timeline.map((event, index) => (
            <TimelineEventItem
              animalName={animal.name}
              event={event}
              isLast={index === timeline.length - 1}
              key={event.id}
            />
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  candidateDivider: {
    backgroundColor: colors.borderSubtle,
    height: StyleSheet.hairlineWidth,
  },
  container: {
    paddingBottom: spacing['3xl'],
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  detailGrid: {
    gap: spacing.xs,
  },
  detailLabel: {
    ...typography.metaStrong,
    color: colors.textSubtle,
    textTransform: 'uppercase',
  },
  detailRow: {
    gap: spacing['2xs'],
    paddingVertical: spacing.xs,
  },
  detailValue: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  divider: {
    backgroundColor: colors.borderSubtle,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },
  emptyCopy: {
    ...typography.body,
    color: colors.textMuted,
  },
  hero: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.xl,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  heroBadge: {
    marginTop: spacing['2xs'],
  },
  heroCopy: {
    flex: 1,
    gap: spacing['2xs'],
  },
  heroMeta: {
    ...typography.meta,
    color: colors.textMuted,
  },
  heroName: {
    ...typography.display,
    color: colors.text,
    fontSize: 24,
  },
  nextStepValue: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing['2xs'],
  },
  notFoundContainer: {
    backgroundColor: colors.background,
    flex: 1,
  },
  processLabel: {
    ...typography.metaStrong,
    color: colors.textSubtle,
    textTransform: 'uppercase',
  },
  processRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  processValue: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  section: {
    marginTop: spacing.xl,
  },
});
