import { db } from '@/data/db';
import { newId } from '@/shared/utils/id';
import type { Trip, TripDay, TimelineEvent, Accommodation, Traveler } from '@/domain/types';

export const tripRepository = {
  /** Create a fresh trip with one day (+Original version) per date. */
  async createTrip(input: {
    title: string;
    destination: string;
    coverEmoji?: string;
    startDate: string;   // yyyy-MM-dd
    endDate: string;
    timezone: string;
    currency: string;
    homeCurrency: string;
    travelers: Traveler[];
  }): Promise<string> {
    const tripId = newId();
    const now = Date.now();
    const trip: Trip = {
      id: tripId,
      title: input.title.trim(),
      destination: input.destination.trim(),
      coverEmoji: input.coverEmoji,
      startDate: input.startDate,
      endDate: input.endDate,
      timezone: input.timezone,
      currency: input.currency,
      homeCurrency: input.homeCurrency,
      travelers: input.travelers,
      status: 'planning',
      createdAt: now,
      updatedAt: now,
    };
    await db.transaction('rw', [db.trips, db.days, db.dayVersions], async () => {
      await db.trips.add(trip);
      const start = new Date(`${input.startDate}T00:00`);
      const end = new Date(`${input.endDate}T00:00`);
      let dayIndex = 1;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayId = newId();
        const versionId = newId();
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        await db.days.add({
          id: dayId,
          tripId,
          dayIndex,
          date: iso,
          startTime: '08:30',
          activeVersionId: versionId,
        });
        await db.dayVersions.add({
          id: versionId, dayId, tripId, name: 'Original', createdAt: now,
        });
        dayIndex += 1;
      }
    });
    return tripId;
  },

  /**
   * Delete a trip and all its data on THIS device.
   * Callers must unlink partner sync first so deletes don't propagate.
   */
  async deleteTrip(tripId: string): Promise<void> {
    await db.transaction(
      'rw',
      [db.trips, db.days, db.dayVersions, db.events, db.expenses, db.packing,
       db.accommodations, db.transfers, db.places, db.shopping],
      async () => {
        for (const table of [db.days, db.dayVersions, db.events, db.expenses,
          db.packing, db.accommodations, db.transfers, db.places, db.shopping]) {
          await table.where('tripId').equals(tripId).delete();
        }
        await db.trips.delete(tripId);
      },
    );
  },

  listTrips(): Promise<Trip[]> {
    return db.trips.orderBy('startDate').toArray();
  },
  getTrip(tripId: string): Promise<Trip | undefined> {
    return db.trips.get(tripId);
  },
  listDays(tripId: string): Promise<TripDay[]> {
    return db.days.where('tripId').equals(tripId).sortBy('dayIndex');
  },
  listDayEvents(dayId: string, versionId?: string): Promise<TimelineEvent[]> {
    let coll = db.events.where('dayId').equals(dayId);
    if (versionId) coll = coll.and((e) => (e.versionId ?? '') === versionId);
    return coll.sortBy('order');
  },

  async updateDayStartTime(dayId: string, startTime: string): Promise<void> {
    await db.days.update(dayId, { startTime });
  },
  listTripEvents(tripId: string): Promise<TimelineEvent[]> {
    return db.events.where('tripId').equals(tripId).toArray();
  },
  /** Replace the traveler list; also strips deleted ids from expense tags. */
  async updateTravelers(tripId: string, travelers: Traveler[]): Promise<void> {
    const keep = new Set(travelers.map((t) => t.id));
    await db.transaction('rw', [db.trips, db.expenses], async () => {
      await db.trips.update(tripId, { travelers, updatedAt: Date.now() });
      await db.expenses.where('tripId').equals(tripId).modify((e) => {
        if (e.memberIds?.some((id) => !keep.has(id))) {
          e.memberIds = e.memberIds.filter((id) => keep.has(id));
        }
      });
    });
  },

  async updateAccommodationLocation(id: string, location: import('@/domain/types').GeoPoint): Promise<void> {
    await db.accommodations.update(id, { location });
  },

  getAccommodation(id: string): Promise<Accommodation | undefined> {
    return db.accommodations.get(id);
  },
  listAccommodations(tripId: string): Promise<Accommodation[]> {
    return db.accommodations.where('tripId').equals(tripId).sortBy('checkInDate');
  },
};
