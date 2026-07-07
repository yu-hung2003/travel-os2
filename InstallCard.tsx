import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, parseISO } from 'date-fns';
import { tripRepository } from '@/data/repositories/tripRepository';
import { eventRepository } from '@/data/repositories/eventRepository';
import { BottomSheet } from '@/shared/components/BottomSheet';
import type { Place, Trip } from '@/domain/types';

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];
const AT_END = '__end__';

interface Props {
  place: Place | null;
  trip: Trip;
  onClose: () => void;
}

export function SchedulePlaceSheet({ place, trip, onClose }: Props) {
  const days = useLiveQuery(() => tripRepository.listDays(trip.id), [trip.id]);

  const [dayId, setDayId] = useState<string>('');
  const [afterId, setAfterId] = useState<string>(AT_END);
  const [time, setTime] = useState('');

  useEffect(() => {
    setDayId('');
    setAfterId(AT_END);
    setTime('');
  }, [place?.id]);

  const selectedDay = days?.find((d) => d.id === dayId);
  const dayEvents = useLiveQuery(
    () =>
      dayId
        ? tripRepository.listDayEvents(dayId, selectedDay?.activeVersionId)
        : Promise.resolve([]),
    [dayId, selectedDay?.activeVersionId],
  );

  if (!place || !days) return null;

  const submit = async () => {
    if (!dayId) return;
    await eventRepository.addFromPlace({
      place,
      dayId,
      startTime: time || undefined,
      afterEventId: afterId === AT_END ? undefined : afterId,
    });
    onClose();
  };

  return (
    <BottomSheet open onClose={onClose} title={`📅 排入行程:${place.name}`}>
      <div className="flex flex-col gap-4">
        {/* 1. day */}
        <div>
          <p className="text-xs font-semibold text-ink-2">選擇日期</p>
          <div className="-mx-1 mt-1.5 overflow-x-auto px-1">
            <div className="flex w-max gap-1.5">
              {days.map((d) => {
                const date = parseISO(d.date);
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      setDayId(d.id);
                      setAfterId(AT_END);
                    }}
                    className={`flex flex-col items-center rounded-2xl px-3 py-1.5 ${
                      dayId === d.id
                        ? 'bg-primary text-primary-ink'
                        : 'bg-surface-3 text-ink-2'
                    }`}
                  >
                    <span className="text-[10px] font-semibold">Day {d.dayIndex}</span>
                    <span className="text-sm font-bold tabular-nums">
                      {format(date, 'M/d')}({WEEKDAY[date.getDay()]})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. position within the day */}
        {dayId && dayEvents && (
          <div>
            <p className="text-xs font-semibold text-ink-2">插入位置</p>
            <div className="mt-1.5 flex max-h-52 flex-col gap-1.5 overflow-y-auto">
              {dayEvents.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setAfterId(e.id)}
                  className={`rounded-xl px-3 py-2 text-left text-xs font-semibold ${
                    afterId === e.id ? 'bg-primary text-primary-ink' : 'bg-surface-3 text-ink-2'
                  }`}
                >
                  在「{e.startTime ? `${e.startTime} ` : ''}{e.title}」之後
                </button>
              ))}
              <button
                onClick={() => setAfterId(AT_END)}
                className={`rounded-xl px-3 py-2 text-left text-xs font-semibold ${
                  afterId === AT_END ? 'bg-primary text-primary-ink' : 'bg-surface-3 text-ink-2'
                }`}
              >
                加到當日最後
              </button>
            </div>
          </div>
        )}

        {/* 3. optional time */}
        <div>
          <label className="text-xs font-semibold text-ink-2" htmlFor="sp-time">
            時間(可留空)
          </label>
          <input
            id="sp-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <button
          disabled={!dayId}
          onClick={submit}
          className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
        >
          排入行程
        </button>
        <p className="text-center text-xs text-ink-3">
          店名、座標、價位、營業時間、連結會自動帶入行程卡
        </p>
      </div>
    </BottomSheet>
  );
}
