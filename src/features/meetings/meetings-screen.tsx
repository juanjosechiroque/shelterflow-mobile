import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';
import { usePrototypeFlow } from '@/features/prototype-flow/prototype-flow-provider';
import {
  selectAnimalById,
  selectCandidateById,
  selectMeetingsForCandidate,
  canScheduleMeeting,
} from '@/features/prototype-flow/prototype-flow-selectors';
import { isValidISODate } from '@/features/prototype-flow/date-utils';
import type { MockMeeting } from '@/features/prototype-flow/types';
import { formatDate } from '@/i18n/format';
import {
  getMeetingResultLabel,
  getMeetingStatusLabel,
  getMeetingTypeLabel,
} from './presenters';

type MeetingType = MockMeeting['type'];
type MeetingResult = MockMeeting['result'];

export function MeetingsScreen() {
  const { t } = useTranslation();
  const { state } = usePrototypeFlow();
  const params = useLocalSearchParams<{ candidateId: string }>();
  const candidateId = Array.isArray(params.candidateId)
    ? params.candidateId[0]
    : params.candidateId;
  const candidate = selectCandidateById(state, candidateId);
  const animal = candidate
    ? selectAnimalById(state, candidate.animalId)
    : undefined;
  const meetings = selectMeetingsForCandidate(state, candidateId);

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

  const canSchedule = canScheduleMeeting(state, candidateId);
  const scheduledMeetings = meetings.filter((m) => m.status === 'SCHEDULED');
  const completedMeetings = meetings.filter((m) => m.status === 'COMPLETED');

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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

        {meetings.length === 0 && !canSchedule ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t('meetings.emptyTitle')}</Text>
            <Text style={styles.emptyDescription}>
              {t('meetings.emptyDescription')}
            </Text>
          </View>
        ) : (
          <>
            {completedMeetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                showComplete={false}
              />
            ))}
            {scheduledMeetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} showComplete />
            ))}
          </>
        )}

        {canSchedule ? <ScheduleMeetingForm candidateId={candidateId} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MeetingCard({
  meeting,
  showComplete,
}: {
  meeting: MockMeeting;
  showComplete: boolean;
}) {
  const { t } = useTranslation();
  const { commands } = usePrototypeFlow();
  const [result, setResult] = useState<MeetingResult>('GOOD');
  const [notes, setNotes] = useState('');

  function handleComplete() {
    commands.completeMeeting(meeting.id, result, notes.trim() || undefined);
  }

  return (
    <View key={meeting.id} style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.type}>{getMeetingTypeLabel(t, meeting.type)}</Text>
        <Text style={styles.status}>
          {getMeetingStatusLabel(t, meeting.status)}
        </Text>
      </View>
      <Text style={styles.date}>
        {formatDate(new Date(meeting.scheduledOn + 'T12:00:00'), {
          dateStyle: 'long',
        })}
      </Text>
      {meeting.result ? (
        <Text style={styles.result}>
          {t('meetings.resultLabel')}:{' '}
          {getMeetingResultLabel(t, meeting.result)}
        </Text>
      ) : null}
      {meeting.notes ? <Text style={styles.notes}>{meeting.notes}</Text> : null}

      {showComplete && meeting.status === 'SCHEDULED' ? (
        <View style={styles.completeSection}>
          <Text style={styles.fieldLabel}>{t('meetings.form.result')}</Text>
          <View style={styles.radioGroup}>
            {(
              [
                {
                  value: 'STRONG_MATCH',
                  label: t('meetings.results.strongMatch'),
                },
                { value: 'GOOD', label: t('meetings.results.good') },
                { value: 'CONCERNS', label: t('meetings.results.concerns') },
                {
                  value: 'NOT_RECOMMENDED',
                  label: t('meetings.results.notRecommended'),
                },
              ] as const
            ).map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: result === option.value }}
                onPress={() => setResult(option.value)}
                style={[
                  styles.radio,
                  result === option.value && styles.radioSelected,
                ]}
              >
                <Text
                  style={[
                    styles.radioLabel,
                    result === option.value && styles.radioLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={t('meetings.form.notesPlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={[styles.textInput, styles.textArea]}
            multiline
            numberOfLines={2}
          />
          <Pressable
            accessibilityRole="button"
            onPress={handleComplete}
            style={({ pressed }) => [
              styles.completeButton,
              pressed && styles.completeButtonPressed,
            ]}
          >
            <Text style={styles.completeButtonText}>
              {t('meetings.form.completeAction')}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ScheduleMeetingForm({ candidateId }: { candidateId: string }) {
  const { t } = useTranslation();
  const { commands } = usePrototypeFlow();
  const [type, setType] = useState<MeetingType>('MEET_AND_GREET');
  const [scheduledOn, setScheduledOn] = useState('');
  const [notes, setNotes] = useState('');

  function handleSubmit() {
    const trimmedDate = scheduledOn.trim();
    if (!isValidISODate(trimmedDate)) return;

    commands.scheduleMeeting(
      candidateId,
      type,
      trimmedDate,
      notes.trim() || undefined,
    );
    setScheduledOn('');
    setNotes('');
  }

  const dateValid = isValidISODate(scheduledOn.trim());
  const canSubmit = dateValid;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('meetings.form.title')}</Text>

      <Text style={styles.fieldLabel}>{t('meetings.form.type')}</Text>
      <View style={styles.radioGroup}>
        {(
          [
            { value: 'INTERVIEW', label: t('meetings.types.interview') },
            { value: 'VISIT', label: t('meetings.types.visit') },
            {
              value: 'MEET_AND_GREET',
              label: t('meetings.types.meetAndGreet'),
            },
            { value: 'HOME_VISIT', label: t('meetings.types.homeVisit') },
          ] as const
        ).map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: type === option.value }}
            onPress={() => setType(option.value)}
            style={[
              styles.radio,
              type === option.value && styles.radioSelected,
            ]}
          >
            <Text
              style={[
                styles.radioLabel,
                type === option.value && styles.radioLabelSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.fieldLabel}>{t('meetings.form.date')}</Text>
      <TextInput
        value={scheduledOn}
        onChangeText={setScheduledOn}
        placeholder={t('meetings.form.datePlaceholder')}
        placeholderTextColor={colors.textMuted}
        style={styles.textInput}
        keyboardType="numbers-and-punctuation"
      />

      <Text style={styles.fieldLabel}>{t('meetings.form.notes')}</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder={t('meetings.form.notesPlaceholder')}
        placeholderTextColor={colors.textMuted}
        style={[styles.textInput, styles.textArea]}
        multiline
        numberOfLines={2}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSubmit }}
        disabled={!canSubmit}
        onPress={handleSubmit}
        style={({ pressed }) => [
          styles.submitButton,
          !canSubmit && styles.submitButtonDisabled,
          pressed && styles.submitButtonPressed,
        ]}
      >
        <Text style={styles.submitButtonText}>
          {t('meetings.form.scheduleAction')}
        </Text>
      </Pressable>
    </View>
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
  completeButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 46,
    paddingHorizontal: 16,
  },
  completeButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  completeButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '800',
  },
  completeSection: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 14,
    paddingTop: 14,
  },
  container: {
    backgroundColor: colors.background,
    padding: 20,
    paddingBottom: 48,
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
  fieldLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 12,
  },
  flex: {
    flex: 1,
  },
  notes: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  radio: {
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  radioGroup: {
    gap: 0,
  },
  radioLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  radioLabelSelected: {
    color: colors.primary,
    fontWeight: '800',
  },
  radioSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  result: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },
  stateContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 50,
    paddingHorizontal: 20,
  },
  submitButtonDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  submitButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  submitButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
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
  textArea: {
    height: 64,
    textAlignVertical: 'top',
  },
  textInput: {
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
