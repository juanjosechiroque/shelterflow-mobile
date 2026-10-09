/**
 * Query key factory for the animal feature.
 *
 * Kept in its own module so adoption and evaluation queries can invalidate
 * animal reads without importing `persisted-animal-queries.ts`, which itself
 * depends on the adoption query keys (that would be a circular import).
 */
export const animalKeys = {
  all: (shelterId: string) => ['animals', shelterId] as const,
  list: (shelterId: string) => ['animals', shelterId, 'list'] as const,
  detail: (shelterId: string, animalId: string) =>
    ['animals', shelterId, 'detail', animalId] as const,
  timeline: (shelterId: string, animalId: string) =>
    ['animals', shelterId, 'timeline', animalId] as const,
  photoSignedUrl: (path: string) =>
    ['animals', 'photo-signed-url', path] as const,
};
