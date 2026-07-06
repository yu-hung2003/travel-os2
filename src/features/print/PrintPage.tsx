import { useLiveQuery } from 'dexie-react-hooks';
import { format, parseISO } from 'date-fns';
import { useTripId } from '@/shared/hooks/useTrip';
import { tripRepository } from '@/data/repositories/tripRepository';
import { computeSchedule } from '@/domain/schedule';
import { typeMeta } from '@/features/timeline/eventMeta';
import type { TimelineEvent, TripDay } from '@/domain/types';

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

interface DayBlock {
  day: TripDay;
  events: Array<TimelineEvent & { _arrive?: string; _depart?: string }>;
}

export default function PrintPage() {
  const tripId = useTripId();
  const data = useLiveQuery(async () => {
    const trip = tripId ? await tripRepository.getTrip(tripId) : undefined;
    if (!trip) return null;
    const days = await tripRepository.listDays(trip.id);
    const accommodations = await tripRepository.listAccommodations(trip.id);
    const blocks: DayBlock[] = [];
    for (const day of days) {
      const events = await tripRepository.listDayEvents(day.id, day.activeVersionId);
      const sched = computeSchedule(day.startTime, events);
      blocks.push({
        day,
        events: events.map((e) => {
          const slot = sched.get(e.id);
          return { ...e, _arrive: slot?.arrive, _depart: slot?.depart };
        }),
      });
    }
    return { trip, blocks, accommodations };
  }, [tripId]);

  if (!data) return null;
  const { trip, blocks, accommodations } = data;

  return (
    <div className="py-5 print:py-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold">列印行程表</h1>
        <button
          onClick={() => window.print()}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-ink active:opacity-80"
        >
          🖨️ 列印 / 存成 PDF
        </button>
      </div>
      <p className="mb-4 text-xs text-ink-3 print:hidden">
        手機也能用:按列印後選「儲存為 PDF」,再傳給家人或超商列印。
      </p>

      <div className="text-ink">
        <h2 className="text-xl font-bold">
          {trip.coverEmoji} {trip.title}
        </h2>
        <p className="mt-0.5 text-sm">
          {format(parseISO(trip.startDate), 'yyyy/M/d')} – {format(parseISO(trip.endDate), 'M/d')} · {trip.destination} · {trip.travelers.length} 人
        </p>

        {accommodations.length > 0 && (
          <div className="mt-3 rounded-xl border border-line p-3 text-sm">
            <p className="font-bold">住宿</p>
            {accommodations.map((a) => (
              <p key={a.id} className="mt-1">
                {format(parseISO(a.checkInDate), 'M/d')}–{format(parseISO(a.checkOutDate), 'M/d')} {a.name}
                {a.address ? `(${a.address})` : ''}
              </p>
            ))}
          </div>
        )}

        {blocks.map(({ day, events }) => {
          const d = parseISO(day.date);
          return (
            <section key={day.id} className="mt-5 break-inside-avoid">
              <h3 className="border-b-2 border-ink pb-1 text-base font-bold">
                Day {day.dayIndex} · {format(d, 'M/d')}(週{WEEKDAY[d.getDay()]}) {day.title}
              </h3>
              <table className="mt-1 w-full text-sm">
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id} className="border-b border-line/60 align-top">
                      <td className="w-24 whitespace-nowrap py-1.5 pr-2 tabular-nums">
                        {e._arrive ? `${e._arrive}–${e._depart}` : e.status !== 'scheduled' ? `(${e.status === 'skipped' ? '略過' : '延後'})` : ''}
                      </td>
                      <td className="py-1.5">
                        <span className="font-semibold">{typeMeta[e.type].emoji} {e.title}</span>
                        {e.transit && (e.transit.line || e.transit.from) && (
                          <span className="block text-xs">
                            {[
                              e.transit.from && e.transit.to ? `${e.transit.from}→${e.transit.to}` : undefined,
                              [e.transit.trainType, e.transit.line].filter(Boolean).join(' '),
                              e.transit.farePerAdult ? `¥${e.transit.farePerAdult}/人` : undefined,
                            ].filter(Boolean).join(' · ')}
                          </span>
                        )}
                        {e.alert && <span className="block text-xs">⚠️ {e.alert}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}

        <p className="mt-5 text-xs">
          緊急:警察 110 · 救護 119 · 駐大阪辦事處 06-6443-8481(急難 090-8794-4568)
        </p>
      </div>
    </div>
  );
}
