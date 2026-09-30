import { useTranslation } from 'react-i18next';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useState, type Dispatch, type SetStateAction } from 'react';
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
import { useAuth } from '@/features/auth/auth-provider';

import { colors } from '@/constants/theme';
import { formatDate } from '@/i18n/format';

import {
  getEvaluationFitLabel,
  getEvaluationRecommendationLabel,
} from './presenters';
import {
  useEvaluationByCandidate,
  useRecordEvaluationMutation,
} from '@/features/evaluations/evaluation-queries';
import type {
  EvaluationOverallFit,
  EvaluationRecommendation,
} from '@/features/evaluations/types';
import type { PersistedEvaluation } from './evaluation-repository';

export function EvaluationScreen() {
  const { t } = useTranslation();
  const { supabase, profile } = useAuth();

  const params = useLocalSearchParams<{ candidateId: string }>();
  const candidateId = Array.isArray(params.candidateId)
    ? params.candidateId[0]
    : params.candidateId;
  const shelterId = profile?.shelterId;

  const evaluationQuery = useEvaluationByCandidate(
    supabase,
    shelterId ?? '',
    candidateId ?? '',
  );

  const [overallFit, setOverallFit] = useState<EvaluationOverallFit>('STRONG');
  const [recommendation, setRecommendation] =
    useState<EvaluationRecommendation>('CONTINUE');
  const [positiveFactor, setPositiveFactor] = useState('');
  const [positiveFactors, setPositiveFactors] = useState<string[]>([]);
  const [concern, setConcern] = useState('');
  const [concerns, setConcerns] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const mutateRecordEvaluation = useRecordEvaluationMutation(
    supabase,
    shelterId ?? '',
    candidateId ?? '',
  );

  const evaluation = evaluationQuery.data;
  const showForm =
    Boolean(shelterId && candidateId) &&
    !evaluation &&
    !evaluationQuery.isLoading &&
    !evaluationQuery.isError;

  function handleSubmit() {
    if (positiveFactors.length === 0) return;

    mutateRecordEvaluation.mutate({
      overallFit,
      positiveFactors,
      concerns,
      recommendation,
      notes: notes.trim() || null,
    });
  }

  const canSubmit = positiveFactors.length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Stack.Screen options={{ title: t('evaluations.title') }} />

        {!shelterId || !candidateId ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              {t('evaluations.emptyTitle')}
            </Text>
            <Text style={styles.muted}>
              {t('evaluations.emptyDescription')}
            </Text>
          </View>
        ) : evaluationQuery.isLoading ? (
          <Text accessibilityRole="progressbar" style={styles.muted}>
            {t('evaluations.loading')}
          </Text>
        ) : evaluationQuery.isError ? (
          <View style={styles.card}>
            <Text accessibilityRole="alert" style={styles.muted}>
              {t('evaluations.loadError')}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void evaluationQuery.refetch()}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : evaluation ? (
          <EvaluationSummary evaluation={evaluation} />
        ) : showForm ? (
          <EvaluationForm
            onSubmit={handleSubmit}
            overallFit={overallFit}
            setOverallFit={setOverallFit}
            recommendation={recommendation}
            setRecommendation={setRecommendation}
            positiveFactors={positiveFactors}
            setPositiveFactors={setPositiveFactors}
            concern={concern}
            setConcern={setConcern}
            concerns={concerns}
            setConcerns={setConcerns}
            positiveFactor={positiveFactor}
            setPositiveFactor={setPositiveFactor}
            notes={notes}
            setNotes={setNotes}
            canSubmit={canSubmit}
            isMutating={mutateRecordEvaluation.isPending}
          />
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('evaluations.title')}</Text>
            <Text style={styles.muted}>
              {t('evaluations.emptyDescription')}
            </Text>
            <Link
              href={{
                pathname: '/animals/candidate/[candidateId]',
                params: { candidateId },
              }}
              asChild
            >
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.backButtonPressed,
                ]}
              >
                <Text style={styles.backButtonText}>
                  {t('evaluations.backToCandidate')}
                </Text>
              </Pressable>
            </Link>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function EvaluationSummary({
  evaluation,
}: {
  evaluation: PersistedEvaluation;
}) {
  const { t } = useTranslation();

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('evaluations.summary')}</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('evaluations.fit')}</Text>
          <Text style={styles.summaryValue}>
            {getEvaluationFitLabel(t, evaluation.overallFit)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('evaluations.recordedOn')}</Text>
          <Text style={styles.summaryValue}>
            {formatDate(new Date(evaluation.createdAt), {
              dateStyle: 'medium',
            })}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {t('evaluations.positiveFactors')}
        </Text>
        {evaluation.positiveFactors.length > 0 ? (
          evaluation.positiveFactors.map((factor: string) => (
            <Text key={factor} style={styles.bullet}>
              • {factor}
            </Text>
          ))
        ) : (
          <Text style={styles.muted}>{t('evaluations.noConcerns')}</Text>
        )}
        <Text style={[styles.sectionTitle, styles.spacedTop]}>
          {t('evaluations.concerns')}
        </Text>
        {evaluation.concerns.length === 0 ? (
          <Text style={styles.muted}>{t('evaluations.noConcerns')}</Text>
        ) : (
          evaluation.concerns.map((concern: string) => (
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
    </>
  );
}

function EvaluationForm({
  onSubmit,
  overallFit,
  setOverallFit,
  recommendation,
  setRecommendation,
  positiveFactors,
  setPositiveFactors,
  positiveFactor,
  setPositiveFactor,
  concern,
  setConcern,
  concerns,
  setConcerns,
  notes,
  setNotes,
  canSubmit,
  isMutating,
}: {
  onSubmit: () => void;
  overallFit: EvaluationOverallFit;
  setOverallFit: (val: EvaluationOverallFit) => void;
  recommendation: EvaluationRecommendation;
  setRecommendation: (val: EvaluationRecommendation) => void;
  positiveFactors: string[];
  setPositiveFactors: Dispatch<SetStateAction<string[]>>;
  positiveFactor: string;
  setPositiveFactor: (val: string) => void;
  concern: string;
  setConcern: (val: string) => void;
  concerns: string[];
  setConcerns: Dispatch<SetStateAction<string[]>>;
  notes: string;
  setNotes: (val: string) => void;
  canSubmit: boolean;
  isMutating: boolean;
}) {
  const { t } = useTranslation();

  function addPositiveFactor() {
    const trimmed = positiveFactor.trim();
    if (trimmed && !positiveFactors.includes(trimmed)) {
      setPositiveFactors((prev) => [...prev, trimmed]);
      setPositiveFactor('');
    }
  }

  function addConcern() {
    const trimmed = concern.trim();
    if (trimmed && !concerns.includes(trimmed)) {
      setConcerns((prev) => [...prev, trimmed]);
      setConcern('');
    }
  }

  function removeConcern(c: string) {
    setConcerns((prev) => prev.filter((item) => item !== c));
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('evaluations.form.title')}</Text>

      <Text style={styles.fieldLabel}>{t('evaluations.form.overallFit')}</Text>
      <View style={styles.radioGroup}>
        {(
          [
            { value: 'STRONG', label: t('evaluations.fits.strong') },
            { value: 'POSSIBLE', label: t('evaluations.fits.possible') },
            { value: 'CONCERNS', label: t('evaluations.fits.concerns') },
          ] as const
        ).map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: overallFit === option.value }}
            onPress={() => setOverallFit(option.value)}
            style={[
              styles.radio,
              overallFit === option.value && styles.radioSelected,
            ]}
          >
            <Text
              style={[
                styles.radioLabel,
                overallFit === option.value && styles.radioLabelSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.fieldLabel}>
        {t('evaluations.form.positiveFactors')}
      </Text>
      {positiveFactors.map((factor) => (
        <Pressable
          key={factor}
          onPress={() =>
            setPositiveFactors((prev) => prev.filter((f) => f !== factor))
          }
          style={styles.chip}
        >
          <Text style={styles.chipText}>{factor} ✕</Text>
        </Pressable>
      ))}
      <TextInput
        accessibilityLabel={t('evaluations.form.positiveFactors')}
        onChangeText={setPositiveFactor}
        placeholder={t('evaluations.form.positiveFactorPlaceholder')}
        placeholderTextColor={colors.textMuted}
        style={styles.textInput}
        value={positiveFactor}
      />
      <Pressable
        accessibilityRole="button"
        onPress={addPositiveFactor}
        style={({ pressed }) => [
          styles.addButton,
          pressed && styles.addButtonPressed,
        ]}
      >
        <Text style={styles.addButtonText}>+</Text>
      </Pressable>

      <Text style={styles.fieldLabel}>{t('evaluations.form.concerns')}</Text>
      {concerns.map((c) => (
        <Pressable key={c} onPress={() => removeConcern(c)} style={styles.chip}>
          <Text style={styles.chipText}>{c} ✕</Text>
        </Pressable>
      ))}
      <TextInput
        accessibilityLabel={t('evaluations.form.concerns')}
        onChangeText={setConcern}
        placeholder={t('evaluations.form.concernPlaceholder')}
        placeholderTextColor={colors.textMuted}
        style={styles.textInput}
        value={concern}
      />
      <Pressable
        accessibilityRole="button"
        onPress={addConcern}
        style={({ pressed }) => [
          styles.addButton,
          pressed && styles.addButtonPressed,
        ]}
      >
        <Text style={styles.addButtonText}>+</Text>
      </Pressable>

      <Text style={styles.fieldLabel}>{t('evaluations.notes')}</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder={t('evaluations.form.notesPlaceholder')}
        placeholderTextColor={colors.textMuted}
        style={[styles.textInput, styles.textArea]}
        multiline
        numberOfLines={3}
      />

      <Text style={styles.fieldLabel}>
        {t('evaluations.form.recommendation')}
      </Text>
      <View style={styles.radioGroup}>
        {(
          [
            {
              value: 'CONTINUE',
              label: t('evaluations.recommendations.continue'),
            },
            {
              value: 'MORE_INFORMATION',
              label: t('evaluations.recommendations.moreInformation'),
            },
            {
              value: 'DO_NOT_CONTINUE',
              label: t('evaluations.recommendations.doNotContinue'),
            },
          ] as const
        ).map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: recommendation === option.value }}
            onPress={() => setRecommendation(option.value)}
            style={[
              styles.radio,
              recommendation === option.value && styles.radioSelected,
            ]}
          >
            <Text
              style={[
                styles.radioLabel,
                recommendation === option.value && styles.radioLabelSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSubmit || isMutating }}
        disabled={!canSubmit || isMutating}
        onPress={onSubmit}
        style={({ pressed }) => [
          styles.submitButton,
          !canSubmit && styles.submitButtonDisabled,
          pressed && styles.submitButtonPressed,
        ]}
      >
        <Text style={styles.submitButtonText}>
          {t('evaluations.form.submit')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  addButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  addButtonText: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: '800',
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 50,
    paddingHorizontal: 20,
  },
  backButtonPressed: {
    backgroundColor: colors.primaryPressed,
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
  chip: {
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  container: {
    backgroundColor: colors.background,
    padding: 20,
    paddingBottom: 48,
  },
  description: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
    textAlign: 'center',
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 14,
  },
  flex: {
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
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
  submitButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 54,
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
    fontSize: 17,
    fontWeight: '900',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  textInput: {
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
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
