import { Link, Stack, router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { Card, PrimaryButton, SectionHeader, StateView } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-provider';
import {
  useAnimalById,
  useAnimalTimeline,
} from '@/features/animals/persisted-animal-queries';
import { StatusBadge } from './components/status-badge';
import { PersistedTimelineEventItem } from './components/persisted-timeline-event-item';
import {
  getAnimalSexLabel,
  getAnimalSizeLabel,
  getAnimalSpeciesLabel,
  getApproximateAgeLabel,
} from './presenters';
import type {
  AnimalSex,
  AnimalSize,
  AnimalSpecies,
  AnimalStatus,
} from './types';

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

export function PersistedAnimalDetailScreen() {
  const { t } = useTranslation();
  const { supabase, profile } = useAuth();
  const params = useLocalSearchParams<{ animalId: string }>();
  const animalId = Array.isArray(params.animalId)
    ? params.animalId[0]
    : params.animalId;
  const shelterId = profile?.shelterId ?? null;

  const animalQuery = useAnimalById(supabase, shelterId, animalId);
  const timelineQuery = useAnimalTimeline(supabase, shelterId, animalId);

  if (animalQuery.isLoading) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('animals.detail.title') }} />
        <Text accessibilityRole="progressbar" style={styles.loading}>
          {t('animals.detail.loading')}
        </Text>
      </View>
    );
  }

  if (animalQuery.isError) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('animals.detail.title') }} />
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
        <Stack.Screen options={{ title: t('animals.detail.title') }} />
        <StateView
          description={t('animals.detail.notFoundDescription')}
          title={t('animals.detail.notFoundTitle')}
          tone="info"
          primaryAction={{
            label: t('animals.detail.goBack'),
            onPress: () => router.back(),
          }}
        />
      </View>
    );
  }

  const animal = animalQuery.data;
  const status = animal.status as AnimalStatus;
  const timeline = timelineQuery.data ?? [];
  const showReevaluationAction = status === 'REEVALUATION';

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: animal.name }} />

      <View style={styles.hero}>
        <View style={styles.heroAvatar}>
          <Text style={styles.heroAvatarLabel}>
            {animal.name.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={styles.heroCopy}>
          <Text accessibilityRole="header" style={styles.heroName}>
            {animal.name}
          </Text>
          <Text style={styles.heroMeta}>
            {getAnimalSpeciesLabel(t, animal.species as AnimalSpecies)} ·{' '}
            {getAnimalSexLabel(t, animal.sex as AnimalSex)} ·{' '}
            {getAnimalSizeLabel(t, animal.size as AnimalSize)}
          </Text>
          <View style={styles.heroBadge}>
            <StatusBadge status={status} />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('animals.detail.overview')} />
        <Card padding="comfortable" variant="elevated">
          <View style={styles.detailGrid}>
            <DetailRow
              label={t('animals.detail.species')}
              value={getAnimalSpeciesLabel(t, animal.species as AnimalSpecies)}
            />
            <DetailRow
              label={t('animals.detail.sex')}
              value={getAnimalSexLabel(t, animal.sex as AnimalSex)}
            />
            <DetailRow
              label={t('animals.detail.age')}
              value={getApproximateAgeLabel(t, animal.approximateAgeMonths)}
            />
            <DetailRow
              label={t('animals.detail.size')}
              value={getAnimalSizeLabel(t, animal.size as AnimalSize)}
            />
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('animals.detail.currentProcess')} />
        <Card padding="comfortable" variant="elevated">
          <Text style={styles.processLabel}>
            {t('animals.detail.nextStep')}
          </Text>
          <Text style={styles.nextStepValue}>{t(nextStepKeys[status])}</Text>
        </Card>
      </View>

      {showReevaluationAction ? (
        <View style={styles.section}>
          <Link
            href={{
              pathname: '/animals/[animalId]/reevaluation',
              params: { animalId: animal.id },
            }}
            asChild
          >
            <PrimaryButton
              accessibilityLabel={t('animals.detail.completeReevaluation')}
              fullWidth
              label={t('animals.detail.completeReevaluation')}
              onPress={() => undefined}
            />
          </Link>
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title={t('animals.timeline.title')} />

        {timelineQuery.isLoading ? (
          <Text accessibilityRole="progressbar" style={styles.timelineState}>
            {t('animals.detail.timelineLoading')}
          </Text>
        ) : null}

        {timelineQuery.isError ? (
          <Text accessibilityRole="alert" style={styles.timelineError}>
            {t('animals.detail.timelineError')}
          </Text>
        ) : null}

        {!timelineQuery.isLoading && !timelineQuery.isError ? (
          timeline.length === 0 ? (
            <Card padding="comfortable" variant="subtle">
              <Text style={styles.timelineState}>
                {t('animals.detail.timelineEmpty')}
              </Text>
            </Card>
          ) : (
            <Card padding="comfortable" variant="elevated">
              {timeline.map((event, index) => (
                <PersistedTimelineEventItem
                  animalName={animal.name}
                  event={event}
                  isLast={index === timeline.length - 1}
                  key={event.id}
                />
              ))}
            </Card>
          )
        ) : null}
      </View>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  hero: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.xl,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  heroAvatar: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 28,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  heroAvatarLabel: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
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
  loading: {
    ...typography.body,
    color: colors.textMuted,
    padding: spacing.lg,
  },
  nextStepValue: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing['2xs'],
  },
  processLabel: {
    ...typography.metaStrong,
    color: colors.textSubtle,
    textTransform: 'uppercase',
  },
  section: {
    marginTop: spacing.xl,
  },
  stateContainer: {
    backgroundColor: colors.background,
    flex: 1,
  },
  timelineError: {
    ...typography.body,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  timelineState: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
