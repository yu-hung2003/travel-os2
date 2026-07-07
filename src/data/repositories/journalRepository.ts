import { db } from '@/data/db';
import { newId } from '@/shared/utils/id';
import type { JournalEntry } from '@/domain/types';

export const journalRepository = {
  getByDay(dayId: string): Promise<JournalEntry | undefined> {
    return db.journal.where('dayId').equals(dayId).first();
  },
  listByTrip(tripId: string): Promise<JournalEntry[]> {
    return db.journal.where('tripId').equals(tripId).toArray();
  },
  /** one entry per day — upsert */
  async save(tripId: string, dayId: string, text: string): Promise<void> {
    const existing = await db.journal.where('dayId').equals(dayId).first();
    const trimmed = text.trim();
    if (existing) {
      if (!trimmed) {
        await db.journal.delete(existing.id);
        return;
      }
      await db.journal.update(existing.id, { text: trimmed, updatedAt: Date.now() });
    } else if (trimmed) {
      await db.journal.add({
        id: newId(), tripId, dayId, text: trimmed,
        createdAt: Date.now(), updatedAt: Date.now(),
      });
    }
  },
};
