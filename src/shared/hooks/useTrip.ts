import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import type { Trip } from '@/domain/types';

/** trip id from the /t/:tripId/* route */
export function useTripId(): string {
  const { tripId = '' } = useParams();
  return tripId;
}

/** the trip this workspace belongs to (undefined while loading) */
export function useTrip(): Trip | undefined {
  const tripId = useTripId();
  return useLiveQuery(
    async () => (tripId ? db.trips.get(tripId) : undefined),
    [tripId],
  );
}

const LAST_TRIP_KEY = 'travelos2-last-trip';

export function rememberTrip(tripId: string): void {
  localStorage.setItem(LAST_TRIP_KEY, tripId);
}

export function lastTripId(): string | null {
  return localStorage.getItem(LAST_TRIP_KEY);
}

export function forgetTrip(tripId: string): void {
  if (localStorage.getItem(LAST_TRIP_KEY) === tripId) {
    localStorage.removeItem(LAST_TRIP_KEY);
  }
}
