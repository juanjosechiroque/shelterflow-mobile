import { Link, Stack, router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, spacing, typography } from '@/constants/theme';
import {
  Card,
  PrimaryButton,
  ScreenHeader,
  SectionHeader,
  StateView,
} from '@/components/ui';
import {
  useAdoptionById,
  useAdoptionFollowups,
} from '@/features/adoptions/active-adoption-queries';
import { useAuth } from '@/features/auth/auth-provider';
import {
  getAdoptionStatusLabel,
  getFollowupOutcomeLabel,
  getFollowupStatusLabel,
} from '@/features/adoptions/labels';
import { formatDate } from '@/i18n/format';

export function PersistedAdoptionDetailScreen() {
  const { t } = useTranslation();
  const { supabase, profile } = useAuth();
  const params = useLocalSearchParams<{ adoptionId: string }>();
  const adoptionId = Array.isArray(params.adoptionId)
    ? params.adoptionId[0]
    : params.adoptionId;
  const shelterId = profile?.shelterId ?? null;
  const adoptionQuery = useAdoptionById(supabase, shelterId, adoptionId);
  const followupsQuery = useAdoptionFollowups(supabase, shelterId, adoptionId);

  if (adoptionQuery.isLoading) {
    return <Stack.Screen options={{ title: t('adoptions.detail.title') }} />;
  }

  if (adoptionQuery.isError) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('adoptions.detail.title') }} />
        <StateView
          description={t('adoptions.detail.loadErrorDescription')}
          primaryAction={{
            label: t('adoptions.detail.retry'),
            onPress: () => {
              void adoptionQuery.refetch();
            },
          }}
          title={t('adoptions.detail.loadErrorTitle')}
          tone="error"
        />
      </View>
    );
  }

  if (!adoptionQuery.data) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('adoptions.detail.title') }} />
        <StateView
          description={t('adoptions.detail.notFoundDescription')}
          title={t('adoptions.detail.notFoundTitle')}
          tone="info"
        />
      </View>
    );
  }

  const adoption = adoptionQuery.data;
  const followups = followupsQuery.data ?? [];
  const isActive = adoption.status === 'ACTIVE';
  const isReturned = adoption.status === 'RETURNED';

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: t('adoptions.detail.title') }} />

      <View style={styles.header}>
        <ScreenHeader
          subtitle={`${adoption.candidate.person.name} · ${adoption.animal.name}`}
          title={t('adoptions.detail.title')}
        />
      </View>

      <View style={styles.section}>
        <Card padding="comfortable" variant="elevated">
          <DetailRow
            label={t('adoptions.detail.status')}
            value={getAdoptionStatusLabel(t, adoption.status)}
            tone={isActive ? 'primary' : 'warning'}
          />
          <View style={styles.divider} />
          <DetailRow
            label={t('adoptions.detail.animal')}
            value={adoption.animal.name}
          />
          <View style={styles.divider} />
          <DetailRow
            label={t('adoptions.detail.candidate')}
            value={adoption.candidate.person.name}
          />
          <View style={styles.divider} />
          <DetailRow
            label={t('adoptions.detail.adoptionDate')}
            value={formatDate(new Date(adoption.adoptionDate + 'T12:00:00'), {
              dateStyle: 'medium',
            })}
          />
        </Card>
      </View>

      {adoption.handoverNotes ? (
        <View style={styles.section}>
          <SectionHeader title={t('adoptions.detail.handoverNotes')} />
          <Card padding="comfortable" variant="elevated">
            <Text style={styles.notesCopy}>{adoption.handoverNotes}</Text>
          </Card>
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title={t('adoptions.detail.followups.title')} />

        {followupsQuery.isLoading ? (
          <Text accessibilityRole="progressbar" style={styles.stateText}>
            {t('adoptions.detail.followups.loading')}
          </Text>
        ) : null}

        {followupsQuery.isError ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {t('adoptions.detail.loadErrorDescription')}
          </Text>
        ) : null}

        {!followupsQuery.isLoading && followups.length === 0 ? (
          <Card padding="comfortable" variant="subtle">
            <Text style={styles.stateText}>
              {t('adoptions.detail.followups.empty')}
            </Text>
          </Card>
        ) : null}

        <View style={styles.followupList}>
          {followups.map((followup) => {
            const isPending = followup.status === 'PENDING';
            const isCancelled = followup.status === 'CANCELLED';
            return (
              <View key={followup.id} style={styles.followupItem}>
                <Card padding="comfortable" variant="elevated">
                  <View style={styles.followupHeader}>
                    <Text style={styles.followupDate}>
                      {formatDate(new Date(followup.dueDate + 'T12:00:00'), {
                        dateStyle: 'medium',
                      })}
                    </Text>
                    <Text
                      accessibilityLabel={t(
                        'adoptions.detail.followups.status',
                      )}
                      style={styles.followupStatusLabel}
                    >
                      {getFollowupStatusLabel(t, followup.status)}
                    </Text>
                  </View>

                  {followup.outcome ? (
                    <Text style={styles.followupOutcome}>
                      <Text style={styles.followupFieldLabel}>
                        {t('adoptions.detail.followups.outcome')}
                        {': '}
                      </Text>
                      {getFollowupOutcomeLabel(t, followup.outcome)}
                    </Text>
                  ) : null}

                  {followup.notes ? (
                    <Text style={styles.followupNotes}>
                      <Text style={styles.followupFieldLabel}>
                        {t('adoptions.detail.followups.notes')}
                        {': '}
                      </Text>
                      {followup.notes}
                    </Text>
                  ) : !followup.outcome && followup.status === 'COMPLETED' ? (
                    <Text style={styles.followupNotes}>
                      {t('adoptions.detail.followups.notesEmpty')}
                    </Text>
                  ) : null}

                  {isCancelled ? (
                    <Text style={styles.followupCancelledHint}>
                      {t('adoptions.detail.followups.cancelledReturn')}
                    </Text>
                  ) : null}
                </Card>

                {isActive && isPending ? (
                  <Link
                    href={{
                      pathname:
                        '/adoptions/[adoptionId]/followups/[followupId]/complete',
                      params: {
                        adoptionId: adoption.id,
                        followupId: followup.id,
                      },
                    }}
                    asChild
                  >
                    <PrimaryButton
                      accessibilityLabel={t(
                        'adoptions.detail.followups.complete',
                      )}
                      fullWidth
                      label={t('adoptions.detail.followups.complete')}
                      onPress={() => undefined}
                    />
                  </Link>
                ) : null}

                {isActive && !isPending ? (
                  <Text style={styles.followupUnavailableHint}>
                    {t('adoptions.detail.followups.unavailable')}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      {isActive ? (
        <View style={styles.section}>
          <PrimaryButton
            accessibilityLabel={t('adoptions.detail.return.trigger')}
            fullWidth
            label={t('adoptions.detail.return.trigger')}
            onPress={() =>
              router.push({
                pathname: '/adoptions/[adoptionId]/return',
                params: { adoptionId: adoption.id },
              })
            }
          />
        </View>
      ) : null}

      {isReturned ? (
        <View style={styles.section}>
          <Card padding="comfortable" variant="subtle">
            <Text style={styles.returnedTitle}>
              {t('adoptions.detail.return.registeredTitle')}
            </Text>
            <Text style={styles.returnedDescription}>
              {t('adoptions.detail.return.registeredDescription')}
            </Text>
          </Card>
        </View>
      ) : null}
    </ScrollView>
  );
}

function DetailRow({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'primary' | 'warning';
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          tone === 'primary' && styles.detailValuePrimary,
          tone === 'warning' && styles.detailValueWarning,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flexGrow: 1,
    paddingBottom: spacing['3xl'],
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  detailLabel: {
    ...typography.metaStrong,
    color: colors.textSubtle,
    flex: 1,
    textTransform: 'uppercase',
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  detailValue: {
    ...typography.bodyStrong,
    color: colors.text,
    flex: 2,
    textAlign: 'right',
  },
  detailValuePrimary: {
    color: colors.primary,
  },
  detailValueWarning: {
    color: colors.warning,
  },
  divider: {
    backgroundColor: colors.borderSubtle,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  followupCancelledHint: {
    ...typography.meta,
    color: colors.textSubtle,
    marginTop: spacing.xs,
  },
  followupDate: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  followupFieldLabel: {
    ...typography.metaStrong,
    color: colors.textSubtle,
    textTransform: 'uppercase',
  },
  followupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  followupItem: {
    gap: spacing.sm,
  },
  followupList: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  followupNotes: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.xs,
  },
  followupOutcome: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.xs,
  },
  followupStatusLabel: {
    ...typography.metaStrong,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  followupUnavailableHint: {
    ...typography.meta,
    color: colors.textSubtle,
  },
  header: {
    marginBottom: spacing.lg,
  },
  notesCopy: {
    ...typography.body,
    color: colors.text,
  },
  returnedDescription: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  returnedTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 18,
  },
  section: {
    marginTop: spacing.lg,
  },
  stateContainer: {
    backgroundColor: colors.background,
    flex: 1,
  },
  stateText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
