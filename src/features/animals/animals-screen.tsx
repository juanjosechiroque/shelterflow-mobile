import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/auth-provider';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { ScreenHeader, StateView } from '@/components/ui';
import { AnimalCard } from './components/animal-card';
import { filterAnimals, type AnimalFilter } from './presenters';
import { useAnimalsForShelter } from './persisted-animal-queries';

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
  const { supabase, profile } = useAuth();

  const shelterId = profile?.shelterId ?? null;
  const [selectedFilter, setSelectedFilter] = useState<AnimalFilter>('ALL');

  const { data, isLoading, isError, isFetching, refetch } =
    useAnimalsForShelter(supabase, shelterId);

  const visibleAnimals = useMemo(
    () => filterAnimals(data ?? [], selectedFilter),
    [data, selectedFilter],
  );

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.stateWrapper}>
          <Text accessibilityRole="progressbar" style={styles.stateText}>
            {t('animals.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.stateWrapper}>
          <StateView
            title={t('animals.loadErrorTitle')}
            description={t('animals.loadErrorDescription')}
            tone="error"
            primaryAction={{
              label: t('animals.refresh'),
              onPress: () => {
                void refetch();
              },
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.container}
        data={visibleAnimals}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyExtractor={(animal) => animal.id}
        ListEmptyComponent={
          <View style={styles.emptyWrapper}>
            <StateView
              title={t('animals.empty.title')}
              description={t('animals.empty.description')}
              tone="empty"
            />
          </View>
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.shelterEyebrow}>
              {profile?.shelterName ?? ''}
            </Text>
            <View style={styles.headerBody}>
              <ScreenHeader
                subtitle={t('animals.subtitle')}
                title={t('animals.title')}
              />
            </View>

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
                      pressed && !isSelected && styles.filterPressed,
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
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={() => {
              void refetch();
            }}
            title={t('animals.refresh')}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingBottom: spacing['2xl'],
    paddingHorizontal: spacing.lg,
  },
  emptyWrapper: {
    marginTop: spacing['2xl'],
  },
  filter: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  filterLabel: {
    ...typography.metaStrong,
    color: colors.textMuted,
    textTransform: 'none',
  },
  filterLabelSelected: {
    color: colors.onPrimary,
  },
  filterPressed: {
    backgroundColor: colors.surfaceSunken,
  },
  filterSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filters: {
    gap: spacing.xs,
    paddingRight: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerBody: {
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  resultCount: {
    ...typography.meta,
    color: colors.textSubtle,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  separator: {
    height: spacing.xs,
  },
  shelterEyebrow: {
    ...typography.eyebrow,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  stateText: {
    ...typography.body,
    color: colors.textMuted,
  },
  stateWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
});
