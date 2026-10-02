import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import {
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
  type ImagePickerAsset,
} from 'expo-image-picker';
import { uuid } from 'expo-modules-core';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/database.types';

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

// Downscale policy decided for this slice: cap the longest side at 1600px and
// re-encode as JPEG at 0.7 quality. Re-encoding on every pick also normalizes
// the uploaded content-type/extension to the format actually written to
// storage, regardless of what the picker returned.
const DOWNSCALE_MAX_DIMENSION = 1600;
const DOWNSCALE_QUALITY = 0.7;

export type ImageCaptureAsset = {
  uri: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
};

export type ImageCaptureOutcome =
  | { status: 'success'; asset: ImageCaptureAsset }
  | { status: 'cancelled' }
  | { status: 'permission_denied' };

export type ImageValidationError = 'invalid_mime_type' | 'file_too_large';

export type ImageValidationResult =
  { valid: true } | { valid: false; error: ImageValidationError };

function normalizeAsset(asset: ImagePickerAsset): ImageCaptureAsset {
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? 'application/octet-stream',
    sizeBytes: asset.fileSize ?? 0,
    width: asset.width,
    height: asset.height,
  };
}

export async function pickImageFromGallery(): Promise<ImageCaptureOutcome> {
  const permission = await requestMediaLibraryPermissionsAsync();
  if (permission.status !== 'granted') {
    return { status: 'permission_denied' };
  }

  const result = await launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.9,
    selectionLimit: 1,
  });

  if (result.canceled || result.assets.length === 0) {
    return { status: 'cancelled' };
  }

  return { status: 'success', asset: normalizeAsset(result.assets[0]) };
}

export async function captureImageWithCamera(): Promise<ImageCaptureOutcome> {
  const permission = await requestCameraPermissionsAsync();
  if (permission.status !== 'granted') {
    return { status: 'permission_denied' };
  }

  const result = await launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.9,
  });

  if (result.canceled || result.assets.length === 0) {
    return { status: 'cancelled' };
  }

  return { status: 'success', asset: normalizeAsset(result.assets[0]) };
}

export function validateImage(
  asset: ImageCaptureAsset,
  allowedMimeTypes: readonly string[] = ALLOWED_IMAGE_MIME_TYPES,
  maxSizeBytes: number = MAX_IMAGE_SIZE_BYTES,
): ImageValidationResult {
  if (!allowedMimeTypes.includes(asset.mimeType)) {
    return { valid: false, error: 'invalid_mime_type' };
  }

  if (asset.sizeBytes > maxSizeBytes) {
    return { valid: false, error: 'file_too_large' };
  }

  return { valid: true };
}

function computeDownscaleSize(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } | null {
  const longestSide = Math.max(width, height);
  if (longestSide <= maxDimension || longestSide === 0) {
    return null;
  }

  const scale = maxDimension / longestSide;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

async function downscaleImage(
  asset: ImageCaptureAsset,
): Promise<{ uri: string; mimeType: string }> {
  const targetSize = computeDownscaleSize(
    asset.width,
    asset.height,
    DOWNSCALE_MAX_DIMENSION,
  );

  const context = ImageManipulator.manipulate(asset.uri);
  if (targetSize) {
    context.resize(targetSize);
  }

  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    compress: DOWNSCALE_QUALITY,
    format: SaveFormat.JPEG,
  });

  return { uri: saved.uri, mimeType: 'image/jpeg' };
}

// Upload mechanism decided for this slice: read the (downscaled) local file
// into an ArrayBuffer with expo-file-system's `File.arrayBuffer()` and pass
// that buffer straight to the Storage client. This avoids the FormData/Blob
// path, which is unreliable for local `file://` URIs under Hermes on
// Android, and avoids a manual base64 round-trip.
export async function uploadImageToStorage(
  client: SupabaseClient<Database>,
  asset: ImageCaptureAsset,
  shelterId: string,
  animalId: string,
): Promise<string> {
  const downscaled = await downscaleImage(asset);
  const fileExt = downscaled.mimeType.split('/')[1] ?? 'jpg';
  const path = `${shelterId}/animals/${animalId}/${uuid.v4()}.${fileExt}`;

  const file = new File(downscaled.uri);
  const bytes = await file.arrayBuffer();

  const { error } = await client.storage
    .from('shelter-media')
    .upload(path, bytes, {
      cacheControl: '3600',
      contentType: downscaled.mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`upload_failed: ${error.message}`);
  }

  return path;
}
