import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import { getWeather, type WeatherSnapshot } from '@/data/sync/weatherService';
import { eventRepository } from '@/data/repositories/eventRepository';
import { buildSuggestions } from '@/domain/suggestions';
import type { GeoPoint, TimelineEvent, TripDay } from '@/domain/types';

const FALLBACK_OSAKA: GeoPoint = { lat: 34.6937, lng: 135.5023 };

const severityCls = {
  danger: 'bg-danger/10 text-danger',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-accent/10 text-accent',
} as const;

interface Props {
  day: TripDay;
  events: TimelineEvent[];
  nowMins: number;
  preview?: boolean;
}

export function SmartSuggestions({ day, events, nowMins, preview = false }: Props) {
  // reuse the day's first located event for weather (cache-backed, cheap)
  const point = useLiveQuery(async () => {
    const located = events.find((e) => e.location);
    if (located?.location) return located.location;
    if (day.accommodationId) {
      const acc = await db.accommodations.get(day.accommodationId);
      if (acc?.location) return acc.location;
    }
    return FALLBACK_OSAKA;
  }, [day.id, events.length]);

  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  useEffect(() => {
    if (!point || preview) return;
    let cancelled = false;
    getWeather(point).then((s) => {
      if (!cancelled) setWeather(s);
    });
    return () => {
      cancelled = true;
    };
  }, [point?.lat, point?.lng, preview]);

  const suggestions = useMemo(
    () => buildSuggestions({ events, weather, nowMins, preview }),
    [events, weather, nowMins, preview],
  );

  if (suggestions.length === 0) return null;

  return (
    <section className="card p-5">
      <h2 className="text-xs font-semibold text-ink-2">💡 智慧提醒</h2>
      <ul className="mt-2 space-y-2">
        {suggestions.map((s) => {
          const overdue = s.overdueEventId
            ? events.find((e) => e.id === s.overdueEventId)
            : undefined;
          return (
            <li key={s.id} className={`rounded-xl px-3 py-2.5 ${severityCls[s.severity]}`}>
              <p className="text-sm font-semibold leading-relaxed">
                {s.icon} {s.text}
              </p>
              {overdue && (
                <div className="mt-1.5 flex gap-2">
                  <button
                    onClick={() => eventRepository.setStatus(overdue.id, 'completed')}
                    className="rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-bold text-ink active:opacity-70"
                  >
                    ✅ 標記完成
                  </button>
                  <button
                    onClick={() => eventRepository.setStatus(overdue.id, 'postponed')}
                    className="rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-bold text-ink active:opacity-70"
                  >
                    ⏳ 延後
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
