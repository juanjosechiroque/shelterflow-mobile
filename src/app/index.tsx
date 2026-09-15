import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';

export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>{t('foundation.eyebrow')}</Text>
        <Text style={styles.title}>{t('foundation.title')}</Text>
        <Text style={styles.description}>{t('foundation.description')}</Text>
      </View>

      <Link href="/settings" asChild>
        <Pressable accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonText}>
            {t('foundation.settingsAction')}
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 32,
  },
  content: {
    marginTop: 48,
  },
  description: {
    color: colors.textMuted,
    fontSize: 18,
    lineHeight: 27,
    marginTop: 16,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 42,
    marginTop: 12,
  },
});
