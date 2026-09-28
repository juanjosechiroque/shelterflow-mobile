import { Link } from 'expo-router';
import type { TFunction } from 'i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { Card, ScreenHeader, SectionHeader } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-provider';
import { usePendingAdoptionDecisions } from '@/features/adoptions/adoption-queries';
import { usePrototypeFlow } from '@/features/prototype-flow/prototype-flow-provider';
import {
  selectShelter,
  selectTodayTasks,
} from '@/features/prototype-flow/prototype-flow-selectors';
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
  const { supabase, profile } = useAuth();
  const { state } = usePrototypeFlow();
  const shelter = selectShelter(state);
  const todayTasks = selectTodayTasks(state);
  const pendingDecisions = usePendingAdoptionDecisions(
    supabase,
    profile?.shelterId ?? null,
  );

  const tasks: MockTodayTask[] = todayTasks;
  const pendingDecisionCount = pendingDecisions.data?.length ?? 0;
  const shouldRenderPendingDecisions =
    pendingDecisions.isLoading ||
    pendingDecisions.isError ||
    pendingDecisionCount > 0;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.brandBlock}>
            <Text style={styles.shelterEyebrow}>{shelter.name}</Text>
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
          <ScreenHeader
            eyebrow={t('today.eyebrow')}
            title={t('today.title')}
            subtitle={t('today.subtitle')}
          />
        </View>

        {shouldRenderPendingDecisions ? (
          <View style={styles.pendingDecisionsSection}>
            <SectionHeader
              description={t('today.pendingDecisions.subtitle')}
              title={t('today.pendingDecisions.title')}
            />

            {pendingDecisions.isLoading ? (
              <Text accessibilityRole="progressbar" style={styles.stateText}>
                {t('today.pendingDecisions.loading')}
              </Text>
            ) : null}

            {pendingDecisions.isError ? (
              <View>
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {t('today.pendingDecisions.error')}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void pendingDecisions.refetch();
                  }}
                  style={({ pressed }) => [
                    styles.retryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.retryButtonText}>
                    {t('today.pendingDecisions.retry')}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {!pendingDecisions.isLoading && !pendingDecisions.isError ? (
              <View style={styles.pendingDecisionList}>
                {pendingDecisions.data?.map((candidate) => (
                  <Link
                    href={{
                      pathname: '/adoptions/confirm/[candidateId]',
                      params: { candidateId: candidate.id },
                    }}
                    key={candidate.id}
                    asChild
                  >
                    <Card
                      accessibilityLabel={t('today.pendingDecisions.open', {
                        personName: candidate.personName,
                        animalName: candidate.animal.name,
                      })}
                      accessibilityRole="button"
                      padding="comfortable"
                      variant="subtle"
                    >
                      <Text style={styles.pendingDecisionPerson}>
                        {candidate.personName}
                      </Text>
                      <Text style={styles.pendingDecisionAnimal}>
                        {candidate.animal.name}
                      </Text>
                    </Card>
                  </Link>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.taskSection}>
          <View style={styles.taskList}>
            {tasks.map((task) => {
              const tone = taskToneStyles[task.tone];
              const href = taskHref(task);

              return (
                <Link href={href} key={task.id} asChild>
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.taskRow,
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
                      <Text style={styles.taskHint}>
                        {getTaskHint(t, task)}
                      </Text>
                    </View>
                  </Pressable>
                </Link>
              );
            })}
          </View>

          <Link href="/animals" asChild>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.viewAllButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.viewAllButtonText}>
                {t('today.viewAnimals')}
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  brandBlock: {
    gap: 2,
  },
  container: {
    paddingBottom: spacing['2xl'],
    paddingHorizontal: spacing.lg,
  },
  countBadge: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  countText: {
    fontSize: 18,
    fontWeight: '800',
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  intro: {
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  pendingDecisionAnimal: {
    ...typography.subtitle,
    color: colors.textMuted,
    marginTop: spacing['2xs'],
  },
  pendingDecisionList: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  pendingDecisionPerson: {
    ...typography.bodyStrong,
    color: colors.text,
    fontSize: 16,
  },
  pendingDecisionsSection: {
    marginBottom: spacing.xl,
  },
  pressed: {
    opacity: 0.78,
  },
  productName: {
    ...typography.meta,
    color: colors.textSubtle,
  },
  retryButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  retryButtonText: {
    ...typography.metaStrong,
    color: colors.primary,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  settingsButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: radii.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  settingsSymbol: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: -7,
  },
  shelterEyebrow: {
    ...typography.eyebrow,
    color: colors.primary,
  },
  stateText: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  taskContent: {
    flex: 1,
    gap: spacing['2xs'],
  },
  taskHint: {
    ...typography.meta,
    color: colors.textMuted,
  },
  taskList: {
    gap: spacing.xs,
  },
  taskRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  taskSection: {
    gap: spacing.md,
  },
  taskTitle: {
    ...typography.bodyStrong,
    color: colors.text,
    fontSize: 16,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  viewAllButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  viewAllButtonText: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
});
