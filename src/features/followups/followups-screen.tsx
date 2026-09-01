import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';
import { formatDate } from '@/i18n/format';
import { getMockAnimalById } from '@/features/animals/mock-animals';
import { parseOccurredOn } from '@/features/animals/presenters';
import { getActiveAdoptionForAnimal } from '@/features/adoptions/mock-adoptions';
import { getFollowUpsForAnimal } from './mock-followups';
import { getFollowUpOutcomeLabel, getFollowUpStatusLabel } from './presenters';

export function FollowUpsScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ animalId: string }>();
  const animalId = Array.isArray(params.animalId)
    ? params.animalId[0]
    : params.animalId;
  const animal = getMockAnimalById(animalId);
  const adoption = getActiveAdoptionForAnimal(animalId);
  const followUps = getFollowUpsForAnimal(animalId);

  if (!animal || !adoption) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('followups.title') }} />
        <Text accessibilityRole="header" style={styles.title}>
          {t('followups.noAdoptionTitle')}
        </Text>
        <Text style={styles.description}>
          {t('followups.noAdoptionDescription')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: t('followups.title') }} />

      <View style={styles.intro}>
        <Text style={styles.introTitle}>{animal.name}</Text>
        <Text style={styles.introDescription}>
          {t('followups.subtitle', { animalName: animal.name })}
        </Text>
      </View>

      {followUps.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t('followups.emptyTitle')}</Text>
          <Text style={styles.emptyDescription}>
            {t('followups.emptyDescription')}
          </Text>
        </View>
      ) : (
        followUps.map((followUp) => {
          const isDone = followUp.status === 'COMPLETED';
          return (
            <View
              key={followUp.id}
              style={[styles.card, isDone && styles.cardDone]}
            >
              <View style={styles.cardTop}>
                <Text style={styles.dueDate}>
                  {formatDate(parseOccurredOn(followUp.dueDate), {
                    dateStyle: 'long',
                  })}
                </Text>
                <Text style={styles.status}>
                  {getFollowUpStatusLabel(t, followUp.status)}
                </Text>
              </View>
              {followUp.outcome ? (
                <Text style={styles.outcome}>
                  {t('followups.outcomeLabel')}:{' '}
                  {getFollowUpOutcomeLabel(t, followUp.outcome)}
                </Text>
              ) : null}
              {followUp.notes ? (
                <Text style={styles.notes}>{followUp.notes}</Text>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 18,
  },
  cardDone: {
    backgroundColor: colors.surfaceMuted,
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  container: {
    backgroundColor: colors.background,
    padding: 20,
    paddingBottom: 40,
  },
  description: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
  dueDate: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
  },
  emptyDescription: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  intro: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 18,
    padding: 18,
  },
  introDescription: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  introTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  notes: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  outcome: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 8,
  },
  stateContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  status: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
});
