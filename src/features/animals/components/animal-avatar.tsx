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
  return (
    <View
      accessible={false}
      style={[
        styles.avatar,
        size === 'large' ? styles.avatarLarge : styles.avatarMedium,
        { backgroundColor: toneColors[animal.visualTone] },
      ]}
    >
      <Text style={size === 'large' ? styles.symbolLarge : styles.symbolMedium}>
        {speciesSymbols[animal.species]}
      </Text>
      <Text style={size === 'large' ? styles.nameLarge : styles.nameMedium}>
        {animal.name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    borderColor: colors.surface,
    borderWidth: 2,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  avatarLarge: {
    borderRadius: 40,
    height: 80,
    width: 80,
  },
  avatarMedium: {
    borderRadius: 30,
    height: 60,
    width: 60,
  },
  nameLarge: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  nameMedium: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  symbolLarge: {
    color: colors.primary,
    fontSize: 11,
    position: 'absolute',
    right: 12,
    top: 9,
  },
  symbolMedium: {
    color: colors.primary,
    fontSize: 9,
    position: 'absolute',
    right: 8,
    top: 6,
  },
});
