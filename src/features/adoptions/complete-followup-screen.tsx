import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  useCompleteFollowup,
  useFollowupPhotoSignedUrl,
  useSetFollowupPhoto,
} from '@/features/adoptions/active-adoption-queries';
import { useAuth } from '@/features/auth/auth-provider';
import {
  followupOutcomes,
  getFollowupOutcomeLabel,
  type FollowupOutcome,
} from '@/features/adoptions/labels';
import type { Database } from '@/lib/database.types';

type PhotoFlowStatus =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'attaching' }
  | {
      kind: 'error';
      reason:
        | 'permission'
        | 'invalidType'
        | 'tooLarge'
        | 'upload'
        | 'attach'
        | 'adoptionNotActive'
        | 'followupCancelled';
    };

function useFollowupPhotoFlow({
  client,
  shelterId,
  followupId,
  adoptionId,
}: {
  client: SupabaseClient<Database> | null;
  shelterId: string | null;
  followupId: string;
  adoptionId: string;
}) {
  const { mutateAsync: setFollowupPhoto } = useSetFollowupPhoto(
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
        await setFollowupPhoto({ followupId, adoptionId, path });
        pendingPathRef.current = null;
        pendingAssetRef.current = null;
        setStatus({ kind: 'idle' });
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : typeof error === 'object' && error !== null && 'message' in error
              ? String(error.message)
              : String(error);
        if (message.includes('Adoption must be in ACTIVE status')) {
          setStatus({ kind: 'error', reason: 'adoptionNotActive' });
        } else if (message.includes('Follow-up cannot be cancelled')) {
          setStatus({ kind: 'error', reason: 'followupCancelled' });
        } else {
          setStatus({ kind: 'error', reason: 'attach' });
        }
      } finally {
        isAttachingRef.current = false;
      }
    },
    [adoptionId, followupId, setFollowupPhoto],
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
          'followups',
          followupId,
        );
        await attach(path);
      } catch {
        setStatus({ kind: 'error', reason: 'upload' });
      } finally {
        isUploadingRef.current = false;
      }
    },
    [attach, followupId, client, shelterId],
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
  | 'adoptions.completeFollowup.photo.permissionDenied'
  | 'adoptions.completeFollowup.photo.invalidType'
  | 'adoptions.completeFollowup.photo.tooLarge'
  | 'adoptions.completeFollowup.photo.error'
  | 'adoptions.completeFollowup.photo.attachError'
  | 'adoptions.completeFollowup.photo.adoptionNotActive'
  | 'adoptions.completeFollowup.photo.followupCancelled'
> = {
  permission: 'adoptions.completeFollowup.photo.permissionDenied',
  invalidType: 'adoptions.completeFollowup.photo.invalidType',
  tooLarge: 'adoptions.completeFollowup.photo.tooLarge',
  upload: 'adoptions.completeFollowup.photo.error',
  attach: 'adoptions.completeFollowup.photo.attachError',
  adoptionNotActive: 'adoptions.completeFollowup.photo.adoptionNotActive',
  followupCancelled: 'adoptions.completeFollowup.photo.followupCancelled',
};

