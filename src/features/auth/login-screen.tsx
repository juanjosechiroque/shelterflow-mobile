import { useState, type FormEvent } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { PrimaryButton, ScreenHeader } from '@/components/ui';

import { useAuth, type SignInError } from './auth-provider';

export interface LoginScreenProps {
  redirectAfterSignIn?: Href;
}

function describeSignInError(
  t: ReturnType<typeof useTranslation>['t'],
  error: SignInError,
): string {
  if (error.status === 'invalid_credentials') {
    return t('auth.errors.invalidCredentials');
  }
  if (error.status === 'config_missing') {
    return t('auth.errors.configMissing');
  }
  return t('auth.errors.unknown');
}

export function LoginScreen({
  redirectAfterSignIn = '/' as Href,
}: LoginScreenProps = {}): React.JSX.Element {
  const { t } = useTranslation();
  const { signIn, hasSupabaseConfig } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasError, setHasError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const configMissing = !hasSupabaseConfig;
  const isDisabled = isSubmitting || configMissing || !email || !password;

  async function handleSubmit(event?: FormEvent): Promise<void> {
    event?.preventDefault?.();
    if (isDisabled) return;
    setHasError(null);
    setIsSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
      router.replace(redirectAfterSignIn);
    } catch (error) {
      const mapped: SignInError =
        typeof (error as SignInError)?.status === 'string'
          ? (error as SignInError)
          : { status: 'unknown', message: String(error) };
      setHasError(describeSignInError(t, mapped));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <ScreenHeader
              eyebrow={t('auth.eyebrow')}
              title={t('auth.title')}
              subtitle={t('auth.subtitle')}
            />
          </View>

          {configMissing ? (
            <View style={styles.banner}>
              <Text accessibilityRole="alert" style={styles.bannerText}>
                {t('auth.errors.configMissing')}
              </Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>{t('auth.fields.email')}</Text>
            <TextInput
              accessibilityLabel={t('auth.fields.email')}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              editable={!isSubmitting}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder={t('auth.fields.emailPlaceholder')}
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              value={email}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('auth.fields.password')}</Text>
            <TextInput
              accessibilityLabel={t('auth.fields.password')}
              autoCapitalize="none"
              autoComplete="password"
              autoCorrect={false}
              editable={!isSubmitting}
              onChangeText={setPassword}
              onSubmitEditing={() => void handleSubmit()}
              placeholder={t('auth.fields.passwordPlaceholder')}
              placeholderTextColor={colors.textSubtle}
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>

          {hasError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {hasError}
            </Text>
          ) : null}

          <View style={styles.submit}>
            <PrimaryButton
              accessibilityLabel={t('auth.submit')}
              disabled={isDisabled}
              fullWidth
              label={t('auth.submit')}
              loading={isSubmitting}
              onPress={() => void handleSubmit()}
            />
          </View>

          <Text style={styles.note}>{t('auth.devNote')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bannerText: {
    ...typography.body,
    color: colors.danger,
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['3xl'],
  },
  error: {
    ...typography.body,
    color: colors.danger,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  field: {
    marginBottom: spacing.md,
  },
  flex: {
    flex: 1,
  },
  header: {
    marginBottom: spacing.xl,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  label: {
    ...typography.metaStrong,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  note: {
    ...typography.meta,
    color: colors.textSubtle,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  submit: {
    marginTop: spacing.md,
  },
});
