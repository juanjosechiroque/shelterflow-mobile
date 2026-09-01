import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';
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
      <Pressable
        accessibilityLabel={t('animals.card.accessibilityLabel', {
          name: animal.name,
          status: statusLabel,
        })}
        accessibilityRole="button"
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <AnimalAvatar animal={animal} />

        <View style={styles.content}>
          <Text numberOfLines={1} style={styles.name}>
            {animal.name}
          </Text>
          <Text style={styles.meta}>
            {getAnimalSpeciesLabel(t, animal.species)} ·{' '}
            {t('animals.candidates.count', { count: candidateCount })}
          </Text>
          <StatusBadge status={animal.status} />
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 16,
    minHeight: 112,
    padding: 16,
  },
  cardPressed: {
    backgroundColor: colors.surfaceMuted,
    transform: [{ scale: 0.99 }],
  },
  content: {
    flex: 1,
    gap: 7,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  name: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
});
