import Dexie, { type Table } from 'dexie';
import type {
  Trip, TripDay, TimelineEvent, Expense, JournalEntry,
  PackingItem, Accommodation, WeatherCache, UserPref,
  Transfer, Place, DayVersion, ShoppingItem, ShoppingPhoto,
} from '@/domain/types';

/**
 * Travel OS local database (IndexedDB via Dexie).
 * Schema changes MUST bump the version number and, when needed,
 * provide an upgrade() migration — never mutate version 1 in place
 * once real user data exists.
 */
export class TravelOSDB extends Dexie {
  trips!: Table<Trip, string>;
  days!: Table<TripDay, string>;
  events!: Table<TimelineEvent, string>;
  expenses!: Table<Expense, string>;
  journal!: Table<JournalEntry, string>;
  packing!: Table<PackingItem, string>;
  accommodations!: Table<Accommodation, string>;
  weatherCache!: Table<WeatherCache, string>;
  prefs!: Table<UserPref, string>;
  transfers!: Table<Transfer, string>;
  places!: Table<Place, string>;
  dayVersions!: Table<DayVersion, string>;
  shopping!: Table<ShoppingItem, string>;
  photos!: Table<ShoppingPhoto, string>;

  constructor() {
    super('travel-os');
    this.version(1).stores({
      trips: 'id, status, startDate',
      days: 'id, tripId, [tripId+dayIndex], date',
      events: 'id, tripId, dayId, [dayId+order], status',
      expenses: 'id, tripId, dayId, eventId, category, timestamp',
      journal: 'id, tripId, dayId, createdAt',
      packing: 'id, tripId, category',
      accommodations: 'id, tripId, checkInDate',
      weatherCache: 'locationKey, fetchedAt',
      prefs: 'key',
    });
    // v6: shopping item photos (compressed, sync-friendly)
    this.version(6).stores({
      photos: 'id, tripId, itemId',
    });
    // v5: shared shopping list
    this.version(5).stores({
      shopping: 'id, tripId',
    });
    // v4: duration-based scheduling + per-day itinerary versions
    this.version(4).stores({
      dayVersions: 'id, dayId, tripId',
    }).upgrade(async (tx) => {
      const days = await tx.table('days').toArray();
      const events = await tx.table('events').toArray();

      for (const day of days) {
        const versionId = `${day.id}-v1`;
        await tx.table('dayVersions').add({
          id: versionId,
          dayId: day.id,
          tripId: day.tripId,
          name: 'Original',
          createdAt: Date.now(),
        });

        const dayEvents = events
          .filter((e) => e.dayId === day.id)
          .sort((a, b) => a.order - b.order);

        // day start time from the first fixed time we had
        const firstTimed = dayEvents.find((e) => e.startTime);
        await tx.table('days').update(day.id, {
          startTime: firstTimed?.startTime ?? '08:30',
          activeVersionId: versionId,
        });

        const activeIds = dayEvents
          .filter((e) => e.status !== 'skipped' && e.status !== 'postponed')
          .map((e) => e.id);

        for (const e of dayEvents) {
          const patch: Record<string, unknown> = { versionId };
          // derive duration from legacy fixed times when sensible
          if (e.durationMin == null && e.startTime && e.endTime) {
            const [sh, sm] = e.startTime.split(':').map(Number);
            const [eh, em] = e.endTime.split(':').map(Number);
            const dur = eh * 60 + em - (sh * 60 + sm);
            if (dur > 0 && dur <= 12 * 60) patch.durationMin = dur;
          }
          if (e.type === 'transport') {
            const idx = activeIds.indexOf(e.id);
            const prev = idx > 0 ? activeIds[idx - 1] : '';
            const next = idx >= 0 && idx < activeIds.length - 1 ? activeIds[idx + 1] : '';
            patch.neighborSig = `${prev}|${next}`;
          }
          await tx.table('events').update(e.id, patch);
        }
      }
    });
    // v3: airport transfers + place wishlist
    this.version(3).stores({
      transfers: 'id, tripId, datetime',
      places: 'id, tripId, status, createdAt',
    });
    // v2: expenses gain memberIds (multi-member tagging)
    this.version(2).upgrade(async (tx) => {
      await tx.table('expenses').toCollection().modify((e: { memberIds?: string[]; paidBy?: string }) => {
        if (!e.memberIds) e.memberIds = e.paidBy ? [e.paidBy] : [];
      });
    });
  }
}

export const db = new TravelOSDB();
