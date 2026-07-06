import { db } from '@/data/db';
import { newId } from '@/shared/utils/id';
import type { Place, PlaceStatus } from '@/domain/types';

export type PlaceInput = Omit<Place, 'id' | 'createdAt' | 'updatedAt'>;

export const placeRepository = {
  list(tripId: string): Promise<Place[]> {
    return db.places.where('tripId').equals(tripId).reverse().sortBy('createdAt');
  },
  async add(input: PlaceInput): Promise<void> {
    await db.places.add({
      ...input,
      id: newId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
  async update(id: string, patch: Partial<PlaceInput>): Promise<void> {
    await db.places.update(id, { ...patch, updatedAt: Date.now() });
  },
  async setStatus(id: string, status: PlaceStatus): Promise<void> {
    await db.places.update(id, { status, updatedAt: Date.now() });
  },
  async remove(id: string): Promise<void> {
    await db.places.delete(id);
  },

  /** restore a just-deleted place (undo) */
  async restore(place: Place): Promise<void> {
    await db.places.put(place);
  },
};
