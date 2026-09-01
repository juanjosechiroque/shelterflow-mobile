import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';
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
        <Text accessibilityRole="header" style={styles.notFoundTitle}>
          {t('animals.detail.notFoundTitle')}
        </Text>
        <Text style={styles.notFoundDescription}>
          {t('animals.detail.notFoundDescription')}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {t('animals.detail.goBack')}
          </Text>
        </Pressable>
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
          <Text accessibilityRole="header" style={styles.name}>
            {animal.name}
          </Text>
          <StatusBadge status={animal.status} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('animals.detail.overview')}</Text>
      <View style={styles.detailGrid}>
        {details.map((detail) => (
          <View key={detail.label} style={styles.detailCell}>
            <Text style={styles.detailLabel}>{detail.label}</Text>
            <Text style={styles.detailValue}>{detail.value}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>
        {t('animals.detail.currentProcess')}
      </Text>
      <View style={styles.processCard}>
        <View style={styles.processRow}>
          <Text style={styles.processLabel}>
            {t('animals.detail.activeCandidates')}
          </Text>
          <Text style={styles.processValue}>
            {t('animals.candidates.count', { count: candidates.length })}
          </Text>
        </View>
        <View style={styles.divider} />
        <Text style={styles.nextStepLabel}>{t('animals.detail.nextStep')}</Text>
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
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.followUpsButton,
                pressed && styles.followUpsButtonPressed,
              ]}
            >
              <Text style={styles.followUpsButtonText}>
                {t('animals.detail.reviewFollowUps')}
              </Text>
            </Pressable>
          </Link>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>{t('animals.candidates.title')}</Text>
      <View style={styles.listCard}>
        {candidates.length === 0 ? (
          <Text style={styles.emptyCopy}>{t('animals.candidates.empty')}</Text>
        ) : (
          candidates.map((candidate, index) => (
            <View key={candidate.id}>
              {index > 0 ? <View style={styles.candidateDivider} /> : null}
              <CandidateRow candidate={candidate} />
            </View>
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>{t('animals.timeline.title')}</Text>
      <View style={styles.listCard}>
        {timeline.map((event, index) => (
          <TimelineEventItem
            animalName={animal.name}
            event={event}
            isLast={index === timeline.length - 1}
            key={event.id}
          />
        ))}
      </View>

      <View style={styles.prototypeNote}>
        <Text style={styles.prototypeNoteTitle}>
          {t('animals.detail.prototype.title')}
        </Text>
        <Text style={styles.prototypeNoteText}>
          {t('animals.detail.prototype.description')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  detailCell: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 5,
    minHeight: 86,
    padding: 14,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  divider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
  },
  candidateDivider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  hero: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 22,
    flexDirection: 'row',
    gap: 18,
    padding: 20,
  },
  heroCopy: {
    flex: 1,
    gap: 10,
  },
  name: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  nextStepLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  nextStepValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
  },
  notFoundContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  notFoundDescription: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
    textAlign: 'center',
  },
  notFoundTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 50,
    paddingHorizontal: 20,
  },
  primaryButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  processCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  processLabel: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  processRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  emptyCopy: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  followUpsButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 16,
  },
  followUpsButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  followUpsButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '800',
  },
  listCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  processValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  prototypeNote: {
    backgroundColor: colors.infoSoft,
    borderRadius: 16,
    marginTop: 24,
    padding: 18,
  },
  prototypeNoteText: {
    color: colors.info,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 5,
  },
  prototypeNoteTitle: {
    color: colors.info,
    fontSize: 15,
    fontWeight: '900',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 12,
    marginTop: 26,
  },
});
