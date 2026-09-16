import { Link, Stack, router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useCallback, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

import { colors, radii, spacing, typography } from '@/constants/theme';
import {
  Card,
  PrimaryButton,
  ScreenHeader,
  SecondaryButton,
  SectionHeader,
  StateView,
} from '@/components/ui';
import {
  captureImageWithCamera,
  pickImageFromGallery,
  uploadImageToStorage,
  validateImage,
  type ImageCaptureAsset,
  type ImageCaptureOutcome,
} from '@/lib/image-capture';
import {
  useAdoptionById,
  useAdoptionFollowups,
  useAdoptionPhotoSignedUrl,
  useSetAdoptionPhoto,
} from '@/features/adoptions/active-adoption-queries';
import { useAuth } from '@/features/auth/auth-provider';
import {
  getAdoptionStatusLabel,
  getFollowupOutcomeLabel,
  getFollowupStatusLabel,
} from '@/features/adoptions/labels';
import { formatDate } from '@/i18n/format';
import type { Database } from '@/lib/database.types';

type PhotoFlowStatus =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'attaching' }
  | {
      kind: 'error';
      reason: 'permission' | 'invalidType' | 'tooLarge' | 'upload' | 'attach';
    };

function useHandoverPhotoFlow({
  client,
  shelterId,
  adoptionId,
}: {
  client: SupabaseClient<Database> | null;
  shelterId: string | null;
  adoptionId: string;
}) {
  const { mutateAsync: setAdoptionPhoto } = useSetAdoptionPhoto(
    client,
    shelterId,
  );
  const [status, setStatus] = useState<PhotoFlowStatus>({ kind: 'idle' });
  const pendingAssetRef = useRef<ImageCaptureAsset | null>(null);
  const pendingPathRef = useRef<string | null>(null);
  const isSelectingRef = useRef(false);
  const isUploadingRef = useRef(false);
  const isAttachingRef = useRef(false);
  const [isSelecting, setIsSelecting] = useState(false);

  const attach = useCallback(
    async (path: string) => {
      if (isAttachingRef.current) return;
      isAttachingRef.current = true;
      pendingPathRef.current = path;
      setStatus({ kind: 'attaching' });
      try {
        await setAdoptionPhoto({ adoptionId, path });
        pendingPathRef.current = null;
        pendingAssetRef.current = null;
        setStatus({ kind: 'idle' });
      } catch {
        setStatus({ kind: 'error', reason: 'attach' });
      } finally {
        isAttachingRef.current = false;
      }
    },
    [adoptionId, setAdoptionPhoto],
  );

  const upload = useCallback(
    async (asset: ImageCaptureAsset) => {
      if (
        !client ||
        !shelterId ||
        isUploadingRef.current ||
        isAttachingRef.current
      ) {
        return;
      }
      isUploadingRef.current = true;
      pendingPathRef.current = null;
      pendingAssetRef.current = asset;
      setStatus({ kind: 'uploading' });
      try {
        const path = await uploadImageToStorage(
          client,
          asset,
          shelterId,
          'adoptions',
          adoptionId,
        );
        await attach(path);
      } catch {
        setStatus({ kind: 'error', reason: 'upload' });
      } finally {
        isUploadingRef.current = false;
      }
    },
    [attach, adoptionId, client, shelterId],
  );

  const handleOutcome = useCallback(
    async (outcome: ImageCaptureOutcome) => {
      if (outcome.status === 'cancelled') return;
      if (outcome.status === 'permission_denied') {
        setStatus({ kind: 'error', reason: 'permission' });
        return;
      }
      const validation = validateImage(outcome.asset);
      if (!validation.valid) {
        setStatus({
          kind: 'error',
          reason:
            validation.error === 'file_too_large' ? 'tooLarge' : 'invalidType',
        });
        return;
      }
      await upload(outcome.asset);
    },
    [upload],
  );

  const runPicker = useCallback(
    async (pick: () => Promise<ImageCaptureOutcome>) => {
      if (
        isSelectingRef.current ||
        isUploadingRef.current ||
        isAttachingRef.current
      ) {
        return;
      }
      isSelectingRef.current = true;
      setIsSelecting(true);
      try {
        await handleOutcome(await pick());
      } finally {
        isSelectingRef.current = false;
        setIsSelecting(false);
      }
    },
    [handleOutcome],
  );

  const pickFromGallery = useCallback(
    async () => runPicker(pickImageFromGallery),
    [runPicker],
  );

  const captureWithCamera = useCallback(
    async () => runPicker(captureImageWithCamera),
    [runPicker],
  );

  const retry = useCallback(() => {
    if (pendingPathRef.current) {
      void attach(pendingPathRef.current);
    } else if (pendingAssetRef.current) {
      void upload(pendingAssetRef.current);
    }
  }, [attach, upload]);

  return {
    status,
    isBusy:
      isSelecting || status.kind === 'uploading' || status.kind === 'attaching',
    pickFromGallery,
    captureWithCamera,
    retry,
  };
}

