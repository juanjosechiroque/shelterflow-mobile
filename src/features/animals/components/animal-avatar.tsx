import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';

import type { AnimalSpecies } from '../types';

const speciesSymbols: Record<AnimalSpecies, string> = {
  CAT: '●',
  DOG: '◆',
  OTHER: '■',
  UNKNOWN: '•',
};

function speciesSymbol(species: string): string {
  return speciesSymbols[species as AnimalSpecies] ?? speciesSymbols.UNKNOWN;
}

interface AnimalAvatarProps {
  animal: { name: string; species: string };
}

export function AnimalAvatar({ animal }: AnimalAvatarProps) {
  return (
    <View
      accessible={false}
      style={[styles.avatar, { backgroundColor: colors.surface }]}
    >
      <Text style={styles.name}>{animal.name.slice(0, 1).toUpperCase()}</Text>
      <Text style={styles.symbol}>{speciesSymbol(animal.species)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 28,
    height: 56,
    width: 56,
  },
  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  symbol: {
    color: colors.primary,
    fontSize: 14,
    marginTop: 4,
  },
});