export function CompleteFollowupScreen() {
  const { t } = useTranslation();
  const { supabase, profile } = useAuth();
  const params = useLocalSearchParams<{
    adoptionId: string;
    followupId: string;
  }>();
  const adoptionId = Array.isArray(params.adoptionId)
    ? params.adoptionId[0]
    : params.adoptionId;
  const followupId = Array.isArray(params.followupId)
    ? params.followupId[0]
    : params.followupId;
  const shelterId = profile?.shelterId ?? null;

  const adoptionQuery = useAdoptionById(supabase, shelterId, adoptionId);
  const followupsQuery = useAdoptionFollowups(supabase, shelterId, adoptionId);
  const completeMutation = useCompleteFollowup(supabase, shelterId);

  const currentFollowup = followupsQuery.data?.find((f) => f.id === followupId);
  const followupPhotoQuery = useFollowupPhotoSignedUrl(
    supabase,
    currentFollowup?.photoPath ?? null,
  );
  const photoFlow = useFollowupPhotoFlow({
    client: supabase,
    shelterId,
    followupId: followupId ?? '',
    adoptionId: adoptionId ?? '',
  });

  const submissionStartedRef = useRef(false);
  const [outcome, setOutcome] = useState<FollowupOutcome | null>(null);
  const [notes, setNotes] = useState('');
  const [hasMutationError, setHasMutationError] = useState(false);

  const isSubmitting = completeMutation.isPending;
  const isDisabled = isSubmitting || outcome === null;

  const adoption = adoptionQuery.data;
  const personName = adoption?.candidate.person.name ?? '';
  const animalName = adoption?.animal.name ?? '';

  function handleSubmit() {
    if (
      !adoptionId ||
      !followupId ||
      outcome === null ||
      submissionStartedRef.current
    ) {
      return;
    }
    submissionStartedRef.current = true;
    setHasMutationError(false);
    completeMutation.mutate(
      {
        adoptionId,
        followupId,
        outcome,
        notes: notes.trim().length > 0 ? notes.trim() : null,
      },
      {
        onError: () => {
          submissionStartedRef.current = false;
          setHasMutationError(true);
        },
        onSuccess: () => {
          router.replace({
            pathname: '/adoptions/[adoptionId]',
            params: { adoptionId },
          });
        },
      },
    );
  }

  if (adoptionQuery.isLoading) {
    return (
      <Stack.Screen
        options={{ title: t('adoptions.completeFollowup.title') }}
      />
    );
  }

  if (adoptionQuery.isError) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen
          options={{ title: t('adoptions.completeFollowup.title') }}
        />
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

  if (!adoption) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen
          options={{ title: t('adoptions.completeFollowup.title') }}
        />
        <StateView
          description={t('adoptions.completeFollowup.notFoundDescription')}
          title={t('adoptions.completeFollowup.notFoundTitle')}
          tone="info"
        />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen
        options={{ title: t('adoptions.completeFollowup.title') }}
      />

      <View style={styles.header}>
        <ScreenHeader
          subtitle={t('adoptions.completeFollowup.subtitle', {
            personName,
            animalName,
          })}
          title={t('adoptions.completeFollowup.title')}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('adoptions.completeFollowup.photoTitle')} />
        <Card padding="comfortable" variant="elevated">
          {currentFollowup?.photoPath && followupPhotoQuery.isLoading ? (
            <View style={styles.photoPlaceholder}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : currentFollowup?.photoPath &&
            followupPhotoQuery.data?.signedUrl ? (
            <Image
              contentFit="cover"
              source={{ uri: followupPhotoQuery.data.signedUrl }}
              style={styles.photoImage}
            />
          ) : (
            <Text style={styles.noPhotoText}>
              {t('adoptions.completeFollowup.noPhoto')}
            </Text>
          )}
        </Card>
        <View style={styles.photoActions}>
          <SecondaryButton
            accessibilityLabel={t(
              'adoptions.completeFollowup.photo.pickFromGallery',
            )}
            disabled={photoFlow.isBusy}
            fullWidth={false}
            label={t('adoptions.completeFollowup.photo.pickFromGallery')}
            onPress={() => void photoFlow.pickFromGallery()}
          />
          <SecondaryButton
            accessibilityLabel={t('adoptions.completeFollowup.photo.takePhoto')}
            disabled={photoFlow.isBusy}
            fullWidth={false}
            label={t('adoptions.completeFollowup.photo.takePhoto')}
            onPress={() => void photoFlow.captureWithCamera()}
          />
        </View>
        {photoFlow.isBusy ? (
          <Text accessibilityRole="progressbar" style={styles.photoStatus}>
            {t('adoptions.completeFollowup.photo.uploading')}
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
                accessibilityLabel={t('common.retry')}
                disabled={photoFlow.isBusy}
                fullWidth={false}
                label={t('common.retry')}
                onPress={() => photoFlow.retry()}
              />
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Card padding="comfortable" variant="elevated">
          <Text style={styles.fieldLabel}>
            {t('adoptions.completeFollowup.outcome')}
          </Text>
          <View style={styles.outcomeList}>
            {followupOutcomes.map((value) => {
              const isSelected = outcome === value;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  key={value}
                  onPress={() => setOutcome(value)}
                  style={({ pressed }) => [
                    styles.outcomeOption,
                    isSelected && styles.outcomeOptionSelected,
                    pressed && !isSelected && styles.outcomeOptionPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.outcomeOptionLabel,
                      isSelected && styles.outcomeOptionLabelSelected,
                    ]}
                  >
                    {getFollowupOutcomeLabel(t, value)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>
            {t('adoptions.completeFollowup.notes')}
          </Text>
          <TextInput
            accessibilityLabel={t('adoptions.completeFollowup.notes')}
            editable={!isSubmitting}
            multiline
            onChangeText={setNotes}
            placeholder={t('adoptions.completeFollowup.notesPlaceholder')}
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
            value={notes}
          />
        </Card>
      </View>

      {outcome === null && !isSubmitting ? (
        <Text accessibilityRole="alert" style={styles.hint}>
          {t('adoptions.completeFollowup.missingOutcome')}
        </Text>
      ) : null}
      {hasMutationError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {t('adoptions.completeFollowup.error')}
        </Text>
      ) : null}

      <View style={styles.actionStack}>
        <PrimaryButton
          accessibilityLabel={t('adoptions.completeFollowup.submit')}
          disabled={isDisabled}
          fullWidth
          label={
            isSubmitting
              ? t('adoptions.completeFollowup.submitting')
              : t('adoptions.completeFollowup.submit')
          }
          loading={isSubmitting}
          onPress={handleSubmit}
        />
        <SecondaryButton
          accessibilityLabel={t('adoptions.completeFollowup.cancel')}
          disabled={isSubmitting}
          fullWidth
          label={t('adoptions.completeFollowup.cancel')}
          onPress={() => router.back()}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionStack: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  container: {
    backgroundColor: colors.background,
    flexGrow: 1,
    paddingBottom: spacing['3xl'],
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  divider: {
    backgroundColor: colors.borderSubtle,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },
  error: {
    ...typography.body,
    color: colors.danger,
    marginTop: spacing.md,
  },
  fieldLabel: {
    ...typography.metaStrong,
    color: colors.textSubtle,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  header: {
    marginBottom: spacing.lg,
  },
  hint: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    color: colors.text,
    fontSize: 15,
    minHeight: 96,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  noPhotoText: {
    ...typography.body,
    color: colors.textMuted,
  },
  outcomeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  outcomeOption: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  outcomeOptionLabel: {
    ...typography.metaStrong,
    color: colors.textMuted,
    textTransform: 'none',
  },
  outcomeOptionLabelSelected: {
    color: colors.onPrimary,
  },
  outcomeOptionPressed: {
    backgroundColor: colors.surfaceSunken,
  },
  outcomeOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
  section: {
    marginTop: spacing.md,
  },
  stateContainer: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
