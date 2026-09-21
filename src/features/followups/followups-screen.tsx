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
  selectActiveAdoptionForAnimal,
  selectFollowUpsForAnimal,
  canCompleteFollowUp,
} from '@/features/prototype-flow/prototype-flow-selectors';
import type {
  MockFollowUp,
  FollowUpOutcome,
} from '@/features/prototype-flow/types';
import { formatDate } from '@/i18n/format';
import { getFollowUpOutcomeLabel, getFollowUpStatusLabel } from './presenters';

export function FollowUpsScreen() {
  const { t } = useTranslation();
  const { state } = usePrototypeFlow();
  const params = useLocalSearchParams<{ animalId: string }>();
  const animalId = Array.isArray(params.animalId)
    ? params.animalId[0]
    : params.animalId;
  const animal = selectAnimalById(state, animalId);
  const adoption = selectActiveAdoptionForAnimal(state, animalId);
  const followUps = selectFollowUpsForAnimal(state, animalId);

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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
          followUps.map((followUp) => (
            <FollowUpCard key={followUp.id} followUp={followUp} />
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FollowUpCard({ followUp }: { followUp: MockFollowUp }) {
  const { t } = useTranslation();
  const { state, commands } = usePrototypeFlow();
  const [outcome, setOutcome] = useState<FollowUpOutcome>('GOOD');
  const [notes, setNotes] = useState('');

  const isDone = followUp.status === 'COMPLETED';
  const canComplete = canCompleteFollowUp(state, followUp.id);

  function handleComplete() {
    commands.completeFollowUp(followUp.id, outcome, notes.trim() || undefined);
  }

  return (
    <View style={[styles.card, isDone && styles.cardDone]}>
      <View style={styles.cardTop}>
        <Text style={styles.dueDate}>
          {formatDate(new Date(followUp.dueDate + 'T12:00:00'), {
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

      {canComplete ? (
        <View style={styles.completeSection}>
          <Text style={styles.fieldLabel}>{t('followups.form.outcome')}</Text>
          <View style={styles.radioGroup}>
            {(
              [
                {
                  value: 'EXCELLENT',
                  label: t('followups.outcomes.excellent'),
                },
                { value: 'GOOD', label: t('followups.outcomes.good') },
                { value: 'CONCERNS', label: t('followups.outcomes.concerns') },
                {
                  value: 'INTERVENTION_REQUIRED',
                  label: t('followups.outcomes.interventionRequired'),
                },
              ] as const
            ).map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: outcome === option.value }}
                onPress={() => setOutcome(option.value)}
                style={[
                  styles.radio,
                  outcome === option.value && styles.radioSelected,
                ]}
              >
                <Text
                  style={[
                    styles.radioLabel,
                    outcome === option.value && styles.radioLabelSelected,
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
            placeholder={t('followups.form.notesPlaceholder')}
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
              {t('followups.form.completeAction')}
            </Text>
          </Pressable>
        </View>
      ) : null}
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
  cardDone: {
    backgroundColor: colors.surfaceMuted,
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
  fieldLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 6,
  },
  flex: {
    flex: 1,
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
});
