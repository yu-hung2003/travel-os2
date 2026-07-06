import { db } from '@/data/db';
import { buildKyotoOsakaSeed } from '@/data/seed/kyotoOsaka2026';

export interface TripTemplate {
  id: string;          // fixed trip id → enables "already imported" detection
  emoji: string;
  name: string;
  description: string;
}

export const templates: TripTemplate[] = [
  {
    id: 'ko26',
    emoji: '⛩️',
    name: '2026 京阪家庭遊 7天6夜',
    description: '8/8–8/14 京都+大阪,三大一小含完整交通卡、住宿與景點資訊',
  },
];

export async function hasTemplate(id: string): Promise<boolean> {
  return Boolean(await db.trips.get(id));
}

/** Import a template as a local trip (no sync involved). */
export async function importTemplate(id: string): Promise<string> {
  if (id !== 'ko26') throw new Error('unknown-template');
  if (await hasTemplate(id)) throw new Error('exists');
  const { trip, days, events, accommodations, versions } = buildKyotoOsakaSeed();
  await db.transaction(
    'rw',
    [db.trips, db.days, db.events, db.accommodations, db.dayVersions],
    async () => {
      await db.trips.add(trip);
      await db.days.bulkAdd(days);
      await db.dayVersions.bulkAdd(versions);
      await db.events.bulkAdd(events);
      await db.accommodations.bulkAdd(accommodations);
    },
  );
  return trip.id;
}
