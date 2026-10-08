import {
  createAsyncStorageDraftStore,
  FORM_DRAFT_STORAGE_PREFIX,
  type KeyValueStorage,
} from '@/lib/form-drafts';

function createStorage() {
  const map = new Map<string, string>();
  const storage: KeyValueStorage = {
    getItem: jest.fn(async (key) => map.get(key) ?? null),
    setItem: jest.fn(async (key, value) => {
      map.set(key, value);
    }),
    removeItem: jest.fn(async (key) => {
      map.delete(key);
    }),
  };
  return { storage, map };
}

interface Draft {
  notes: string;
  factors: string[];
}

describe('form draft store', () => {
  it('saves, recovers, and clears a draft under a namespaced key', async () => {
    const { storage, map } = createStorage();
    const store = createAsyncStorageDraftStore<Draft>(storage);

    await store.save('evaluation.c-1', { notes: 'hola', factors: ['a'] });

    expect(map.has(`${FORM_DRAFT_STORAGE_PREFIX}evaluation.c-1`)).toBe(true);
    await expect(store.load('evaluation.c-1')).resolves.toEqual({
      notes: 'hola',
      factors: ['a'],
    });

    await store.clear('evaluation.c-1');
    await expect(store.load('evaluation.c-1')).resolves.toBeNull();
  });

  it('returns null for a missing or corrupt draft', async () => {
    const { storage, map } = createStorage();
    const store = createAsyncStorageDraftStore<Draft>(storage);

    await expect(store.load('missing')).resolves.toBeNull();

    map.set(`${FORM_DRAFT_STORAGE_PREFIX}corrupt`, '{not-json');
    await expect(store.load('corrupt')).resolves.toBeNull();
  });

  it('never stores a signed URL or a token when the draft does not carry one', async () => {
    const { storage, map } = createStorage();
    const store = createAsyncStorageDraftStore<Draft>(storage);

    await store.save('evaluation.c-2', {
      notes: 'Notas del usuario',
      factors: ['Casa estable'],
    });

    const raw = map.get(`${FORM_DRAFT_STORAGE_PREFIX}evaluation.c-2`) ?? '';
    expect(raw).not.toMatch(/https?:\/\//i);
    expect(raw).not.toMatch(/token/i);
    expect(raw).not.toMatch(/signed/i);
  });
});
