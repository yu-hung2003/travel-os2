import { db } from '@/data/db';
import type { ThemePref, UserPref } from '@/domain/types';

const KEY = 'default';

const DEFAULTS: UserPref = {
  key: KEY,
  theme: 'auto',
  homeCurrency: 'TWD',
};

export const prefRepository = {
  async get(): Promise<UserPref> {
    return (await db.prefs.get(KEY)) ?? DEFAULTS;
  },
  async setTheme(theme: ThemePref): Promise<void> {
    const current = await this.get();
    await db.prefs.put({ ...current, theme });
  },
  async setActiveTrip(tripId: string): Promise<void> {
    const current = await this.get();
    await db.prefs.put({ ...current, activeTripId: tripId });
  },
};
