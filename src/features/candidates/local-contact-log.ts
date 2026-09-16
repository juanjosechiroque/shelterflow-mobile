import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ContactChannel } from './contact-actions';

/**
 * Device-local record of the contact outcomes a shelter user explicitly
 * records after attempting a native contact action.
 *
 * This is intentionally local-only for this delivery: there is no persisted
 * backend entity or RPC for contact outcomes yet. It never stores signed URLs
 * or tokens, and it never claims a contact succeeded merely because an
 * external application opened.
 */

export const contactOutcomes = [
  'REACHED',
  'NO_ANSWER',
  'WRONG_NUMBER',
  'CALLBACK_REQUESTED',
] as const;

export type ContactOutcome = (typeof contactOutcomes)[number];

export interface ContactLogEntry {
  id: string;
  candidateId: string;
  channel: ContactChannel;
  outcome: ContactOutcome;
  notes: string | null;
  recordedAt: string;
}

export interface NewContactLogEntry {
  candidateId: string;
  channel: ContactChannel;
  outcome: ContactOutcome;
  notes: string | null;
}

export interface ContactLogStore {
  list(candidateId: string): Promise<ContactLogEntry[]>;
  record(input: NewContactLogEntry): Promise<ContactLogEntry>;
}

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const CONTACT_LOG_STORAGE_PREFIX = 'shelterflow.contact-log.';

export interface LocalContactLogOptions {
  storage?: KeyValueStorage;
  now?: () => Date;
  createId?: () => string;
}

function defaultCreateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createLocalContactLogStore(
  options: LocalContactLogOptions = {},
): ContactLogStore {
  const storage = options.storage ?? AsyncStorage;
  const now = options.now ?? (() => new Date());
  const createId = options.createId ?? defaultCreateId;

  const storageKey = (candidateId: string) =>
    `${CONTACT_LOG_STORAGE_PREFIX}${candidateId}`;

  async function read(candidateId: string): Promise<ContactLogEntry[]> {
    const raw = await storage.getItem(storageKey(candidateId));
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ContactLogEntry[]) : [];
    } catch {
      return [];
    }
  }

  return {
    list: (candidateId) => read(candidateId),
    async record(input) {
      const entry: ContactLogEntry = {
        id: createId(),
        recordedAt: now().toISOString(),
        ...input,
      };
      const entries = await read(input.candidateId);
      await storage.setItem(
        storageKey(input.candidateId),
        JSON.stringify([...entries, entry]),
      );
      return entry;
    },
  };
}

export const localContactLogStore = createLocalContactLogStore();
