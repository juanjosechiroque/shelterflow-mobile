import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';
import { formatDate } from '@/i18n/format';
import { getCandidateDetailById } from '@/features/candidates/mock-candidates';
import { getMockAnimalById } from '@/features/animals/mock-animals';
import { parseOccurredOn } from '@/features/animals/presenters';
import { getMeetingsForCandidate } from './mock-meetings';
import {
  getMeetingResultLabel,
  getMeetingStatusLabel,
  getMeetingTypeLabel,
} from './presenters';

export function MeetingsScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ candidateId: string }>();
  const candidateId = Array.isArray(params.candidateId)
    ? params.candidateId[0]
    : params.candidateId;
  const candidate = getCandidateDetailById(candidateId);
  const animal = candidate ? getMockAnimalById(candidate.animalId) : undefined;
  const meetings = getMeetingsForCandidate(candidateId);

  if (!candidate || !animal) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('meetings.title') }} />
        <Text accessibilityRole="header" style={styles.title}>
          {t('meetings.notFoundTitle')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: t('meetings.title') }} />

      <Text style={styles.subtitle}>
        {t('meetings.subtitle', {
          personName: candidate.person.name,
          animalName: animal.name,
        })}
      </Text>

      {meetings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t('meetings.emptyTitle')}</Text>
          <Text style={styles.emptyDescription}>
            {t('meetings.emptyDescription')}
          </Text>
        </View>
      ) : (
        meetings.map((meeting) => {
          const isComplete = meeting.status === 'COMPLETED';
          return (
            <View key={meeting.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.type}>
                  {getMeetingTypeLabel(t, meeting.type)}
                </Text>
                <Text style={styles.status}>
                  {getMeetingStatusLabel(t, meeting.status)}
                </Text>
              </View>
              <Text style={styles.date}>
                {formatDate(parseOccurredOn(meeting.scheduledOn), {
                  dateStyle: 'long',
                })}
              </Text>
              {meeting.result ? (
                <Text style={styles.result}>
                  {t('meetings.resultLabel')}:{' '}
                  {getMeetingResultLabel(t, meeting.result)}
                </Text>
              ) : null}
              {meeting.notes ? (
                <Text style={styles.notes}>{meeting.notes}</Text>
              ) : null}
              {isComplete && !meeting.result ? (
                <Text style={styles.muted}>{t('meetings.noResultHint')}</Text>
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
  date: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
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
  muted: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  notes: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  result: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
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
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  type: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
});
