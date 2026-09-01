import { Link } from 'expo-router';
import type { TFunction } from 'i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { mockShelter } from '@/features/animals/mock-animals';
import { usePrototypeFlow } from '@/features/prototype-flow/prototype-flow-provider';
import { selectTodayTasks } from '@/features/prototype-flow/prototype-flow-selectors';
import type { MockTodayTask } from '@/features/prototype-flow/types';

const taskToneStyles: Record<
  MockTodayTask['tone'],
  { backgroundColor: string; color: string }
> = {
  info: { backgroundColor: colors.infoSoft, color: colors.info },
  primary: { backgroundColor: colors.primarySoft, color: colors.primary },
  warning: { backgroundColor: colors.warningSoft, color: colors.warning },
};

function getTaskTitle(t: TFunction, task: MockTodayTask): string {
  switch (task.kind) {
    case 'evaluations':
      return t('today.tasks.evaluations', { count: task.count });
    case 'meeting':
      return t('today.tasks.meetings', { count: task.count });
    case 'decisions':
      return t('today.tasks.decisions', { count: task.count });
    case 'followups':
      return t('today.tasks.followups', { count: task.count });
    case 'reevaluation':
      return t('today.tasks.reevaluations', { count: task.count });
  }
}

function getTaskHint(t: TFunction, task: MockTodayTask): string {
  switch (task.kind) {
    case 'evaluations':
      return t('today.hints.evaluations', { animalName: task.animalName });
    case 'meeting':
      return t('today.hints.meetings', { animalName: task.animalName });
    case 'decisions':
      return t('today.hints.decisions', { animalName: task.animalName });
    case 'followups':
      return t('today.hints.followups', { animalName: task.animalName });
    case 'reevaluation':
      return t('today.hints.reevaluations', {
        animalName: task.animalName,
      });
  }
}

function taskHref(task: MockTodayTask):
  | { pathname: '/animals/[animalId]'; params: { animalId: string } }
  | {
      pathname: '/animals/followups/[animalId]';
      params: { animalId: string };
    } {
  if (task.kind === 'followups') {
    return {
      pathname: '/animals/followups/[animalId]',
      params: { animalId: task.animalId },
    };
  }
  return {
    pathname: '/animals/[animalId]',
    params: { animalId: task.animalId },
  };
}

export function TodayScreen() {
  const { t } = useTranslation();
  const { state } = usePrototypeFlow();
  const todayTasks = selectTodayTasks(state);

  const tasks: MockTodayTask[] = todayTasks;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.brandBlock}>
            <Text style={styles.shelterName}>{mockShelter.name}</Text>
            <Text style={styles.productName}>{t('app.name')}</Text>
          </View>

          <Link href="/settings" asChild>
            <Pressable
              accessibilityLabel={t('navigation.settings')}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.settingsButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.settingsSymbol}>•••</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>{t('today.eyebrow')}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {t('today.title')}
          </Text>
          <Text style={styles.subtitle}>{t('today.subtitle')}</Text>
        </View>

        <View style={styles.taskList}>
          {tasks.map((task) => {
            const tone = taskToneStyles[task.tone];
            const href = taskHref(task);

            return (
              <Link href={href} key={task.id} asChild>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.taskCard,
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[
                      styles.countBadge,
                      { backgroundColor: tone.backgroundColor },
                    ]}
                  >
                    <Text style={[styles.countText, { color: tone.color }]}>
                      {task.count}
                    </Text>
                  </View>

                  <View style={styles.taskContent}>
                    <Text style={styles.taskTitle}>
                      {getTaskTitle(t, task)}
                    </Text>
                    <Text style={styles.taskHint}>{getTaskHint(t, task)}</Text>
                  </View>

                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              </Link>
            );
          })}
        </View>

        <Link href="/animals" asChild>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              {t('today.viewAnimals')}
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  brandBlock: {
    gap: 2,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 28,
  },
  container: {
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  countBadge: {
    alignItems: 'center',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  countText: {
    fontSize: 20,
    fontWeight: '900',
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  intro: {
    marginBottom: 24,
    marginTop: 28,
  },
  pressed: {
    opacity: 0.72,
  },
  productName: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 52,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  settingsButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 44,
  },
  settingsSymbol: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: -7,
  },
  shelterName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 17,
    lineHeight: 25,
    marginTop: 8,
  },
  taskCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    minHeight: 88,
    padding: 16,
  },
  taskContent: {
    flex: 1,
    gap: 4,
  },
  taskHint: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  taskList: {
    gap: 12,
  },
  taskTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.8,
    lineHeight: 40,
    marginTop: 8,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
});
