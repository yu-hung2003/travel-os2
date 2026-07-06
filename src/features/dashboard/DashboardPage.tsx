import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTrip } from '@/shared/hooks/useTrip';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { tripRepository } from '@/data/repositories/tripRepository';
import { useNow } from '@/features/dashboard/useNow';
import { TodayBoard } from '@/features/dashboard/components/TodayBoard';
import { PackingReminderCard } from '@/features/dashboard/components/PackingReminderCard';


export default function DashboardPage() {
  const trip = useTrip();
  // Hooks must run unconditionally; default tz until trip loads.
  const now = useNow(trip?.timezone ?? 'Asia/Tokyo');
  const days = useLiveQuery(
    () => (trip ? tripRepository.listDays(trip.id) : Promise.resolve([])),
    [trip?.id],
  );

  if (!trip || !days || days.length === 0) return null;

  const todayIso = format(now, 'yyyy-MM-dd');
  const today = days.find((d) => d.date === todayIso);
  const beforeTrip = todayIso < trip.startDate;
  const afterTrip = todayIso > trip.endDate;

  return (
    <div className="flex flex-col gap-3 py-5">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">今日</h1>
        <span className="text-sm text-ink-3">{format(new Date(), 'M/d')}（台灣）</span>
      </header>

      {/* during the trip */}
      {today && <TodayBoard trip={trip} day={today} now={now} />}

      {/* before the trip: countdown + preview */}
      {beforeTrip && (
        <>
          {differenceInCalendarDays(parseISO(trip.startDate), parseISO(todayIso)) <= 3 && (
            <PackingReminderCard trip={trip} />
          )}
          <section className="card p-5">
            <p className="text-xs font-semibold text-primary">{trip.coverEmoji} {trip.title}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums">
              {differenceInCalendarDays(parseISO(trip.startDate), parseISO(todayIso))}
              <span className="ml-1 text-base font-semibold text-ink-2">天後出發</span>
            </p>
            <p className="mt-1 text-sm text-ink-2">
              {format(parseISO(trip.startDate), 'yyyy/M/d')} 出發 · {trip.destination}
            </p>
            <Link
              to={`/t/${trip.id}/info`}
              className="mt-3 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-ink active:opacity-80"
            >
              查看完整行程
            </Link>
          </section>
          <TodayBoard trip={trip} day={days[0]} now={now} preview />
        </>
      )}

      {/* after the trip */}
      {afterTrip && (
        <section className="card p-5">
          <p className="text-lg font-bold">{trip.coverEmoji} {trip.title} 已圓滿結束</p>
          <p className="mt-1 text-sm text-ink-2">
            到旅程頁回顧行程,或準備下一趟冒險。
          </p>
        </section>
      )}
    </div>
  );
}
