import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, spacing, typography } from '@/constants/theme';
import { Card } from '@/components/ui';
import {
  getAnimalSpeciesLabel,
  getAnimalStatusLabel,
  getAnimalSizeLabel,
} from '@/features/animals/presenters';
import type {
  AnimalSpecies,
  AnimalSize,
  AnimalStatus,
} from '@/features/animals/types';
import type { PersistedAnimal } from '@/features/animals/persisted-animal-repository';
import { AnimalAvatar } from './animal-avatar';
import { StatusBadge } from './status-badge';

interface AnimalCardProps {
  animal: PersistedAnimal;
}

export function AnimalCard({ animal }: AnimalCardProps) {
  const { t } = useTranslation();
  const status = animal.status as AnimalStatus;
  const statusLabel = getAnimalStatusLabel(t, status);

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
              {getAnimalSpeciesLabel(t, animal.species as AnimalSpecies)} ·{' '}
              {getAnimalSizeLabel(t, animal.size as AnimalSize)}
            </Text>
            <View style={styles.badgeRow}>
              <StatusBadge status={status} />
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
