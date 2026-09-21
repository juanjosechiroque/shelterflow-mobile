import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';

import { AnimalCard } from './components/animal-card';
import { mockAnimals, mockShelter } from './mock-animals';
import { filterAnimals, type AnimalFilter } from './presenters';

const filters: readonly {
  value: AnimalFilter;
  labelKey:
    | 'animals.filters.all'
    | 'animals.filters.ready'
    | 'animals.filters.inProcess'
    | 'animals.filters.adopted'
    | 'animals.filters.reevaluation';
}[] = [
  { value: 'ALL', labelKey: 'animals.filters.all' },
  { value: 'READY', labelKey: 'animals.filters.ready' },
  { value: 'IN_PROCESS', labelKey: 'animals.filters.inProcess' },
  { value: 'ADOPTED', labelKey: 'animals.filters.adopted' },
  { value: 'REEVALUATION', labelKey: 'animals.filters.reevaluation' },
];

export function AnimalsScreen() {
  const { t } = useTranslation();
  const [selectedFilter, setSelectedFilter] = useState<AnimalFilter>('ALL');
  const visibleAnimals = useMemo(
    () => filterAnimals(mockAnimals, selectedFilter),
    [selectedFilter],
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.container}
        data={visibleAnimals}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyExtractor={(animal) => animal.id}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t('animals.empty.title')}</Text>
            <Text style={styles.emptyDescription}>
              {t('animals.empty.description')}
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.shelterName}>{mockShelter.name}</Text>
            <Text accessibilityRole="header" style={styles.title}>
              {t('animals.title')}
            </Text>
            <Text style={styles.subtitle}>{t('animals.subtitle')}</Text>

            <ScrollView
              accessibilityRole="tablist"
              contentContainerStyle={styles.filters}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {filters.map(({ value, labelKey }) => {
                const isSelected = selectedFilter === value;

                return (
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isSelected }}
                    key={value}
                    onPress={() => setSelectedFilter(value)}
                    style={({ pressed }) => [
                      styles.filter,
                      isSelected && styles.filterSelected,
                      pressed && styles.filterPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterLabel,
                        isSelected && styles.filterLabelSelected,
                      ]}
                    >
                      {t(labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.resultCount}>
              {t('animals.results', { count: visibleAnimals.length })}
            </Text>
          </View>
        }
        renderItem={({ item }) => <AnimalCard animal={item} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  emptyDescription: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 28,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  filter: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 42,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterLabel: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  filterLabelSelected: {
    color: colors.surface,
  },
  filterPressed: {
    opacity: 0.72,
  },
  filterSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filters: {
    gap: 8,
    paddingRight: 20,
  },
  resultCount: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 18,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  separator: {
    height: 12,
  },
  shelterName: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.8,
    lineHeight: 40,
    marginTop: 6,
  },
});
