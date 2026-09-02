import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: string;
}

export function SectionHeader({
  title,
  description,
}: SectionHeaderProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing['2xs'],
  },
  description: {
    ...typography.subtitle,
    color: colors.textMuted,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
});
