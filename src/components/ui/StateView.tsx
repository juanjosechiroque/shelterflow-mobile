import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

type StateTone = 'loading' | 'error' | 'empty' | 'info';

export interface StateViewProps {
  title: string;
  description?: string;
  tone?: StateTone;
  align?: 'start' | 'center';
  primaryAction?: { label: string; onPress: () => void };
  secondaryAction?: { label: string; onPress: () => void };
  children?: ReactNode;
}

export function StateView({
  title,
  description,
  tone = 'info',
  align = 'start',
  primaryAction,
  secondaryAction,
  children,
}: StateViewProps): React.JSX.Element {
  const isCentered = align === 'center';
  return (
    <View
      style={[
        styles.container,
        tone === 'loading' && styles.containerLoading,
        isCentered && styles.containerCentered,
      ]}
    >
      {tone === 'loading' ? (
        <View accessibilityRole="progressbar" style={styles.progressBar} />
      ) : null}
      <Text
        accessibilityRole={tone === 'error' ? 'alert' : 'header'}
        style={[
          styles.title,
          tone === 'error' && styles.titleError,
          isCentered && styles.titleCentered,
        ]}
      >
        {title}
      </Text>
      {description ? (
        <Text
          style={[styles.description, isCentered && styles.descriptionCentered]}
        >
          {description}
        </Text>
      ) : null}
      {children}
      {primaryAction || secondaryAction ? (
        <View style={styles.actions}>
          {primaryAction ? (
            <PrimaryButton
              label={primaryAction.label}
              onPress={primaryAction.onPress}
            />
          ) : null}
          {secondaryAction ? (
            <SecondaryButton
              label={secondaryAction.label}
              onPress={secondaryAction.onPress}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  containerCentered: {
    alignItems: 'stretch',
  },
  containerLoading: {
    gap: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  descriptionCentered: {
    textAlign: 'center',
  },
  progressBar: {
    backgroundColor: colors.primarySoft,
    borderRadius: 4,
    height: 6,
    marginBottom: spacing.xs,
    width: 64,
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  titleCentered: {
    textAlign: 'center',
  },
  titleError: {
    color: colors.danger,
  },
});
