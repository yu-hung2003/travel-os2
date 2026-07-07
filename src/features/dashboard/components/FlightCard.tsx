import { useLiveQuery } from 'dexie-react-hooks';
import { format, parseISO } from 'date-fns';
import { flightRepository } from '@/data/repositories/flightRepository';
import type { Trip } from '@/domain/types';

function fmtCountdown(ms: number): string {
  if (ms <= 0) return '起飛時間已到';
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(h / 24);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (d > 0) return `${d} 天 ${h % 24} 小時`;
  if (h > 0) return `${h} 小時 ${m} 分`;
  return `${m} 分`;
}

/** shown on the dashboard: outbound before the trip, return on the last day */
export function FlightCard({ trip, kind, now }: { trip: Trip; kind: 'outbound' | 'return'; now: number }) {
  const flight = useLiveQuery(
    async () => (await flightRepository.list(trip.id)).find((f) => f.kind === kind) ?? null,
    [trip.id, kind],
  );
  if (!flight) return null;

  const dep = parseISO(flight.depTime).getTime();
  const untilDep = dep - now;
  const showCheckIn = flight.remindCheckIn && untilDep > 0 && untilDep <= 24 * 3_600_000;
  const showDepart = flight.remindDepart && untilDep > 0 && untilDep <= 3 * 3_600_000;

  return (
    <section className="card p-4">
      <p className="text-xs font-semibold text-ink-2">
        ✈️ {kind === 'outbound' ? '去程航班' : '回程航班'}
        {flight.airline ? ` · ${flight.airline}` : ''} · <span className="font-bold">{flight.flightNo}</span>
      </p>
      <div className="mt-1.5 space-y-0.5 text-sm tabular-nums">
        <p>
          <span className="mr-1">🛫</span>
          <span className="font-bold">{format(parseISO(flight.depTime), 'M/d(EEE) HH:mm')}</span>
          {flight.depAirport && <span className="ml-1.5 font-semibold text-ink-2">{flight.depAirport}</span>}
        </p>
        {(flight.arrTime || flight.arrAirport) && (
          <p>
            <span className="mr-1">🛬</span>
            {flight.arrTime && (
              <span className="font-bold">{format(parseISO(flight.arrTime), 'M/d(EEE) HH:mm')}</span>
            )}
            {flight.arrAirport && <span className="ml-1.5 font-semibold text-ink-2">{flight.arrAirport}</span>}
            {flight.arrTime && (() => {
              const mins = (parseISO(flight.arrTime).getTime() - parseISO(flight.depTime).getTime()) / 60000;
              if (mins <= 0 || mins >= 24 * 60) return null;
              return (
                <span className="ml-1.5 text-xs text-ink-3">
                  (飛行約 {Math.floor(mins / 60)} 時 {Math.round(mins % 60)} 分)
                </span>
              );
            })()}
          </p>
        )}
      </div>
      {untilDep > 0 && (
        <p className="mt-0.5 text-xs tabular-nums text-ink-2">距離起飛 {fmtCountdown(untilDep)}</p>
      )}
      {showCheckIn && (
        <p className="mt-1.5 rounded-lg bg-warning/10 px-2 py-1 text-xs font-semibold text-warning">
          🛄 已進入 24 小時內,記得完成線上報到/選位
        </p>
      )}
      {showDepart && (
        <p className="mt-1.5 rounded-lg bg-danger/10 px-2 py-1 text-xs font-semibold text-danger">
          🚕 起飛前 3 小時內——該出發前往機場了!
        </p>
      )}
      {flight.note && <p className="mt-1 text-xs text-ink-3">{flight.note}</p>}
    </section>
  );
}
