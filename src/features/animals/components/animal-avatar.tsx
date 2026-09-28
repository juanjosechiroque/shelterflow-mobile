import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';

import type { AnimalSpecies, MockAnimal } from '../types';

const toneColors: Record<MockAnimal['visualTone'], string> = {
  forest: '#D8ECDD',
  rose: '#F4DFE2',
  sand: '#F3E5C9',
  sky: '#DCEAF1',
};

const speciesSymbols: Record<AnimalSpecies, string> = {
  CAT: '●',
  DOG: '◆',
  OTHER: '■',
  UNKNOWN: '•',
};

interface AnimalAvatarProps {
  animal: MockAnimal;
  size?: 'medium' | 'large';
}

export function AnimalAvatar({ animal, size = 'medium' }: AnimalAvatarProps) {
  const isLarge = size === 'large';
  return (
    <View
      accessible={false}
      style={[
        styles.avatar,
        isLarge ? styles.avatarLarge : styles.avatarMedium,
        { backgroundColor: toneColors[animal.visualTone] },
      ]}
    >
      <Text style={[isLarge ? styles.nameLarge : styles.nameMedium]}>
        {animal.name.slice(0, 1).toUpperCase()}
      </Text>
      <Text style={[isLarge ? styles.symbolLarge : styles.symbolMedium]}>
        {speciesSymbols[animal.species]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  avatarLarge: {
    borderRadius: 28,
    height: 72,
    width: 72,
  },
  avatarMedium: {
    borderRadius: 22,
    height: 56,
    width: 56,
  },
  nameLarge: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  nameMedium: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  symbolLarge: {
    bottom: 6,
    color: colors.primary,
    fontSize: 10,
    position: 'absolute',
    right: 10,
  },
  symbolMedium: {
    bottom: 4,
    color: colors.primary,
    fontSize: 9,
    position: 'absolute',
    right: 8,
  },
});
