import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';
import {
  getCurrentLanguage,
  setLanguage,
  type SupportedLanguage,
} from '@/i18n';

const languageOptions: readonly {
  language: SupportedLanguage;
  labelKey: 'settings.language.spanish' | 'settings.language.english';
}[] = [
  { language: 'es', labelKey: 'settings.language.spanish' },
  { language: 'en', labelKey: 'settings.language.english' },
];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] =
    useState(getCurrentLanguage());
  const [hasSaveError, setHasSaveError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleLanguageChange(language: SupportedLanguage) {
    setHasSaveError(false);
    setIsSaving(true);

    try {
      await setLanguage(language);
      setSelectedLanguage(language);
    } catch {
      setHasSaveError(true);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('settings.language.title')}</Text>
      <Text style={styles.description}>
        {t('settings.language.description')}
      </Text>

      <View accessibilityRole="radiogroup" style={styles.options}>
        {languageOptions.map(({ language, labelKey }) => {
          const isSelected = selectedLanguage === language;

          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected, disabled: isSaving }}
              disabled={isSaving}
              key={language}
              onPress={() => void handleLanguageChange(language)}
              style={({ pressed }) => [
                styles.option,
                isSelected && styles.optionSelected,
                isSaving && styles.optionDisabled,
                pressed && styles.optionPressed,
              ]}
            >
              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected ? <View style={styles.radioDot} /> : null}
              </View>
              <Text style={styles.optionLabel}>{t(labelKey)}</Text>
            </Pressable>
          );
        })}
      </View>

      {hasSaveError ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {t('settings.language.saveError')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
    padding: 24,
  },
  description: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 16,
  },
  option: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  optionLabel: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  optionDisabled: {
    opacity: 0.6,
  },
  optionPressed: {
    opacity: 0.75,
  },
  optionSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  options: {
    gap: 12,
    marginTop: 24,
  },
  radio: {
    alignItems: 'center',
    borderColor: colors.textMuted,
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  radioDot: {
    backgroundColor: colors.surface,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  radioSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
});
