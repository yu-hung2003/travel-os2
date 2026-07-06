import type { TimelineEvent, EventType } from '@/domain/types';

/* ---------------------------------------------------------------
   Duration-based schedule engine.
   The day has a start time; each event consumes durationMin;
   arrive/depart times are DERIVED, never stored. Reordering,
   skipping or editing a duration therefore reflows the whole day
   with zero manual time editing.
---------------------------------------------------------------- */

export function minutesOf(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function toHHMM(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

const DEFAULT_DURATION: Record<EventType, number> = {
  sight: 120, food: 90, shopping: 120, transport: 30,
  hotel: 45, rest: 45, flight: 120, custom: 60,
};

export function effectiveDuration(e: TimelineEvent): number {
  if (e.durationMin && e.durationMin > 0) return e.durationMin;
  if (e.type === 'transport') {
    const ride = e.transit?.durationMin ?? 0;
    const walk = e.transit?.walkMin ?? 0;
    if (ride + walk > 0) return ride + walk;
  }
  return DEFAULT_DURATION[e.type];
}

export interface Slot {
  arriveMin: number;
  departMin: number;
  arrive: string;
  depart: string;
  /** event is pinned to an explicit time */
  pinned?: boolean;
  /** pinned time overlaps the previous event */
  conflict?: boolean;
}

/** events must be in display order; skipped/postponed don't consume time */
export function computeSchedule(
  dayStartTime: string | undefined,
  events: TimelineEvent[],
): Map<string, Slot> {
  const out = new Map<string, Slot>();
  let cursor = minutesOf(dayStartTime || '08:30');
  for (const e of events) {
    if (e.status === 'skipped' || e.status === 'postponed') continue;
    const dur = effectiveDuration(e);
    let arrive = cursor;
    let pinned = false;
    let conflict = false;
    if (e.fixedStart) {
      // anchored event: jump to the pinned time (gaps between events are fine)
      pinned = true;
      const f = minutesOf(e.fixedStart);
      if (f < cursor) conflict = true; // overlaps the previous event
      arrive = f;
    }
    const slot: Slot = {
      arriveMin: arrive,
      departMin: arrive + dur,
      arrive: toHHMM(arrive),
      depart: toHHMM(arrive + dur),
      pinned,
      conflict,
    };
    out.set(e.id, slot);
    cursor = arrive + dur;
  }
  return out;
}

/** closing-time warning for an event given its computed slot */
export function closingWarning(e: TimelineEvent, slot: Slot | undefined): string | undefined {
  if (!slot) return undefined;
  if (e.status !== 'scheduled') return undefined;
  if (e.lastEntry && slot.arriveMin > minutesOf(e.lastEntry)) {
    return `抵達 ${slot.arrive} 已超過最後入場 ${e.lastEntry},可能無法入場`;
  }
  if (e.openUntil) {
    const close = minutesOf(e.openUntil);
    if (slot.arriveMin >= close) return `抵達 ${slot.arrive} 已打烊(營業至 ${e.openUntil})`;
    if (slot.departMin > close) return `停留將超過打烊時間(營業至 ${e.openUntil}),請把握時間`;
  }
  return undefined;
}

/** neighbor signature for transport cards: flags stale routes after reorder */
export function neighborSigOf(events: TimelineEvent[], eventId: string): string {
  const active = events.filter((e) => e.status !== 'skipped' && e.status !== 'postponed');
  const idx = active.findIndex((e) => e.id === eventId);
  const prev = idx > 0 ? active[idx - 1].id : '';
  const next = idx >= 0 && idx < active.length - 1 ? active[idx + 1].id : '';
  return `${prev}|${next}`;
}
