import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { useCandidateById } from '@/features/candidates/candidate-queries';
import { formatDate } from '@/i18n/format';
import {
  useCompleteMeeting,
  useMeetingsForCandidate,
  useScheduleMeeting,
} from './meeting-queries';
import type { PersistedMeeting } from './meeting-repository';
import {
  getMeetingResultLabel,
  getMeetingStatusLabel,
  getMeetingTypeLabel,
} from './presenters';
import type { MeetingResult, MeetingType } from './types';

export function MeetingsScreen() {
  const { t } = useTranslation();
  const { supabase, profile } = useAuth();
  const params = useLocalSearchParams<{ candidateId: string }>();
  const candidateId = Array.isArray(params.candidateId)
    ? params.candidateId[0]
    : params.candidateId;
  const shelterId = profile?.shelterId ?? '';

  const candidateQuery = useCandidateById(
    supabase,
    shelterId,
    candidateId ?? '',
  );
  const meetingsQuery = useMeetingsForCandidate(
    supabase,
    shelterId,
    candidateId ?? '',
  );
  const animalId = candidateQuery.data?.animal.id ?? '';
  const scheduleMutation = useScheduleMeeting(
    supabase,
    shelterId,
    candidateId ?? '',
    animalId,
  );
  const completeMutation = useCompleteMeeting(
    supabase,
    shelterId,
    candidateId ?? '',
    animalId,
  );

  if (!candidateId || !shelterId) {
    return <MissingState />;
  }

  if (candidateQuery.isLoading || meetingsQuery.isLoading) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('meetings.title') }} />
        <Text accessibilityRole="progressbar" style={styles.subtitle}>
          {t('meetings.loading')}
        </Text>
      </View>
    );
  }

  if (candidateQuery.isError || meetingsQuery.isError || !candidateQuery.data) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('meetings.title') }} />
        <Text accessibilityRole="alert" style={styles.subtitle}>
          {t('meetings.loadError')}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void candidateQuery.refetch();
            void meetingsQuery.refetch();
          }}
          style={styles.retryButton}
        >
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  const candidate = candidateQuery.data;
  const meetings = meetingsQuery.data ?? [];
  const canSchedule = candidate.status === 'CONTACT_PENDING';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Stack.Screen options={{ title: t('meetings.title') }} />
        <Text style={styles.subtitle}>
          {t('meetings.subtitle', {
            personName: candidate.person.name,
            animalName: candidate.animal.name,
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
          meetings.map((meeting) => (
            <MeetingCard
              completeMutation={completeMutation}
              key={meeting.id}
              meeting={meeting}
            />
          ))
        )}

        {canSchedule ? (
          <ScheduleMeetingForm scheduleMutation={scheduleMutation} />
        ) : null}

        {scheduleMutation.isError || completeMutation.isError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {t('meetings.mutationError')}
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MissingState() {
  const { t } = useTranslation();
  return (
    <View style={styles.stateContainer}>
      <Stack.Screen options={{ title: t('meetings.title') }} />
      <Text accessibilityRole="header" style={styles.emptyTitle}>
        {t('meetings.notFoundTitle')}
      </Text>
    </View>
  );
}

function MeetingCard({
  completeMutation,
  meeting,
}: {
  completeMutation: ReturnType<typeof useCompleteMeeting>;
  meeting: PersistedMeeting;
}) {
  const { t } = useTranslation();
  const [result, setResult] = useState<MeetingResult>('GOOD');
  const [notes, setNotes] = useState('');
  const canComplete = meeting.status === 'SCHEDULED';

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.type}>{getMeetingTypeLabel(t, meeting.type)}</Text>
        <Text style={styles.status}>
          {getMeetingStatusLabel(t, meeting.status)}
        </Text>
      </View>
      <Text style={styles.date}>
        {formatDate(new Date(meeting.scheduledAt), { dateStyle: 'long' })}
      </Text>
      {meeting.result ? (
        <Text style={styles.result}>
          {t('meetings.resultLabel')}:{' '}
          {getMeetingResultLabel(t, meeting.result)}
        </Text>
      ) : null}
      {meeting.notes ? <Text style={styles.notes}>{meeting.notes}</Text> : null}

      {canComplete ? (
        <View style={styles.completeSection}>
          <Text style={styles.fieldLabel}>{t('meetings.form.result')}</Text>
          <View style={styles.radioGroup}>
            {meetingResults.map((option) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: result === option }}
                key={option}
                onPress={() => setResult(option)}
                style={[
                  styles.radio,
                  result === option && styles.radioSelected,
                ]}
              >
                <Text style={styles.radioLabel}>
                  {getMeetingResultLabel(t, option)}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            multiline
            numberOfLines={2}
            onChangeText={setNotes}
            placeholder={t('meetings.form.notesPlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={[styles.textInput, styles.textArea]}
            value={notes}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: completeMutation.isPending }}
            disabled={completeMutation.isPending}
            onPress={() =>
              completeMutation.mutate({
                meetingId: meeting.id,
                result,
                notes: notes.trim() || null,
              })
            }
            style={styles.submitButton}
          >
            <Text style={styles.submitButtonText}>
              {t('meetings.form.completeAction')}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const meetingResults: readonly MeetingResult[] = [
  'STRONG_MATCH',
  'GOOD',
  'CONCERNS',
  'NOT_RECOMMENDED',
];

function ScheduleMeetingForm({
  scheduleMutation,
}: {
  scheduleMutation: ReturnType<typeof useScheduleMeeting>;
}) {
  const { t } = useTranslation();
  const [type, setType] = useState<MeetingType>('MEET_AND_GREET');
  const [scheduledOn, setScheduledOn] = useState('');
  const [notes, setNotes] = useState('');
  const dateValid = isValidISODate(scheduledOn.trim());

  function submit() {
    if (!dateValid) return;
    scheduleMutation.mutate(
      {
        type,
        scheduledAt: new Date(
          `${scheduledOn.trim()}T12:00:00.000Z`,
        ).toISOString(),
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => {
          setScheduledOn('');
          setNotes('');
        },
      },
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('meetings.form.title')}</Text>
      <Text style={styles.fieldLabel}>{t('meetings.form.type')}</Text>
      <View style={styles.radioGroup}>
        {meetingTypes.map((option) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: type === option }}
            key={option}
            onPress={() => setType(option)}
            style={[styles.radio, type === option && styles.radioSelected]}
          >
            <Text style={styles.radioLabel}>
              {getMeetingTypeLabel(t, option)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.fieldLabel}>{t('meetings.form.date')}</Text>
      <TextInput
        keyboardType="numbers-and-punctuation"
        onChangeText={setScheduledOn}
        placeholder={t('meetings.form.datePlaceholder')}
        placeholderTextColor={colors.textMuted}
        style={styles.textInput}
        value={scheduledOn}
      />
      <Text style={styles.fieldLabel}>{t('meetings.form.notes')}</Text>
      <TextInput
        multiline
        numberOfLines={2}
        onChangeText={setNotes}
        placeholder={t('meetings.form.notesPlaceholder')}
        placeholderTextColor={colors.textMuted}
        style={[styles.textInput, styles.textArea]}
        value={notes}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{
          disabled: !dateValid || scheduleMutation.isPending,
        }}
        disabled={!dateValid || scheduleMutation.isPending}
        onPress={submit}
        style={[styles.submitButton, !dateValid && styles.submitButtonDisabled]}
      >
        <Text style={styles.submitButtonText}>
          {t('meetings.form.scheduleAction')}
        </Text>
      </Pressable>
    </View>
  );
}

const meetingTypes: readonly MeetingType[] = [
  'INTERVIEW',
  'VISIT',
  'MEET_AND_GREET',
  'HOME_VISIT',
];

function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
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
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 15, marginTop: 4 },
  fieldLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 12,
  },
  flex: { flex: 1 },
  notes: { color: colors.text, fontSize: 14, lineHeight: 21, marginTop: 10 },
  radio: {
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  radioGroup: { gap: 0 },
  radioLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  radioSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  result: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryButtonText: { color: colors.surface, fontWeight: '800' },
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
  status: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
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
  submitButtonDisabled: { backgroundColor: colors.surfaceMuted },
  submitButtonText: { color: colors.surface, fontSize: 16, fontWeight: '800' },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  textArea: { height: 64, textAlignVertical: 'top' },
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
  type: { color: colors.text, fontSize: 17, fontWeight: '900' },
});
