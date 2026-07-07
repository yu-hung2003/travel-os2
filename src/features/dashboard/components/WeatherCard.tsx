import { useEffect, useState } from 'react';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { db } from '@/data/db';
import { getWeather, type WeatherSnapshot } from '@/data/sync/weatherService';
import type { GeoPoint, TripDay } from '@/domain/types';

const FALLBACK_OSAKA: GeoPoint = { lat: 34.6937, lng: 135.5023 };
const OVERRIDE_KEY = 'travelos2-weather-override'; // {label, lat, lng} | absent = auto

interface Override { label: string; lat: number; lng: number }

function loadOverride(): Override | null {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    return raw ? (JSON.parse(raw) as Override) : null;
  } catch {
    return null;
  }
}

/** candidate locations for the picker: accommodations + today's located events */
async function listCandidates(day: TripDay): Promise<Override[]> {
  const out: Override[] = [];
  const seen = new Set<string>();
  const push = (label: string, p?: GeoPoint) => {
    if (!p) return;
    const k = `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ label, lat: p.lat, lng: p.lng });
  };
  const accs = await db.accommodations.where('tripId').equals(day.tripId).toArray();
  for (const a of accs) push(`🏨 ${a.name}`, a.location);
  const evs = await db.events.where('dayId').equals(day.id).sortBy('order');
  for (const e of evs) push(e.placeName ?? e.title, e.location);
  return out;
}

interface WeatherPoint {
  point: GeoPoint;
  /** human-readable source of the coordinates, shown on the card */
  label: string;
}

/**
 * Resolve "today's" weather point generically:
 * first located event of the day → accommodation → later days' first located
 * event → Osaka fallback. Always returns a label naming the location.
 */
async function resolvePoint(day: TripDay): Promise<WeatherPoint> {
  const dayEvents = await db.events.where('dayId').equals(day.id).sortBy('order');
  const located = dayEvents.find((e) => e.location);
  if (located?.location) {
    return { point: located.location, label: located.placeName ?? located.title };
  }

  if (day.accommodationId) {
    const acc = await db.accommodations.get(day.accommodationId);
    if (acc?.location) return { point: acc.location, label: acc.name };
  }

  const laterDays = await db.days
    .where('tripId').equals(day.tripId)
    .and((d) => d.dayIndex >= day.dayIndex)
    .sortBy('dayIndex');
  for (const d of laterDays) {
    const evs = await db.events.where('dayId').equals(d.id).sortBy('order');
    const hit = evs.find((e) => e.location);
    if (hit?.location) {
      return { point: hit.location, label: hit.placeName ?? hit.title };
    }
  }
  return { point: FALLBACK_OSAKA, label: '大阪' };
}

function msnWeatherUrl(p: GeoPoint): string {
  return `https://www.msn.com/zh-tw/weather/forecast?lat=${p.lat}&lon=${p.lng}&weadegreetype=C`;
}

export function WeatherCard({ day }: { day: TripDay }) {
  const [override, setOverride] = useState<Override | null>(loadOverride());
  const [picking, setPicking] = useState(false);
  const auto = useLiveQuery(() => resolvePoint(day), [day.id]);
  const candidates = useLiveQuery(
    () => (picking ? listCandidates(day) : Promise.resolve([] as Override[])),
    [day.id, picking],
  );
  const resolved: WeatherPoint | undefined = override
    ? { point: { lat: override.lat, lng: override.lng }, label: `${override.label}(固定)` }
    : auto;
  const point = resolved?.point;
  const [snap, setSnap] = useState<WeatherSnapshot | null | 'loading'>('loading');

  useEffect(() => {
    if (!point) return;
    let cancelled = false;
    setSnap('loading');
    getWeather(point).then((s) => {
      if (!cancelled) setSnap(s);
    });
    return () => {
      cancelled = true;
    };
  }, [point?.lat, point?.lng]);

  const heat = snap !== 'loading' && snap !== null && Math.max(snap.feelsC, snap.tempC) >= 36;
  const rain = snap !== 'loading' && snap !== null && snap.pop >= 0.6;

  return (
    <>
    <a
      href={point ? msnWeatherUrl(point) : undefined}
      target="_blank"
      rel="noreferrer"
      className="card block p-4 active:opacity-80"
    >
      <span className="flex items-center justify-between gap-1">
        <p className="min-w-0 truncate text-xs font-semibold text-ink-2">
          今日天氣{resolved ? ` · ${resolved.label}` : ''}
        </p>
        <button
          className="shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold text-ink-2 active:opacity-70"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPicking(true);
          }}
        >
          📍 切換
        </button>
      </span>
      {snap === 'loading' ? (
        <p className="mt-1.5 text-xl font-bold text-ink-3">…</p>
      ) : snap === null ? (
        <>
          <p className="mt-1.5 text-xl font-bold">--°C</p>
          <p className="mt-0.5 text-[11px] text-ink-3">目前無法取得天氣</p>
        </>
      ) : (
        <>
          <p className="mt-1.5 text-xl font-bold tabular-nums">
            {snap.emoji} {snap.tempC}°C
          </p>
          <p className="mt-0.5 text-[11px] text-ink-2">
            體感 {snap.feelsC}° · 降雨 {Math.round(snap.pop * 100)}%
            {snap.tmaxC !== undefined && ` · ${snap.tminC ?? '--'}~${snap.tmaxC}°`}
          </p>
          {heat && (
            <p className="mt-1 rounded-lg bg-danger/10 px-2 py-1 text-[11px] font-semibold text-danger">
              🥵 高溫警示:11-15 時建議室內行程
            </p>
          )}
          {rain && (
            <p className="mt-1 rounded-lg bg-accent/10 px-2 py-1 text-[11px] font-semibold text-accent">
              🌧️ 降雨機率高:啟動 Rain Plan(室內備案)
            </p>
          )}
          {snap.stale && (
            <p className="mt-1 text-[10px] text-ink-3">
              離線快取 · {format(snap.fetchedAt, 'HH:mm')} 更新
            </p>
          )}
          <p className="mt-1 text-[10px] text-ink-3">點看 MSN 完整預報 →</p>
        </>
      )}
    </a>

    <BottomSheet open={picking} onClose={() => setPicking(false)} title="天氣預報地點">
      <div className="flex flex-col gap-2">
        <p className="text-xs text-ink-3">
          預設「自動」依當日行程判斷;臨時改去別區時可固定顯示指定地點的天氣(僅此裝置)。
        </p>
        <button
          className={`rounded-xl p-3 text-left text-sm font-semibold ${
            override === null ? 'bg-primary text-primary-ink' : 'bg-surface-3 text-ink-2'
          }`}
          onClick={() => {
            localStorage.removeItem(OVERRIDE_KEY);
            setOverride(null);
            setPicking(false);
          }}
        >
          🔄 自動(依當日行程)
        </button>
        {(candidates ?? []).map((c) => (
          <button
            key={`${c.lat}-${c.lng}`}
            className={`rounded-xl p-3 text-left text-sm font-semibold ${
              override && Math.abs(override.lat - c.lat) < 1e-6 && Math.abs(override.lng - c.lng) < 1e-6
                ? 'bg-primary text-primary-ink'
                : 'bg-surface-3 text-ink-2'
            }`}
            onClick={() => {
              localStorage.setItem(OVERRIDE_KEY, JSON.stringify(c));
              setOverride(c);
              setPicking(false);
            }}
          >
            {c.label}
          </button>
        ))}
        {candidates && candidates.length === 0 && (
          <p className="text-xs text-ink-3">目前沒有可選地點(行程/住宿需有座標)。</p>
        )}
      </div>
    </BottomSheet>
    </>
  );
}
