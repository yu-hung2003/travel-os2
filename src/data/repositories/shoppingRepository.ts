import { db } from '@/data/db';
import { newId } from '@/shared/utils/id';
import type { ShoppingItem } from '@/domain/types';

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
  async remove(id: string): Promise<void> {
    await db.shopping.delete(id);
  },
  async restore(item: ShoppingItem): Promise<void> {
    await db.shopping.put(item);
  },
};
