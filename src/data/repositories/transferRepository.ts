import { db } from '@/data/db';
import { newId } from '@/shared/utils/id';
import type { Transfer } from '@/domain/types';

export type TransferInput = Omit<Transfer, 'id' | 'createdAt' | 'updatedAt'>;

export const transferRepository = {
  list(tripId: string): Promise<Transfer[]> {
    return db.transfers.where('tripId').equals(tripId).sortBy('datetime');
  },
  async add(input: TransferInput): Promise<void> {
    await db.transfers.add({
      ...input,
      id: newId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
  async update(id: string, patch: Partial<TransferInput>): Promise<void> {
    await db.transfers.update(id, { ...patch, updatedAt: Date.now() });
  },
  async remove(id: string): Promise<void> {
    await db.transfers.delete(id);
  },
};
