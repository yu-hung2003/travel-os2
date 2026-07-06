import { db } from '@/data/db';
import type { GeoPoint } from '@/domain/types';

export interface WeatherSnapshot {
  tempC: number;
  feelsC: number;
  desc: string;
  emoji: string;
  /** max probability of precipitation over the next ~24h, 0..1 */
  pop: number;
  tmaxC?: number;
  tminC?: number;
  fetchedAt: number;
  /** true when served from cache because the network failed */
  stale: boolean;
}

const FRESH_MS = 30 * 60 * 1000; // refetch after 30 min

function emojiFor(conditionId: number): string {
  if (conditionId >= 200 && conditionId < 300) return '⛈️';
  if (conditionId >= 300 && conditionId < 600) return '🌧️';
  if (conditionId >= 600 && conditionId < 700) return '❄️';
  if (conditionId >= 700 && conditionId < 800) return '🌫️';
  if (conditionId === 800) return '☀️';
  if (conditionId <= 802) return '🌤️';
  return '☁️';
}

function cacheKey(p: GeoPoint): string {
  return `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`;
}

async function fetchFromApi(p: GeoPoint): Promise<Omit<WeatherSnapshot, 'stale'>> {
  const key = import.meta.env.VITE_OPENWEATHER_KEY;
  if (!key) throw new Error('missing VITE_OPENWEATHER_KEY');

  const base = 'https://api.openweathermap.org/data/2.5';
  const qs = `lat=${p.lat}&lon=${p.lng}&appid=${key}&units=metric&lang=zh_tw`;

  const [curRes, fcRes] = await Promise.all([
    fetch(`${base}/weather?${qs}`),
    fetch(`${base}/forecast?${qs}&cnt=8`), // next 24h in 3h slots
  ]);
  if (!curRes.ok) throw new Error(`weather ${curRes.status}`);
  const cur = await curRes.json();

  let pop = 0;
  let tmaxC: number | undefined;
  let tminC: number | undefined;
  if (fcRes.ok) {
    const fc = await fcRes.json();
    const slots: Array<{ pop?: number; main?: { temp_max?: number; temp_min?: number } }> =
      fc.list ?? [];
    pop = slots.reduce((m, s) => Math.max(m, s.pop ?? 0), 0);
    const maxes = slots.map((s) => s.main?.temp_max).filter((x): x is number => x !== undefined);
    const mins = slots.map((s) => s.main?.temp_min).filter((x): x is number => x !== undefined);
    if (maxes.length) tmaxC = Math.max(...maxes);
    if (mins.length) tminC = Math.min(...mins);
  }

  return {
    tempC: Math.round(cur.main.temp),
    feelsC: Math.round(cur.main.feels_like),
    desc: cur.weather?.[0]?.description ?? '',
    emoji: emojiFor(cur.weather?.[0]?.id ?? 800),
    pop,
    tmaxC: tmaxC !== undefined ? Math.round(tmaxC) : undefined,
    tminC: tminC !== undefined ? Math.round(tminC) : undefined,
    fetchedAt: Date.now(),
  };
}

/**
 * Stale-while-revalidate weather:
 * fresh cache → return; otherwise fetch and cache;
 * fetch failure → last cached value flagged stale; nothing → null.
 */
export async function getWeather(p: GeoPoint): Promise<WeatherSnapshot | null> {
  const key = cacheKey(p);
  const cached = await db.weatherCache.get(key);
  const cachedSnap = cached?.payload as Omit<WeatherSnapshot, 'stale'> | undefined;

  if (cachedSnap && Date.now() - cached!.fetchedAt < FRESH_MS) {
    return { ...cachedSnap, stale: false };
  }

  try {
    const fresh = await fetchFromApi(p);
    await db.weatherCache.put({ locationKey: key, fetchedAt: fresh.fetchedAt, payload: fresh });
    return { ...fresh, stale: false };
  } catch {
    if (cachedSnap) return { ...cachedSnap, stale: true };
    return null;
  }
}
