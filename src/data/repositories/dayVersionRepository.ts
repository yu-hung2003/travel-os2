import { db } from '@/data/db';
import { newId } from '@/shared/utils/id';
import type { DayVersion } from '@/domain/types';

export const dayVersionRepository = {
  list(dayId: string): Promise<DayVersion[]> {
    return db.dayVersions.where('dayId').equals(dayId).sortBy('createdAt');
  },

  async setActive(dayId: string, versionId: string): Promise<void> {
    await db.days.update(dayId, { activeVersionId: versionId });
  },

  /** Create a version by copying all events of the source version, then switch to it. */
  async createFrom(input: {
    dayId: string;
    tripId: string;
    name: string;
    sourceVersionId: string;
  }): Promise<string> {
    const versionId = newId();
    await db.transaction('rw', [db.dayVersions, db.events, db.days], async () => {
      await db.dayVersions.add({
        id: versionId,
        dayId: input.dayId,
        tripId: input.tripId,
        name: input.name.trim() || '新版本',
        createdAt: Date.now(),
      });
      const source = await db.events
        .where('dayId').equals(input.dayId)
        .and((e) => (e.versionId ?? '') === input.sourceVersionId)
        .sortBy('order');
      const copies = source.map((e) => ({
        ...e,
        id: newId(),
        versionId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));
      await db.events.bulkAdd(copies);
      await db.days.update(input.dayId, { activeVersionId: versionId });
    });
    return versionId;
  },

  /** Delete a version and its events; refuses to delete the last one. */
  async remove(dayId: string, versionId: string): Promise<boolean> {
    return db.transaction('rw', [db.dayVersions, db.events, db.days], async () => {
      const all = await db.dayVersions.where('dayId').equals(dayId).toArray();
      if (all.length <= 1) return false;
      await db.dayVersions.delete(versionId);
      await db.events
        .where('dayId').equals(dayId)
        .and((e) => (e.versionId ?? '') === versionId)
        .delete();
      const day = await db.days.get(dayId);
      if (day?.activeVersionId === versionId) {
        const fallback = all.find((v) => v.id !== versionId)!;
        await db.days.update(dayId, { activeVersionId: fallback.id });
      }
      return true;
    });
  },
};
