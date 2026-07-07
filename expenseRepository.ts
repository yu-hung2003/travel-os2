import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTrip } from '@/shared/hooks/useTrip';
import { format, parseISO } from 'date-fns';
import {
  DndContext, PointerSensor, TouchSensor, closestCenter,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { tripRepository } from '@/data/repositories/tripRepository';
import { eventRepository } from '@/data/repositories/eventRepository';
import { EventCard } from '@/features/timeline/components/EventCard';
import { EventSheet } from '@/features/timeline/components/EventSheet';
import { AddEventSheet } from '@/features/timeline/components/AddEventSheet';
import type { TimelineEvent } from '@/domain/types';
import { computeSchedule, closingWarning, neighborSigOf, type Slot } from '@/domain/schedule';
import { VersionBar } from '@/features/timeline/components/VersionBar';
import { BottomSheet } from '@/shared/components/BottomSheet';

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

export default function TimelinePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const trip = useTrip();

  const days = useLiveQuery(
    () => (trip ? tripRepository.listDays(trip.id) : Promise.resolve([])),
    [trip?.id],
  );

  const [selectedDayId, setSelectedDayId] = useState<string>('');
  const [openEvent, setOpenEvent] = useState<TimelineEvent | null>(null);
  const [adding, setAdding] = useState(false);

  // pick day: ?day= param → today (during the trip) → Day 1
  useEffect(() => {
    if (!days || days.length === 0 || selectedDayId) return;
    const fromUrl = searchParams.get('day');
    if (fromUrl && days.some((d) => d.id === fromUrl)) {
      setSelectedDayId(fromUrl);
      return;
    }
    const todayIso = format(new Date(), 'yyyy-MM-dd');
    const today = days.find((d) => d.date === todayIso);
    setSelectedDayId((today ?? days[0]).id);
  }, [days, searchParams, selectedDayId]);

  const selectedDayObj = days?.find((d) => d.id === selectedDayId);
  const events = useLiveQuery(
    () =>
      selectedDayId
        ? tripRepository.listDayEvents(selectedDayId, selectedDayObj?.activeVersionId)
        : Promise.resolve([]),
    [selectedDayId, selectedDayObj?.activeVersionId],
  );
  const [editingStart, setEditingStart] = useState(false);
  const [startText, setStartText] = useState('08:30');

  // Local order for instant drag feedback; DB write follows.
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  useEffect(() => {
    setOrderedIds((events ?? []).map((e) => e.id));
  }, [events]);

  const orderedEvents = useMemo(() => {
    const map = new Map((events ?? []).map((e) => [e.id, e]));
    return orderedIds.map((id) => map.get(id)).filter((e): e is TimelineEvent => !!e);
  }, [events, orderedIds]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
  );

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedIds.indexOf(String(active.id));
    const newIndex = orderedIds.indexOf(String(over.id));
    const next = arrayMove(orderedIds, oldIndex, newIndex);
    setOrderedIds(next);
    await eventRepository.reorderDay(selectedDayId, next);
  };

  if (!trip || !days) return null;

  const selectedDay = selectedDayObj;

  // duration-based schedule: derived, reflows automatically on any change
  const schedule = computeSchedule(selectedDay?.startTime, orderedEvents);
  const slotOf = (id: string): Slot | undefined => schedule.get(id);
  const doneCount = orderedEvents.filter((e) => e.status === 'completed').length;
  const activeCount = orderedEvents.filter((e) => e.status !== 'skipped').length;

  return (
    <div className="flex flex-col gap-3 py-4">
      {/* day tabs */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-2">
          {days.map((d) => {
            const date = parseISO(d.date);
            const active = d.id === selectedDayId;
            return (
              <button
                key={d.id}
                onClick={() => {
                  setSelectedDayId(d.id);
                  setSearchParams({ day: d.id }, { replace: true });
                }}
                className={`flex flex-col items-center rounded-2xl px-3.5 py-2 ${
                  active ? 'bg-primary text-primary-ink' : 'bg-surface-2 text-ink-2 border border-line/60'
                }`}
              >
                <span className="text-[10px] font-semibold">Day {d.dayIndex}</span>
                <span className="text-sm font-bold tabular-nums">
                  {format(date, 'M/d')}
                </span>
                <span className="text-[10px]">({WEEKDAY[date.getDay()]})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* version switcher */}
      {selectedDay && <VersionBar day={selectedDay} />}

      {/* day header */}
      {selectedDay && (
        <div>
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-bold leading-snug">{selectedDay.title}</h1>
            <button
              onClick={() => {
                setStartText(selectedDay.startTime ?? '08:30');
                setEditingStart(true);
              }}
              className="shrink-0 rounded-full bg-surface-2 border border-line/60 px-3 py-1.5 text-xs font-bold tabular-nums text-primary active:opacity-70"
            >
              🕗 {selectedDay.startTime ?? '08:30'} 出發
            </button>
          </div>
          {activeCount > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.round((doneCount / activeCount) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-semibold tabular-nums text-ink-2">
                {doneCount}/{activeCount}
              </span>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-ink-3">
        💡 點行程卡右側的 🧭 圖示可快速開啟 Google Maps 導航
        <br />
        ⠿ 把手可拖曳排序
      </p>

      {/* sortable event list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2.5">
            {orderedEvents.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                onOpen={setOpenEvent}
                slot={slotOf(ev.id)}
                closing={closingWarning(ev, slotOf(ev.id))}
                staleTransit={
                  ev.type === 'transport' && ev.neighborSig !== undefined
                    ? ev.neighborSig !== neighborSigOf(orderedEvents, ev.id)
                    : false
                }
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {orderedEvents.length === 0 && (
        <p className="py-10 text-center text-sm text-ink-3">
          這一天還沒有行程,按下方按鈕新增。
        </p>
      )}

      <button
        onClick={() => setAdding(true)}
        className="rounded-2xl border-2 border-dashed border-line py-3.5 text-sm font-semibold text-ink-2 active:bg-surface-3"
      >
        ＋ 新增事件
      </button>

      <BottomSheet open={editingStart} onClose={() => setEditingStart(false)} title="當日出發時間">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-ink-3">所有行程時刻由出發時間 + 各項停留/交通時間自動推算。</p>
          <input
            type="time"
            value={startText}
            onChange={(e) => setStartText(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface p-3 text-2xl font-bold tabular-nums outline-none focus:border-primary"
          />
          <button
            className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink active:opacity-80"
            onClick={async () => {
              if (startText) await tripRepository.updateDayStartTime(selectedDayId, startText);
              setEditingStart(false);
            }}
          >
            儲存
          </button>
        </div>
      </BottomSheet>

      <EventSheet event={openEvent} days={days} dayEvents={orderedEvents} onClose={() => setOpenEvent(null)} />
      <AddEventSheet
        open={adding}
        tripId={trip.id}
        dayId={selectedDayId}
        onClose={() => setAdding(false)}
      />
    </div>
  );
}
