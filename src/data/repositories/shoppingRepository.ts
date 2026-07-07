import { db } from '@/data/db';
import { newId } from '@/shared/utils/id';
import type { ShoppingItem, ShoppingPhoto } from '@/domain/types';

export const shoppingRepository = {
  list(tripId: string): Promise<ShoppingItem[]> {
    return db.shopping.where('tripId').equals(tripId).sortBy('createdAt');
  },
  async add(input: {
    tripId: string;
    name: string;
    forWho?: string;
    estPrice?: number;
    qty: number;
    note?: string;
  }): Promise<void> {
    await db.shopping.add({
      id: newId(),
      tripId: input.tripId,
      name: input.name.trim(),
      forWho: input.forWho?.trim() || undefined,
      estPrice: input.estPrice,
      qty: Math.max(1, Math.round(input.qty)),
      note: input.note?.trim() || undefined,
      checked: false,
      createdAt: Date.now(),
    });
  },
  async toggle(id: string): Promise<void> {
    const item = await db.shopping.get(id);
    if (!item) return;
    await db.shopping.update(id, { checked: !item.checked });
  },
  /** delete an item and its photos; returns the photos for undo */
  async remove(id: string): Promise<ShoppingPhoto[]> {
    const photos = await db.photos.where('itemId').equals(id).toArray();
    await db.transaction('rw', [db.shopping, db.photos], async () => {
      await db.photos.where('itemId').equals(id).delete();
      await db.shopping.delete(id);
    });
    return photos;
  },
  async restore(item: ShoppingItem, photos: ShoppingPhoto[] = []): Promise<void> {
    await db.transaction('rw', [db.shopping, db.photos], async () => {
      await db.shopping.put(item);
      for (const p of photos) await db.photos.put(p);
    });
  },

  listPhotos(tripId: string): Promise<ShoppingPhoto[]> {
    return db.photos.where('tripId').equals(tripId).toArray();
  },
  async addPhoto(tripId: string, itemId: string, dataUrl: string): Promise<void> {
    await db.photos.add({ id: newId(), tripId, itemId, dataUrl, createdAt: Date.now() });
  },
  async removePhoto(id: string): Promise<void> {
    await db.photos.delete(id);
  },
};
