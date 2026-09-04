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
} from '@/features/animals/image-capture';
import {
  useAnimalById,
  useAnimalPrimaryPhotoSignedUrl,
  useAnimalTimeline,
  useActiveAdoptionForAnimal,
  useSetAnimalPrimaryPhoto,
} from '@/features/animals/persisted-animal-queries';
import { useAuth } from '@/features/auth/auth-provider';
import { useCandidatesByAnimal } from '@/features/candidates/candidate-queries';
import type { Database } from '@/lib/database.types';
import {
  getAnimalSexLabel,
  getAnimalSizeLabel,
  getAnimalSpeciesLabel,
  getApproximateAgeLabel,
} from './presenters';
import type {
  AnimalSex,
  AnimalSize,
  AnimalSpecies,
  AnimalStatus,
} from './types';
import { StatusBadge } from './components/status-badge';
import { PersistedTimelineEventItem } from './components/persisted-timeline-event-item';
import { CandidateRow } from './components/candidate-row';

type PhotoFlowStatus =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'attaching' }
  | {
      kind: 'error';
      reason: 'permission' | 'invalidType' | 'tooLarge' | 'upload' | 'attach';
    };

function usePrimaryPhotoFlow({
  client,
  shelterId,
  animalId,
}: {
  client: SupabaseClient<Database> | null;
  shelterId: string | null;
  animalId: string;
}) {
  const { mutateAsync: setPrimaryPhoto } = useSetAnimalPrimaryPhoto(
    client,
    shelterId,
  );
  const [status, setStatus] = useState<PhotoFlowStatus>({ kind: 'idle' });
  const pendingAssetRef = useRef<ImageCaptureAsset | null>(null);
  const pendingPathRef = useRef<string | null>(null);

  const attach = useCallback(
    async (path: string) => {
      pendingPathRef.current = path;
      setStatus({ kind: 'attaching' });
      try {
        await setPrimaryPhoto({ animalId, path });
        pendingPathRef.current = null;
        pendingAssetRef.current = null;
        setStatus({ kind: 'idle' });
      } catch {
        setStatus({ kind: 'error', reason: 'attach' });
      }
    },
    [animalId, setPrimaryPhoto],
  );

  const upload = useCallback(
    async (asset: ImageCaptureAsset) => {
      if (!client || !shelterId) return;
      pendingAssetRef.current = asset;
      setStatus({ kind: 'uploading' });
      try {
        const path = await uploadImageToStorage(
          client,
          asset,
          shelterId,
          animalId,
        );
        await attach(path);
      } catch {
        setStatus({ kind: 'error', reason: 'upload' });
      }
    },
    [attach, animalId, client, shelterId],
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

  const pickFromGallery = useCallback(async () => {
    await handleOutcome(await pickImageFromGallery());
  }, [handleOutcome]);

  const captureWithCamera = useCallback(async () => {
    await handleOutcome(await captureImageWithCamera());
  }, [handleOutcome]);

  const retry = useCallback(() => {
    if (pendingPathRef.current) {
      void attach(pendingPathRef.current);
    } else if (pendingAssetRef.current) {
      void upload(pendingAssetRef.current);
    }
  }, [attach, upload]);

  return {
    status,
    isBusy: status.kind === 'uploading' || status.kind === 'attaching',
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
  | 'animals.detail.photo.permissionDenied'
  | 'animals.detail.photo.invalidType'
  | 'animals.detail.photo.tooLarge'
  | 'animals.detail.photo.error'
  | 'animals.detail.photo.attachError'
> = {
  permission: 'animals.detail.photo.permissionDenied',
  invalidType: 'animals.detail.photo.invalidType',
  tooLarge: 'animals.detail.photo.tooLarge',
  upload: 'animals.detail.photo.error',
  attach: 'animals.detail.photo.attachError',
};

const nextStepKeys: Record<
  AnimalStatus,
  | 'animals.detail.nextSteps.preparing'
  | 'animals.detail.nextSteps.ready'
  | 'animals.detail.nextSteps.inProcess'
  | 'animals.detail.nextSteps.adopted'
  | 'animals.detail.nextSteps.reevaluation'
  | 'animals.detail.nextSteps.notAvailable'
> = {
  ADOPTED: 'animals.detail.nextSteps.adopted',
  IN_PROCESS: 'animals.detail.nextSteps.inProcess',
  NOT_AVAILABLE: 'animals.detail.nextSteps.notAvailable',
  PREPARING: 'animals.detail.nextSteps.preparing',
  READY: 'animals.detail.nextSteps.ready',
  REEVALUATION: 'animals.detail.nextSteps.reevaluation',
};

export function PersistedAnimalDetailScreen() {
  const { t } = useTranslation();
  const { supabase, profile } = useAuth();
  const params = useLocalSearchParams<{ animalId: string }>();
  const animalId = Array.isArray(params.animalId)
    ? params.animalId[0]
    : params.animalId;
  const shelterId = profile?.shelterId ?? null;

  const animalQuery = useAnimalById(supabase, shelterId, animalId);
  const timelineQuery = useAnimalTimeline(supabase, shelterId, animalId);
  const adoptionQuery = useActiveAdoptionForAnimal(
    supabase,
    shelterId,
    animalId,
  );
  const candidatesQuery = useCandidatesByAnimal(
    supabase,
    shelterId ?? '',
    animalId ?? '',
  );

  const photoSignedUrlQuery = useAnimalPrimaryPhotoSignedUrl(
    supabase,
    animalQuery.data?.primaryPhotoPath ?? null,
  );
  const photoFlow = usePrimaryPhotoFlow({
    client: supabase,
    shelterId,
    animalId: animalId ?? '',
  });

  if (animalQuery.isLoading) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('animals.detail.title') }} />
        <Text accessibilityRole="progressbar" style={styles.loading}>
          {t('animals.detail.loading')}
        </Text>
      </View>
    );
  }

  if (animalQuery.isError) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('animals.detail.title') }} />
        <StateView
          description={t('animals.detail.loadErrorDescription')}
          primaryAction={{
            label: t('animals.detail.retry'),
            onPress: () => {
              void animalQuery.refetch();
            },
          }}
          title={t('animals.detail.loadErrorTitle')}
          tone="error"
        />
      </View>
    );
  }

  if (!animalQuery.data) {
    return (
      <View style={styles.stateContainer}>
        <Stack.Screen options={{ title: t('animals.detail.title') }} />
        <StateView
          description={t('animals.detail.notFoundDescription')}
          title={t('animals.detail.notFoundTitle')}
          tone="info"
          primaryAction={{
            label: t('animals.detail.goBack'),
            onPress: () => router.back(),
          }}
        />
      </View>
    );
  }

  const animal = animalQuery.data;
  const status = animal.status as AnimalStatus;
  const timeline = timelineQuery.data ?? [];
  const showReevaluationAction = status === 'REEVALUATION';
  const activeAdoption = adoptionQuery.data;
  const showAdoptionLink = status === 'ADOPTED' && activeAdoption;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: animal.name }} />

      <View style={styles.hero}>
        <View style={styles.heroAvatar}>
          {animal.primaryPhotoPath && photoSignedUrlQuery.isLoading ? (
            <View style={styles.heroAvatarPlaceholder}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : animal.primaryPhotoPath && photoSignedUrlQuery.data?.signedUrl ? (
            <Image
              contentFit="cover"
              source={{ uri: photoSignedUrlQuery.data.signedUrl }}
              style={styles.heroAvatarImage}
            />
          ) : (
            <View style={styles.heroAvatarPlaceholder}>
              <Text style={styles.heroAvatarLabel}>
                {animal.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.heroCopy}>
          <Text accessibilityRole="header" style={styles.heroName}>
            {animal.name}
          </Text>
          <Text style={styles.heroMeta}>
            {getAnimalSpeciesLabel(t, animal.species as AnimalSpecies)} ·{' '}
            {getAnimalSexLabel(t, animal.sex as AnimalSex)} ·{' '}
            {getAnimalSizeLabel(t, animal.size as AnimalSize)}
          </Text>
          <View style={styles.heroBadge}>
            <StatusBadge status={status} />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.photoActions}>
          <SecondaryButton
            accessibilityLabel={t('animals.detail.photo.pickFromGallery')}
            disabled={photoFlow.isBusy}
            fullWidth={false}
            label={t('animals.detail.photo.pickFromGallery')}
            onPress={() => void photoFlow.pickFromGallery()}
          />
          <SecondaryButton
            accessibilityLabel={t('animals.detail.photo.takePhoto')}
            disabled={photoFlow.isBusy}
            fullWidth={false}
            label={t('animals.detail.photo.takePhoto')}
            onPress={() => void photoFlow.captureWithCamera()}
          />
        </View>
        {photoFlow.isBusy ? (
          <Text accessibilityRole="progressbar" style={styles.photoStatus}>
            {t('animals.detail.photo.uploading')}
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
                accessibilityLabel={t('animals.detail.retry')}
                fullWidth={false}
                label={t('animals.detail.retry')}
                onPress={() => photoFlow.retry()}
              />
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('animals.detail.overview')} />
        <Card padding="comfortable" variant="elevated">
          <View style={styles.detailGrid}>
            <DetailRow
              label={t('animals.detail.species')}
              value={getAnimalSpeciesLabel(t, animal.species as AnimalSpecies)}
            />
            <DetailRow
              label={t('animals.detail.sex')}
              value={getAnimalSexLabel(t, animal.sex as AnimalSex)}
            />
            <DetailRow
              label={t('animals.detail.age')}
              value={getApproximateAgeLabel(t, animal.approximateAgeMonths)}
            />
            <DetailRow
              label={t('animals.detail.size')}
              value={getAnimalSizeLabel(t, animal.size as AnimalSize)}
            />
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('animals.detail.currentProcess')} />
        <Card padding="comfortable" variant="elevated">
          <Text style={styles.processLabel}>
            {t('animals.detail.nextStep')}
          </Text>
          <Text style={styles.nextStepValue}>{t(nextStepKeys[status])}</Text>
        </Card>
      </View>

      {showReevaluationAction ? (
        <View style={styles.section}>
          <Link
            href={{
              pathname: '/animals/[animalId]/reevaluation',
              params: { animalId: animal.id },
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

      {showAdoptionLink ? (
        <View style={styles.section}>
          <Link
            href={{
              pathname: '/adoptions/[adoptionId]',
              params: { adoptionId: activeAdoption.id },
            }}
            asChild
          >
            <PrimaryButton
              accessibilityLabel={t('animals.detail.reviewFollowUps')}
              fullWidth
              label={t('animals.detail.reviewFollowUps')}
              onPress={() => undefined}
            />
          </Link>
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title={t('animals.candidates.title')} />
        {candidatesQuery.isLoading ? (
          <Text accessibilityRole="progressbar" style={styles.timelineState}>
            {t('animals.detail.candidatesLoading')}
          </Text>
        ) : candidatesQuery.isError ? (
          <Text accessibilityRole="alert" style={styles.timelineError}>
            {t('animals.detail.candidatesError')}
          </Text>
        ) : (candidatesQuery.data?.length ?? 0) === 0 ? (
          <Card padding="comfortable" variant="subtle">
            <Text style={styles.timelineEmpty}>
              {t('animals.candidates.empty')}
            </Text>
          </Card>
        ) : (
          <Card padding="comfortable" variant="elevated">
            {candidatesQuery.data?.map((candidate) => (
              <CandidateRow candidate={candidate} key={candidate.id} />
            ))}
          </Card>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('animals.timeline.title')} />

        {timelineQuery.isLoading ? (
          <Text accessibilityRole="progressbar" style={styles.timelineState}>
            {t('animals.detail.timelineLoading')}
          </Text>
        ) : null}

        {timelineQuery.isError ? (
          <Text accessibilityRole="alert" style={styles.timelineError}>
            {t('animals.detail.timelineError')}
          </Text>
        ) : null}

        {!timelineQuery.isLoading && !timelineQuery.isError ? (
          timeline.length === 0 ? (
            <Card padding="comfortable" variant="subtle">
              <Text style={styles.timelineEmpty}>
                {t('animals.detail.timelineEmpty')}
              </Text>
            </Card>
          ) : (
            <Card padding="comfortable" variant="elevated">
              {timeline.map((event, index) => (
                <PersistedTimelineEventItem
                  animalName={animal.name}
                  event={event}
                  isLast={index === timeline.length - 1}
                  key={event.id}
                />
              ))}
            </Card>
          )
        ) : null}
      </View>
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
  detailGrid: {
    gap: spacing.sm,
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
  hero: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.xl,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  heroAvatar: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  heroAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
  },
  heroAvatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  heroAvatarLabel: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photoStatus: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  photoErrorRow: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  photoError: {
    ...typography.body,
    color: colors.danger,
  },
  heroBadge: {
    marginTop: spacing.xs,
  },
  heroCopy: {
    flex: 1,
  },
  heroMeta: {
    ...typography.body,
    color: colors.textSubtle,
    marginTop: spacing['2xs'],
  },
  heroName: {
    ...typography.title,
    color: colors.text,
  },
  loading: {
    ...typography.body,
    color: colors.textMuted,
    padding: spacing.lg,
  },
  nextStepValue: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing['2xs'],
  },
  processLabel: {
    ...typography.metaStrong,
    color: colors.textSubtle,
    textTransform: 'uppercase',
  },
  section: {
    marginTop: spacing.xl,
  },
  stateContainer: {
    backgroundColor: colors.background,
    flex: 1,
  },
  timelineEmpty: {
    ...typography.body,
    color: colors.textMuted,
  },
  timelineError: {
    ...typography.body,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  timelineState: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
