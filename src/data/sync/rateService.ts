import { db } from '@/data/db';

export interface RateSnapshot {
  /** 1 JPY = rate TWD */
  rate: number;
  fetchedAt: number;
  stale: boolean;
}

const KEY = 'rate:JPY-TWD';
const FRESH_MS = 12 * 60 * 60 * 1000; // 12h

/** JPY→TWD via open.er-api.com (free, keyless); cached offline like weather. */
export async function getJpyTwdRate(): Promise<RateSnapshot | null> {
  const cached = await db.weatherCache.get(KEY);
  const cachedRate = (cached?.payload as { rate?: number } | undefined)?.rate;

  if (cachedRate && Date.now() - cached!.fetchedAt < FRESH_MS) {
    return { rate: cachedRate, fetchedAt: cached!.fetchedAt, stale: false };
  }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/JPY');
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const rate = data?.rates?.TWD;
    if (typeof rate !== 'number' || !(rate > 0)) throw new Error('no TWD rate');
    const fetchedAt = Date.now();
    await db.weatherCache.put({ locationKey: KEY, fetchedAt, payload: { rate } });
    return { rate, fetchedAt, stale: false };
  } catch {
    if (cachedRate && cached) return { rate: cachedRate, fetchedAt: cached.fetchedAt, stale: true };
    return null;
  }
}
