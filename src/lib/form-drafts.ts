import AsyncStorage from '@react-native-async-storage/async-storage';

export const FORM_DRAFT_STORAGE_PREFIX = 'shelterflow.draft.';

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface DraftStore<T> {
  load(key: string): Promise<T | null>;
  save(key: string, value: T): Promise<void>;
  clear(key: string): Promise<void>;
}

// A draft is device-local, unencrypted, and temporary — it must never hold
// signed URLs or tokens.
export function createAsyncStorageDraftStore<T>(
  storage: KeyValueStorage = AsyncStorage,
): DraftStore<T> {
  const storageKey = (key: string) => `${FORM_DRAFT_STORAGE_PREFIX}${key}`;

  return {
    async load(key) {
      const raw = await storage.getItem(storageKey(key));
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    async save(key, value) {
      await storage.setItem(storageKey(key), JSON.stringify(value));
    },
    async clear(key) {
      await storage.removeItem(storageKey(key));
    },
  };
}
