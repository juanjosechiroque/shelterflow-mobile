import { useState, type FormEvent } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';

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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>{t('auth.eyebrow')}</Text>
        <Text style={styles.title}>{t('auth.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>

        {configMissing ? (
          <Text accessibilityRole="alert" style={styles.banner}>
            {t('auth.errors.configMissing')}
          </Text>
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
            placeholderTextColor={colors.textMuted}
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
            placeholderTextColor={colors.textMuted}
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

        <Pressable
          accessibilityRole="button"
          disabled={isDisabled}
          onPress={() => void handleSubmit()}
          style={({ pressed }) => [
            styles.button,
            isDisabled && styles.buttonDisabled,
            pressed && !isDisabled && styles.buttonPressed,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.buttonLabel}>{t('auth.submit')}</Text>
          )}
        </Pressable>

        <Text style={styles.note}>{t('auth.devNote')}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFE7E0',
    borderColor: colors.danger,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    padding: 12,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    color: colors.surface,
    fontSize: 17,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  flex: {
    backgroundColor: colors.background,
    flex: 1,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 17,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  note: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
});
