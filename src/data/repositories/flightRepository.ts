import { db } from '@/data/db';
import { newId } from '@/shared/utils/id';
import type { Flight } from '@/domain/types';

export const flightRepository = {
  list(tripId: string): Promise<Flight[]> {
    return db.flights.where('tripId').equals(tripId).toArray();
  },
  /** upsert one flight per kind (outbound/return) */
  async save(input: Omit<Flight, 'id'> & { id?: string }): Promise<void> {
    if (input.id) {
      await db.flights.put({ ...input, id: input.id } as Flight);
      return;
    }
    const existing = await db.flights
      .where('tripId').equals(input.tripId)
      .and((f) => f.kind === input.kind)
      .first();
    await db.flights.put({ ...input, id: existing?.id ?? newId() } as Flight);
  },
  async remove(id: string): Promise<void> {
    await db.flights.delete(id);
  },
};
