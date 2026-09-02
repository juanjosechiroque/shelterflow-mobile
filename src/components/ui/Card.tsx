import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';

type CardVariant = 'elevated' | 'subtle' | 'flat';

export interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  padding?: 'compact' | 'comfortable' | 'spacious';
  onPress?: () => void;
  accessibilityRole?: 'button' | 'link';
  accessibilityLabel?: string;
  accessibilityState?: { disabled?: boolean };
}

export function Card({
  children,
  variant = 'elevated',
  padding = 'comfortable',
  onPress,
  accessibilityRole,
  accessibilityLabel,
  accessibilityState,
}: CardProps): React.JSX.Element {
  const containerStyle = [
    styles.base,
    variantStyles[variant],
    paddings[padding],
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
        onPress={onPress}
        style={({ pressed }) => [containerStyle, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
});

const variantStyles = StyleSheet.create({
  elevated: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  flat: {
    backgroundColor: 'transparent',
  },
  subtle: {
    backgroundColor: colors.surfaceSunken,
  },
});

const paddings = StyleSheet.create({
  compact: {
    padding: spacing.sm,
  },
  comfortable: {
    padding: spacing.md,
  },
  spacious: {
    padding: spacing.lg,
  },
});
