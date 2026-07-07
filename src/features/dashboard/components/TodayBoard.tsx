import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { db } from '@/data/db';
import { tripRepository } from '@/data/repositories/tripRepository';
import { typeMeta } from '@/features/timeline/eventMeta';
import { ProgressRing } from '@/features/dashboard/components/ProgressRing';
import { gmapsDirectionsUrl, gmapsSearchUrl } from '@/shared/utils/maps';
import { WeatherCard } from '@/features/dashboard/components/WeatherCard';
import { SmartSuggestions } from '@/features/dashboard/components/SmartSuggestions';
import { CurrencyConverter } from '@/shared/components/CurrencyConverter';
import { JournalCard } from '@/features/dashboard/components/JournalCard';
import type { TimelineEvent, Trip, TripDay } from '@/domain/types';
import { computeSchedule } from '@/domain/schedule';

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

function minutesOf(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatCountdown(mins: number): string {
  if (mins < 60) return `${mins} 分鐘`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} 小時` : `${h} 小時 ${m} 分`;
}

interface Props {
  trip: Trip;
  day: TripDay;
  now: Date;
  /** true when shown before the trip as a preview of Day 1 */
  preview?: boolean;
}

export function TodayBoard({ trip, day, now, preview = false }: Props) {
  const rawEvents = useLiveQuery(
    () => tripRepository.listDayEvents(day.id, day.activeVersionId),
    [day.id, day.activeVersionId],
  );
  // adapter: overlay computed arrive/depart onto startTime/endTime so all
  // downstream logic (countdown, suggestions, alerts) uses the live schedule
  const events = rawEvents
    ? (() => {
        const sched = computeSchedule(day.startTime, rawEvents);
        return rawEvents.map((e) => {
          const slot = sched.get(e.id);
          return slot ? { ...e, startTime: slot.arrive, endTime: slot.depart } : e;
        });
      })()
    : undefined;
  const accommodation = useLiveQuery(
    () => (day.accommodationId ? tripRepository.getAccommodation(day.accommodationId) : Promise.resolve(undefined)),
    [day.accommodationId],
  );
  const todaySpend = useLiveQuery(
    () => db.expenses.where('dayId').equals(day.id).toArray().then(
      (rows) => rows.reduce((sum, r) => sum + r.amount, 0),
    ),
    [day.id],
  );
  const tripSpend = useLiveQuery(
    () => db.expenses.where('tripId').equals(trip.id).toArray().then(
      (rows) => rows.reduce((sum, r) => sum + r.amount, 0),
    ),
    [trip.id],
  );

  if (!events) return null;

  const shareToday = async () => {
    const lines: string[] = [];
    lines.push(`【Day ${day.dayIndex} · ${format(new Date(`${day.date}T00:00`), 'M/d')}(${WEEKDAY[new Date(`${day.date}T00:00`).getDay()]})】${day.title ?? ''}`);
    for (const e of events) {
      if (e.status === 'skipped') continue;
      const time = e.startTime ? `${e.startTime} ` : '';
      const tag = e.status === 'postponed' ? '(延後)' : e.status === 'completed' ? '✅' : '';
      lines.push(`${time}${typeMeta[e.type].emoji} ${e.title} ${tag}`.trim());
      if (e.alert && e.status === 'scheduled') lines.push(`　⚠️ ${e.alert}`);
    }
    if (accommodation) lines.push(`🏨 今晚:${accommodation.name}`);
    lines.push('— Travel OS');
    const text = lines.join('\n');
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch { /* user cancelled → fall through to clipboard */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      alert('已複製今日行程,貼到 LINE 群組吧!');
    } catch {
      alert('無法自動複製,請手動長按選取。');
    }
  };

  const nowMins = now.getHours() * 60 + now.getMinutes();
  const scheduled = events.filter((e) => e.status === 'scheduled' && e.startTime);

  // ongoing: started, not ended yet (needs endTime); otherwise next upcoming
  const ongoing = !preview
    ? scheduled.find((e) =>
        e.startTime && e.endTime &&
        minutesOf(e.startTime) <= nowMins && nowMins < minutesOf(e.endTime))
    : undefined;
  const next = preview
    ? scheduled[0]
    : scheduled.find((e) => minutesOf(e.startTime!) > nowMins);

  const doneCount = events.filter((e) => e.status === 'completed').length;
  const activeCount = events.filter((e) => e.status !== 'skipped').length;
  const alerts = events.filter((e) => e.alert && e.status === 'scheduled');

  const focusEvent: TimelineEvent | undefined = ongoing ?? next;

  return (
    <div className="flex flex-col gap-3">
      {/* hero: day / progress */}
      <section className="card flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-semibold text-primary">
            {preview ? '行前預覽 · Day 1' : `Day ${day.dayIndex}`}
          </p>
          <p className="mt-1 text-xl font-bold leading-tight">
            {format(day.date === format(now, 'yyyy-MM-dd') ? now : new Date(`${day.date}T00:00`), 'M/d')}
            （{WEEKDAY[new Date(`${day.date}T00:00`).getDay()]}）
          </p>
          {!preview && (
            <p className="mt-0.5 text-sm tabular-nums text-ink-2">
              {trip.destination} 當地 {format(now, 'HH:mm')}
            </p>
          )}
          <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-ink-3">{day.title}</p>
        </div>
        <ProgressRing
          value={activeCount ? doneCount / activeCount : 0}
          label={`${doneCount}/${activeCount}`}
          sublabel="今日完成"
        />
      </section>

      {/* quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={shareToday}
          className="card flex items-center justify-center gap-2 py-3 text-sm font-bold text-ink-2 active:opacity-70"
        >
          📤 分享今日行程
        </button>
        {accommodation ? (
          <a
            href={
              accommodation.location
                ? gmapsDirectionsUrl({ destination: accommodation.location })
                : gmapsSearchUrl(accommodation.name)
            }
            target="_blank"
            rel="noreferrer"
            className="card flex items-center justify-center gap-2 py-3 text-sm font-bold text-primary active:opacity-70"
          >
            🏨 回飯店
          </a>
        ) : (
          <span />
        )}
      </div>

      {/* next / ongoing event */}
      {focusEvent ? (
        <Link to={`/t/${trip.id}/timeline?day=${day.id}`} className="card relative block p-5 active:opacity-80">
          <a
            href={gmapsDirectionsUrl({
              destination: focusEvent.location ?? focusEvent.transit?.to ?? focusEvent.placeName ?? focusEvent.title,
              mode: focusEvent.transit?.mode === 'walk' ? 'walking'
                : focusEvent.transit?.mode === 'taxi' ? 'driving' : 'transit',
            })}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-ink active:opacity-80"
          >
            🧭 導航
          </a>
          <p className="text-xs font-semibold text-ink-2">
            {ongoing ? '🔵 進行中' : '⏭️ 下一個行程'}
          </p>
          <div className="mt-2 flex items-start gap-3">
            <span className="text-2xl">{typeMeta[focusEvent.type].emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold leading-snug">{focusEvent.title}</p>
              <p className="mt-0.5 text-sm tabular-nums text-ink-2">
                {focusEvent.startTime}
                {focusEvent.endTime ? `–${focusEvent.endTime}` : ''}
                {!preview && !ongoing && next?.startTime && minutesOf(next.startTime) > nowMins && (
                  <span className="ml-2 font-semibold text-accent">
                    還有 {formatCountdown(minutesOf(next.startTime) - nowMins)}
                  </span>
                )}
              </p>
            </div>
          </div>
        </Link>
      ) : (
        !preview && (
          <div className="card p-5 text-sm text-ink-2">
            今天排定的行程都告一段落了 🎉 打開行程頁回顧,或寫篇日記吧。
          </div>
        )
      )}

      {/* smart suggestions (Phase 9 rule engine) */}
      <SmartSuggestions day={day} events={events} nowMins={nowMins} preview={preview} />

      {/* spend + weather row */}
      <div className="grid grid-cols-2 gap-3">
        <Link to={`/t/${trip.id}/expense`} className="card block p-4 active:opacity-80">
          <p className="text-xs font-semibold text-ink-2">今日花費</p>
          <p className="mt-1.5 text-xl font-bold tabular-nums">
            ¥{(todaySpend ?? 0).toLocaleString()}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-3">
            {trip.totalBudget !== undefined && tripSpend !== undefined
              ? trip.totalBudget - tripSpend >= 0
                ? `剩餘預算 ¥${(trip.totalBudget - tripSpend).toLocaleString()}`
                : `已超支 ¥${(tripSpend - trip.totalBudget).toLocaleString()}`
              : '點擊記一筆'}
          </p>
        </Link>
        <WeatherCard day={day} />
      </div>

      {/* alerts */}
      {alerts.length > 0 && (
        <section className="card p-5">
          <h2 className="text-xs font-semibold text-ink-2">⚠️ 今日提醒</h2>
          <ul className="mt-2 space-y-2.5">
            {alerts.map((e) => (
              <li key={e.id} className="text-sm leading-relaxed">
                <span className="font-semibold">{e.startTime ? `${e.startTime} ` : ''}{e.title}</span>
                <span className="block text-xs text-warning">{e.alert}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!preview && <JournalCard day={day} />}

      <CurrencyConverter compact />

      {/* accommodation */}
      {accommodation && (
        <section className="card p-5">
          <h2 className="text-xs font-semibold text-ink-2">🏨 今晚住宿</h2>
          <p className="mt-1.5 text-sm font-bold">{accommodation.name}</p>
          {accommodation.note && (
            <p className="mt-0.5 text-xs text-ink-3">{accommodation.note}</p>
          )}
        </section>
      )}
    </div>
  );
}
