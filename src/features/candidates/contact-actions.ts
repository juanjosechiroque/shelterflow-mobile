import { Linking } from 'react-native';

export type ContactChannel = 'phone' | 'whatsapp';

export interface NormalizedPhoneNumber {
  // Digits only, without a leading plus. Used for `wa.me` links.
  digits: string;
  // Dialable value that preserves a leading plus when the source had one.
  dialable: string;
}

const MIN_DIGITS = 7;
const MAX_DIGITS = 15;

// Returns null for anything unusable so the UI can disable the action
// instead of building a broken link.
export function normalizePhoneNumber(
  raw: string | null | undefined,
): NormalizedPhoneNumber | null {
  if (typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) return null;

  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) return null;

  return {
    digits,
    dialable: hasPlus ? `+${digits}` : digits,
  };
}

export function buildTelephoneUrl(
  raw: string | null | undefined,
): string | null {
  const normalized = normalizePhoneNumber(raw);
  return normalized ? `tel:${normalized.dialable}` : null;
}

export function buildWhatsAppUrl(
  raw: string | null | undefined,
): string | null {
  const normalized = normalizePhoneNumber(raw);
  return normalized ? `https://wa.me/${normalized.digits}` : null;
}

export type OpenContactResult =
  | { status: 'opened' }
  | { status: 'unsupported' }
  | { status: 'error'; message: string };

export interface LinkingLike {
  canOpenURL(url: string): Promise<boolean>;
  openURL(url: string): Promise<unknown>;
}

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

// Checks whether the platform can handle the URL and only then opens it, so
// an unsupported scheme is reported instead of rejecting at `openURL` time.
export async function openContactUrl(
  url: string,
  linking: LinkingLike = Linking,
): Promise<OpenContactResult> {
  try {
    const supported = await linking.canOpenURL(url);
    if (!supported) return { status: 'unsupported' };
  } catch (error) {
    return { status: 'error', message: toMessage(error) };
  }

  try {
    await linking.openURL(url);
    return { status: 'opened' };
  } catch (error) {
    return { status: 'error', message: toMessage(error) };
  }
}
