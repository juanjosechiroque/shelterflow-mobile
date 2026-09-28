import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, spacing, typography } from '@/constants/theme';

export interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'start' | 'center';
}

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  align = 'start',
}: ScreenHeaderProps): React.JSX.Element {
  const { t } = useTranslation();
  const isCentered = align === 'center';
  return (
    <View style={[styles.container, isCentered && styles.containerCentered]}>
      {eyebrow ? (
        <Text style={[styles.eyebrow, isCentered && styles.eyebrowCentered]}>
          {eyebrow}
        </Text>
      ) : null}
      <Text
        accessibilityRole="header"
        style={[styles.title, isCentered && styles.titleCentered]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, isCentered && styles.subtitleCentered]}>
          {subtitle}
        </Text>
      ) : null}
      <Text style={styles.srOnly} accessible={false}>
        {t('app.name')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  containerCentered: {
    alignItems: 'center',
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.primary,
  },
  eyebrowCentered: {
    textAlign: 'center',
  },
  srOnly: {
    height: 0,
    opacity: 0,
    position: 'absolute',
    width: 0,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.textMuted,
  },
  subtitleCentered: {
    textAlign: 'center',
  },
  title: {
    ...typography.display,
    color: colors.text,
  },
  titleCentered: {
    textAlign: 'center',
  },
});
