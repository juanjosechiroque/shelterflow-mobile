import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import {
  getCurrentLanguage,
  setLanguage,
  type SupportedLanguage,
} from '@/i18n';

import { useAuth } from '@/features/auth/auth-provider';

const languageOptions: readonly {
  language: SupportedLanguage;
  labelKey: 'settings.language.spanish' | 'settings.language.english';
}[] = [
  { language: 'es', labelKey: 'settings.language.spanish' },
  { language: 'en', labelKey: 'settings.language.english' },
];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { profile, shelter, email, signOut } = useAuth();
  const [selectedLanguage, setSelectedLanguage] =
    useState(getCurrentLanguage());
  const [hasSaveError, setHasSaveError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        testID="settings-scroll-view"
      >
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
                <View
                  style={[styles.radio, isSelected && styles.radioSelected]}
                >
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

        <View style={styles.shelterSection}>
          <Text style={styles.shelterTitle}>{t('settings.shelter.title')}</Text>
          <Text style={styles.shelterHint}>
            {t('settings.shelter.readOnly')}
          </Text>

          <View style={styles.shelterCard}>
            <View style={styles.shelterRow}>
              <Text style={styles.shelterLabel}>
                {t('settings.shelter.shelterName')}
              </Text>
              <Text style={styles.shelterValue}>
                {shelter ? shelter.name : '—'}
              </Text>
            </View>
            <View style={styles.shelterRow}>
              <Text style={styles.shelterLabel}>
                {t('settings.shelter.shelterCountry')}
              </Text>
              <Text style={styles.shelterValue}>
                {shelter ? shelter.country : '—'}
              </Text>
            </View>
            <View style={styles.shelterRow}>
              <Text style={styles.shelterLabel}>
                {t('settings.shelter.displayName')}
              </Text>
              <Text style={styles.shelterValue}>
                {profile ? profile.displayName : '—'}
              </Text>
            </View>
            <View style={styles.shelterRow}>
              <Text style={styles.shelterLabel}>
                {t('settings.shelter.email')}
              </Text>
              <Text style={styles.shelterValue}>{email ?? '—'}</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={isSigningOut}
            onPress={() => void handleSignOut()}
            style={({ pressed }) => [
              styles.logoutButton,
              isSigningOut && styles.logoutButtonDisabled,
              pressed && !isSigningOut && styles.logoutButtonPressed,
            ]}
          >
            {isSigningOut ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.logoutLabel}>
                {t('settings.shelter.logout')}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
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
  logoutButton: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  logoutButtonDisabled: {
    opacity: 0.5,
  },
  logoutButtonPressed: {
    opacity: 0.85,
  },
  logoutLabel: {
    color: colors.surface,
    fontSize: 17,
    fontWeight: '700',
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
  optionDisabled: {
    opacity: 0.6,
  },
  optionLabel: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
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
  shelterCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    padding: 16,
  },
  shelterHint: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  shelterLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  shelterRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  shelterSection: {
    marginTop: 40,
  },
  shelterTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  shelterValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
});
