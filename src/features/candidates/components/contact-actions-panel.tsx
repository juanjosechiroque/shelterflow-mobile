import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  Card,
  PrimaryButton,
  SectionHeader,
  SecondaryButton,
} from '@/components/ui';
import { colors, radii, spacing, typography } from '@/constants/theme';

import {
  buildTelephoneUrl,
  buildWhatsAppUrl,
  openContactUrl,
  type ContactChannel,
  type OpenContactResult,
} from '../contact-actions';
import {
  contactOutcomes,
  localContactLogStore,
  type ContactLogEntry,
  type ContactLogStore,
  type ContactOutcome,
} from '../local-contact-log';
import { getContactChannelLabel, getContactOutcomeLabel } from '../presenters';

export interface ContactActionsPanelProps {
  candidateId: string;
  personName: string;
  phone: string | null;
  store?: ContactLogStore;
  openUrl?: (url: string) => Promise<OpenContactResult>;
}

export function ContactActionsPanel({
  candidateId,
  personName,
  phone,
  store = localContactLogStore,
  openUrl = openContactUrl,
}: ContactActionsPanelProps) {
  const { t } = useTranslation();

  const telephoneUrl = useMemo(() => buildTelephoneUrl(phone), [phone]);
  const whatsappUrl = useMemo(() => buildWhatsAppUrl(phone), [phone]);
  const isNumberUsable = telephoneUrl !== null && whatsappUrl !== null;

  const [activeChannel, setActiveChannel] = useState<ContactChannel | null>(
    null,
  );
  const [attempt, setAttempt] = useState<{
    channel: ContactChannel;
    result: OpenContactResult;
  } | null>(null);
  const [showOutcomeForm, setShowOutcomeForm] = useState(false);

  const [outcome, setOutcome] = useState<ContactOutcome | null>(null);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [savedEntry, setSavedEntry] = useState<ContactLogEntry | null>(null);
  const [history, setHistory] = useState<{
    candidateId: string;
    entries: ContactLogEntry[];
  }>({ candidateId, entries: [] });

  const actionInFlight = useRef(false);
  const saveInFlight = useRef(false);

  useEffect(() => {
    let isMounted = true;
    void store
      .list(candidateId)
      .then((entries) => {
        if (!isMounted) return;
        setHistory((current) => {
          if (current.candidateId !== candidateId) {
            return { candidateId, entries };
          }
          const loadedIds = new Set(entries.map((entry) => entry.id));
          return {
            candidateId,
            entries: [
              ...entries,
              ...current.entries.filter((entry) => !loadedIds.has(entry.id)),
            ],
          };
        });
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, [candidateId, store]);

  async function handleContact(channel: ContactChannel) {
    const url = channel === 'phone' ? telephoneUrl : whatsappUrl;
    if (!url || actionInFlight.current) return;

    actionInFlight.current = true;
    setActiveChannel(channel);
    setAttempt(null);
    try {
      const result = await openUrl(url);
      setAttempt({ channel, result });
    } finally {
      actionInFlight.current = false;
      setActiveChannel(null);
      // Any attempt, successful or not, lets the user record what actually
      // happened. Opening an application is not proof that contact occurred.
      setShowOutcomeForm(true);
    }
  }

  async function handleSave() {
    if (outcome === null || saveInFlight.current) return;

    saveInFlight.current = true;
    setIsSaving(true);
    setSaveError(false);
    try {
      const entry = await store.record({
        candidateId,
        channel: attempt?.channel ?? 'phone',
        outcome,
        notes: notes.trim().length > 0 ? notes.trim() : null,
      });
      setSavedEntry(entry);
      setHistory((current) => {
        if (current.candidateId !== candidateId) return current;
        return { candidateId, entries: [...current.entries, entry] };
      });
      setShowOutcomeForm(false);
    } catch {
      setSaveError(true);
    } finally {
      saveInFlight.current = false;
      setIsSaving(false);
    }
  }

  const isBusy = activeChannel !== null;
  const historyEntries =
    history.candidateId === candidateId ? history.entries : [];

  return (
    <View style={styles.section}>
      <SectionHeader title={t('candidates.contact.title')} />

      {!isNumberUsable ? (
        <Card padding="comfortable" variant="subtle">
          <Text accessibilityRole="alert" style={styles.hint}>
            {t('candidates.contact.invalidNumber', { name: personName })}
          </Text>
        </Card>
      ) : (
        <View style={styles.buttonRow}>
          <View style={styles.buttonCell}>
            <PrimaryButton
              accessibilityLabel={t('candidates.contact.call')}
              disabled={isBusy}
              fullWidth
              label={
                activeChannel === 'phone'
                  ? t('candidates.contact.openingCall')
                  : t('candidates.contact.call')
              }
              loading={activeChannel === 'phone'}
              onPress={() => void handleContact('phone')}
            />
          </View>
          <View style={styles.buttonCell}>
            <PrimaryButton
              accessibilityLabel={t('candidates.contact.whatsapp')}
              disabled={isBusy}
              fullWidth
              label={
                activeChannel === 'whatsapp'
                  ? t('candidates.contact.openingWhatsApp')
                  : t('candidates.contact.whatsapp')
              }
              loading={activeChannel === 'whatsapp'}
              onPress={() => void handleContact('whatsapp')}
            />
          </View>
        </View>
      )}

      {activeChannel ? (
        <Text accessibilityRole="progressbar" style={styles.hint}>
          {activeChannel === 'phone'
            ? t('candidates.contact.openingCall')
            : t('candidates.contact.openingWhatsApp')}
        </Text>
      ) : null}

      {attempt?.result.status === 'opened' ? (
        <Text style={styles.hint}>{t('candidates.contact.startedHint')}</Text>
      ) : null}

      {attempt?.result.status === 'unsupported' ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {t('candidates.contact.appUnavailable')}
        </Text>
      ) : null}

      {attempt?.result.status === 'error' ? (
        <View style={styles.errorRow}>
          <Text accessibilityRole="alert" style={styles.error}>
            {t('candidates.contact.openError')}
          </Text>
          <SecondaryButton
            accessibilityLabel={t('common.retry')}
            disabled={isBusy}
            fullWidth={false}
            label={t('common.retry')}
            onPress={() => void handleContact(attempt.channel)}
          />
        </View>
      ) : null}

      {showOutcomeForm && !savedEntry ? (
        <Card padding="comfortable" variant="elevated">
          <Text style={styles.formTitle}>
            {t('candidates.contact.outcomeTitle')}
          </Text>
          <Text style={styles.formHint}>
            {t('candidates.contact.outcomeHint', { name: personName })}
          </Text>

          <View style={styles.outcomeList}>
            {contactOutcomes.map((value) => {
              const isSelected = outcome === value;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  key={value}
                  onPress={() => setOutcome(value)}
                  style={({ pressed }) => [
                    styles.outcomeOption,
                    isSelected && styles.outcomeOptionSelected,
                    pressed && !isSelected && styles.outcomeOptionPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.outcomeLabel,
                      isSelected && styles.outcomeLabelSelected,
                    ]}
                  >
                    {getContactOutcomeLabel(t, value)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>{t('candidates.contact.notes')}</Text>
          <TextInput
            accessibilityLabel={t('candidates.contact.notes')}
            editable={!isSaving}
            multiline
            onChangeText={setNotes}
            placeholder={t('candidates.contact.notesPlaceholder')}
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
            value={notes}
          />

          {outcome === null && !isSaving ? (
            <Text accessibilityRole="alert" style={styles.hint}>
              {t('candidates.contact.selectOutcome')}
            </Text>
          ) : null}
          {saveError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {t('candidates.contact.saveError')}
            </Text>
          ) : null}

          <View style={styles.saveAction}>
            <PrimaryButton
              accessibilityLabel={t('candidates.contact.save')}
              disabled={isSaving || outcome === null}
              fullWidth
              label={
                isSaving
                  ? t('candidates.contact.saving')
                  : t('candidates.contact.save')
              }
              loading={isSaving}
              onPress={() => void handleSave()}
            />
          </View>
        </Card>
      ) : null}

      {savedEntry ? (
        <Card padding="comfortable" variant="elevated">
          <Text accessibilityRole="header" style={styles.formTitle}>
            {t('candidates.contact.savedTitle')}
          </Text>
          <Text style={styles.formHint}>
            {getContactOutcomeLabel(t, savedEntry.outcome)} ·{' '}
            {t('candidates.contact.savedDescription')}
          </Text>
        </Card>
      ) : null}

      <View style={styles.historySection}>
        <Text style={styles.fieldLabel}>
          {t('candidates.contact.historyTitle')}
        </Text>
        {historyEntries.length === 0 ? (
          <Text style={styles.hint}>
            {t('candidates.contact.historyEmpty')}
          </Text>
        ) : (
          historyEntries.map((entry) => (
            <View key={entry.id} style={styles.historyRow}>
              <Text style={styles.historyMeta}>
                {getContactChannelLabel(t, entry.channel)} ·{' '}
                {getContactOutcomeLabel(t, entry.outcome)}
              </Text>
              {entry.notes ? (
                <Text style={styles.historyNotes}>{entry.notes}</Text>
              ) : null}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonCell: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  error: {
    ...typography.body,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  errorRow: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  fieldLabel: {
    ...typography.metaStrong,
    color: colors.textSubtle,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
    textTransform: 'uppercase',
  },
  formHint: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing['2xs'],
  },
  formTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 18,
  },
  hint: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  historyMeta: {
    ...typography.metaStrong,
    color: colors.text,
  },
  historyNotes: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing['2xs'],
  },
  historyRow: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  historySection: {
    marginTop: spacing.lg,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    color: colors.text,
    fontSize: 15,
    minHeight: 80,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  outcomeLabel: {
    ...typography.metaStrong,
    color: colors.textMuted,
    textTransform: 'none',
  },
  outcomeLabelSelected: {
    color: colors.onPrimary,
  },
  outcomeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  outcomeOption: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  outcomeOptionPressed: {
    backgroundColor: colors.surfaceSunken,
  },
  outcomeOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  saveAction: {
    marginTop: spacing.md,
  },
  section: {
    marginTop: spacing.xl,
  },
});