const photoErrorMessageKeys: Record<
  Exclude<
    PhotoFlowStatus,
    { kind: 'idle' | 'uploading' | 'attaching' }
  >['reason'],
  | 'adoptions.detail.photo.permissionDenied'
  | 'adoptions.detail.photo.invalidType'
  | 'adoptions.detail.photo.tooLarge'
  | 'adoptions.detail.photo.error'
  | 'adoptions.detail.photo.attachError'
> = {
  permission: 'adoptions.detail.photo.permissionDenied',
  invalidType: 'adoptions.detail.photo.invalidType',
  tooLarge: 'adoptions.detail.photo.tooLarge',
  upload: 'adoptions.detail.photo.error',
  attach: 'adoptions.detail.photo.attachError',
};

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

  const photoSignedUrlQuery = useAdoptionPhotoSignedUrl(
    supabase,
    adoptionQuery.data?.adoptionPhotoPath ?? null,
  );
  const photoFlow = useHandoverPhotoFlow({
    client: supabase,
    shelterId,
    adoptionId: adoptionId ?? '',
  });

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

      <View style={styles.section}>
        <SectionHeader title={t('adoptions.detail.handoverPhoto')} />
        <Card padding="comfortable" variant="elevated">
          {adoption.adoptionPhotoPath && photoSignedUrlQuery.isLoading ? (
            <View style={styles.photoPlaceholder}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : adoption.adoptionPhotoPath &&
            photoSignedUrlQuery.data?.signedUrl ? (
            <Image
              contentFit="cover"
              source={{ uri: photoSignedUrlQuery.data.signedUrl }}
              style={styles.photoImage}
            />
          ) : (
            <Text style={styles.noPhotoText}>
              {t('adoptions.detail.noPhoto')}
            </Text>
          )}
        </Card>
        <View style={styles.photoActions}>
          <SecondaryButton
            accessibilityLabel={t('adoptions.detail.photo.pickFromGallery')}
            disabled={photoFlow.isBusy}
            fullWidth={false}
            label={t('adoptions.detail.photo.pickFromGallery')}
            onPress={() => void photoFlow.pickFromGallery()}
          />
          <SecondaryButton
            accessibilityLabel={t('adoptions.detail.photo.takePhoto')}
            disabled={photoFlow.isBusy}
            fullWidth={false}
            label={t('adoptions.detail.photo.takePhoto')}
            onPress={() => void photoFlow.captureWithCamera()}
          />
        </View>
        {photoFlow.isBusy ? (
          <Text accessibilityRole="progressbar" style={styles.photoStatus}>
            {t('adoptions.detail.photo.uploading')}
          </Text>
        ) : null}
        {photoFlow.status.kind === 'error' ? (
          <View style={styles.photoErrorRow}>
            <Text accessibilityRole="alert" style={styles.photoError}>
              {t(photoErrorMessageKeys[photoFlow.status.reason])}
            </Text>
            {photoFlow.status.reason === 'upload' ||
            photoFlow.status.reason === 'attach' ? (
              <SecondaryButton
                accessibilityLabel={t('adoptions.detail.retry')}
                disabled={photoFlow.isBusy}
                fullWidth={false}
                label={t('adoptions.detail.retry')}
                onPress={() => photoFlow.retry()}
              />
            ) : null}
          </View>
        ) : null}
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

      {isReturned && adoption.animal.status === 'REEVALUATION' ? (
        <View style={styles.section}>
          <Link
            href={{
              pathname: '/animals/[animalId]/reevaluation',
              params: { animalId: adoption.animal.id },
            }}
            asChild
          >
            <PrimaryButton
              accessibilityLabel={t('animals.detail.completeReevaluation')}
              fullWidth
              label={t('animals.detail.completeReevaluation')}
              onPress={() => undefined}
            />
          </Link>
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
  noPhotoText: {
    ...typography.body,
    color: colors.textMuted,
  },
  notesCopy: {
    ...typography.body,
    color: colors.text,
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  photoError: {
    ...typography.body,
    color: colors.danger,
  },
  photoErrorRow: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  photoImage: {
    borderRadius: radii.md,
    height: 200,
    width: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    height: 200,
    justifyContent: 'center',
    width: '100%',
  },
  photoStatus: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
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
