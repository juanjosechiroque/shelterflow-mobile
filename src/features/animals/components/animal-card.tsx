import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, spacing, typography } from '@/constants/theme';
import { Card } from '@/components/ui';
import { usePrototypeFlow } from '@/features/prototype-flow/prototype-flow-provider';
import { selectCandidatesForAnimal } from '@/features/prototype-flow/prototype-flow-selectors';

import { getAnimalSpeciesLabel, getAnimalStatusLabel } from '../presenters';
import type { MockAnimal } from '../types';
import { AnimalAvatar } from './animal-avatar';
import { StatusBadge } from './status-badge';

interface AnimalCardProps {
  animal: MockAnimal;
}

export function AnimalCard({ animal }: AnimalCardProps) {
  const { t } = useTranslation();
  const { state } = usePrototypeFlow();
  const statusLabel = getAnimalStatusLabel(t, animal.status);
  const candidateCount = selectCandidatesForAnimal(state, animal.id).length;

  return (
    <Link
      href={{
        pathname: '/animals/[animalId]',
        params: { animalId: animal.id },
      }}
      asChild
    >
      <Card
        accessibilityLabel={t('animals.card.accessibilityLabel', {
          name: animal.name,
          status: statusLabel,
        })}
        accessibilityRole="button"
        padding="comfortable"
        variant="elevated"
      >
        <View style={styles.row}>
          <AnimalAvatar animal={animal} />
          <View style={styles.content}>
            <Text numberOfLines={1} style={styles.name}>
              {animal.name}
            </Text>
            <Text style={styles.meta}>
              {getAnimalSpeciesLabel(t, animal.species)} ·{' '}
              {t('animals.candidates.count', { count: candidateCount })}
            </Text>
            <View style={styles.badgeRow}>
              <StatusBadge status={animal.status} />
            </View>
          </View>
        </View>
      </Card>
    </Link>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
    gap: spacing['2xs'],
  },
  meta: {
    ...typography.meta,
    color: colors.textMuted,
  },
  name: {
    ...typography.title,
    color: colors.text,
    fontSize: 19,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
});
