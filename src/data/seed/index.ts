import { db } from '@/data/db';
import { buildKyotoOsakaSeed } from '@/data/seed/kyotoOsaka2026';

const SEED_FLAG = 'seed:ko26';

/**
 * Idempotent first-run import. Runs inside one transaction; if the
 * trip was already seeded once, user data is never touched again —
 * edits, reordering and deletions all survive app updates.
 */
export async function ensureSeeded(): Promise<void> {
  const done = localStorage.getItem(SEED_FLAG);
  if (done) return;

  const existing = await db.trips.get('ko26');
  if (existing) {
    localStorage.setItem(SEED_FLAG, '1');
    return;
  }

  const { trip, days, events, accommodations, versions } = buildKyotoOsakaSeed();
  await db.transaction('rw', [db.trips, db.days, db.events, db.accommodations, db.dayVersions, db.prefs], async () => {
    await db.trips.add(trip);
    await db.days.bulkAdd(days);
    await db.events.bulkAdd(events);
    await db.accommodations.bulkAdd(accommodations);
    await db.dayVersions.bulkAdd(versions);
    const pref = await db.prefs.get('default');
    await db.prefs.put({
      key: 'default',
      theme: pref?.theme ?? 'auto',
      homeCurrency: pref?.homeCurrency ?? 'TWD',
      activeTripId: trip.id,
    });
  });
  localStorage.setItem(SEED_FLAG, '1');
}


/**
 * Replace the Kyoto-Osaka trip's itinerary structure (days / versions /
 * events / accommodations) with the current seed, keeping user data:
 * expenses, packing, places, transfers and the trip row (incl. renamed
 * travelers). Places that were scheduled fall back to 'chosen' because
 * their linked events are recreated. All changes flow through Dexie
 * hooks, so family sync propagates the reimport automatically.
 */
export async function reimportItinerary(): Promise<void> {
  const { trip, days, events, accommodations, versions } = buildKyotoOsakaSeed();
  await db.transaction(
    'rw',
    [db.trips, db.days, db.events, db.accommodations, db.dayVersions, db.places],
    async () => {
      await db.events.where('tripId').equals(trip.id).delete();
      await db.dayVersions.where('tripId').equals(trip.id).delete();
      await db.days.where('tripId').equals(trip.id).delete();
      await db.accommodations.where('tripId').equals(trip.id).delete();

      await db.days.bulkAdd(days);
      await db.dayVersions.bulkAdd(versions);
      await db.events.bulkAdd(events);
      await db.accommodations.bulkAdd(accommodations);

      // scheduled wishlist entries lost their event links
      await db.places
        .where('tripId').equals(trip.id)
        .and((p) => p.status === 'scheduled')
        .modify({ status: 'chosen', updatedAt: Date.now() });

      const existing = await db.trips.get(trip.id);
      if (existing) {
        await db.trips.update(trip.id, { note: trip.note, updatedAt: Date.now() });
      } else {
        await db.trips.add(trip);
      }
    },
  );
}


/**
 * Replace the Kyoto-Osaka trip's itinerary structure (days / versions /
 * events / accommodations) with the current seed, PRESERVING expenses,
 * packing, places, transfers and the trip row (incl. renamed travelers).
 * Runs through normal Dexie writes so family sync propagates it.
 */
export async function reimportKyotoOsakaItinerary(): Promise<void> {
  const { days, events, accommodations, versions } = buildKyotoOsakaSeed();
  await db.transaction(
    'rw',
    [db.trips, db.days, db.events, db.accommodations, db.dayVersions, db.places],
    async () => {
      await db.events.where('tripId').equals('ko26').delete();
      await db.days.where('tripId').equals('ko26').delete();
      await db.dayVersions.where('tripId').equals('ko26').delete();
      await db.accommodations.where('tripId').equals('ko26').delete();

      await db.days.bulkAdd(days);
      await db.dayVersions.bulkAdd(versions);
      await db.events.bulkAdd(events);
      await db.accommodations.bulkAdd(accommodations);

      // scheduled wishlist entries now point at removed events → back to chosen
      await db.places
        .where('tripId').equals('ko26')
        .and((p) => p.status === 'scheduled')
        .modify({ status: 'chosen', updatedAt: Date.now() });

      await db.trips.update('ko26', { updatedAt: Date.now() });
    },
  );
}
