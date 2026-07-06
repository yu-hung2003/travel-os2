import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TimelineEvent } from '@/domain/types';
import { statusMeta, typeMeta } from '@/features/timeline/eventMeta';
import { gmapsDirectionsUrl } from '@/shared/utils/maps';
import { effectiveDuration, type Slot } from '@/domain/schedule';

const transitModeEmoji: Record<string, string> = {
  walk: '🚶', bus: '🚌', train: '🚃', subway: '🚇', taxi: '🚕', boat: '⛴️', flight: '✈️',
};

interface Props {
  event: TimelineEvent;
  onOpen: (event: TimelineEvent) => void;
  /** computed arrive/depart from the schedule engine */
  slot?: Slot;
  /** closing-time warning text, if any */
  closing?: string;
  /** transport card whose neighbors changed since its route was set */
  staleTransit?: boolean;
}

export function EventCard({ event, onOpen, slot, closing, staleTransit = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: event.id });

  const dimmed = event.status === 'skipped' || event.status === 'postponed';
  const meta = typeMeta[event.type];
  const status = statusMeta[event.status];
  // transport events, or any event that has transit info, render as a beige transit card
  const isTransit = event.type === 'transport' || !!event.transit;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-stretch overflow-hidden rounded-card border shadow-card ${
        isTransit ? 'bg-transit border-transit-line/80' : 'bg-surface-2 border-line/60'
      } ${isDragging ? 'z-10 opacity-90 shadow-lg' : ''}`}
    >
      {/* main tappable area */}
      <button
        className="flex min-w-0 flex-1 items-start gap-3 p-4 text-left active:bg-surface-3/50"
        onClick={() => onOpen(event)}
      >
        <span className={`mt-0.5 text-xl ${dimmed ? 'grayscale opacity-50' : ''}`}>
          {event.status === 'completed' ? '✅' : meta.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {slot ? (
              <span className={`text-xs font-semibold tabular-nums ${dimmed ? 'text-ink-3' : 'text-primary'}`}>
                {slot.pinned && '🔒'}{slot.arrive}–{slot.depart}
              </span>
            ) : null}
            <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold text-ink-2">
              ⏱ {effectiveDuration(event)}分
            </span>
            {status.label && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${status.badgeCls}`}>
                {status.label}
              </span>
            )}
            {event.isFavorite && <span className="text-xs">⭐</span>}
          </span>
          <span
            className={`mt-0.5 block text-sm font-semibold leading-snug ${
              dimmed ? 'text-ink-3' : event.status === 'completed' ? 'text-ink-2' : ''
            }`}
          >
            {event.title}
          </span>
          {event.transit && (
            <span className="mt-1.5 block rounded-lg border border-transit-line/70 bg-surface-2/50 px-2.5 py-1.5">
              {(event.transit.from || event.transit.to) && (
                <span className="block text-xs font-bold">
                  {transitModeEmoji[event.transit.mode] ?? '🚃'}{' '}
                  {event.transit.from ?? '—'} → {event.transit.to ?? '—'}
                </span>
              )}
              <span className={`block text-xs text-ink-2 ${event.transit.from || event.transit.to ? 'mt-0.5' : ''}`}>
                {!event.transit.from && !event.transit.to && (
                  <>{transitModeEmoji[event.transit.mode] ?? '🚃'} </>
                )}
                {[
                  [event.transit.trainType, event.transit.line].filter(Boolean).join(' '),
                  event.transit.durationMin ? `車程${event.transit.durationMin}分` : undefined,
                  event.transit.walkMin ? `步行${event.transit.walkMin}分` : undefined,
                  event.transit.distanceKm ? `${event.transit.distanceKm}km` : undefined,
                  event.transit.farePerAdult ? `¥${event.transit.farePerAdult.toLocaleString()}/人` : undefined,
                  event.transit.fareNote,
                ].filter(Boolean).join(' · ')}
              </span>
              {(event.transit.station || event.transit.platform || event.transit.exit) && (
                <span className="mt-0.5 block text-xs font-semibold text-ink-2">
                  🚉 {[
                    event.transit.station,
                    event.transit.platform ? `${event.transit.platform}月台` : undefined,
                    event.transit.exit ? `${event.transit.exit}出口` : undefined,
                  ].filter(Boolean).join(' · ')}
                </span>
              )}
            </span>
          )}
          {(event.ticketPerAdult != null || event.needsBooking !== undefined ||
            event.hasLockers !== undefined || event.hasToilets !== undefined) && (
            <span className="mt-1 block text-xs text-ink-2">
              {[
                event.ticketPerAdult != null
                  ? event.ticketPerAdult === 0 ? '🎫 免費' : `🎫 ¥${event.ticketPerAdult.toLocaleString()}/人`
                  : undefined,
                event.needsBooking === true ? '📌 需預約' : undefined,
                event.hasLockers === true ? '🧳 可寄物' : event.hasLockers === false ? '🧳 無寄物' : undefined,
                event.hasToilets === true ? '🚻 有廁所' : event.hasToilets === false ? '🚻 無廁所' : undefined,
              ].filter(Boolean).join(' · ')}
            </span>
          )}
          {slot?.conflict && event.status === 'scheduled' && (
            <span className="mt-1 block rounded-lg bg-warning/15 px-2 py-1 text-xs font-semibold leading-relaxed text-warning">
              ⚠️ 指定時間與前一行程重疊,請調整順序或時間
            </span>
          )}
          {staleTransit && (
            <span className="mt-1 block rounded-lg bg-warning/15 px-2 py-1 text-xs font-semibold leading-relaxed text-warning">
              ⚠️ 前後行程已變動,請點選確認/更新此段交通
            </span>
          )}
          {closing && (
            <span className="mt-1 block rounded-lg bg-danger/10 px-2 py-1 text-xs font-semibold leading-relaxed text-danger">
              ⏰ {closing}
            </span>
          )}
          {event.alert && event.status === 'scheduled' && (
            <span className="mt-1 block rounded-lg bg-warning/10 px-2 py-1 text-xs leading-relaxed text-warning">
              ⚠️ {event.alert}
            </span>
          )}
          {event.note && (
            <span className="mt-1 block text-xs leading-relaxed text-ink-2">{event.note}</span>
          )}
        </span>
      </button>

      {/* right rail: quick nav + drag handle */}
      <span className="flex w-10 shrink-0 flex-col border-l border-line/60">
        {(event.transit?.from && event.transit?.to) || event.location ? (
          <a
            aria-label="快捷導航"
            href={
              event.transit?.from && event.transit?.to
                ? gmapsDirectionsUrl({
                    origin: event.transit.from,
                    destination: event.transit.to,
                    mode: event.transit.mode === 'walk' ? 'walking'
                      : event.transit.mode === 'taxi' ? 'driving' : 'transit',
                  })
                : gmapsDirectionsUrl({ destination: event.location! })
            }
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center text-base active:bg-surface-3"
          >
            🧭
          </a>
        ) : null}
        <button
          aria-label="拖曳排序"
          {...attributes}
          {...listeners}
          className="flex flex-1 touch-none items-center justify-center text-ink-3 active:bg-surface-3"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <circle cx="9" cy="7" r="1.4" /><circle cx="15" cy="7" r="1.4" />
            <circle cx="9" cy="12" r="1.4" /><circle cx="15" cy="12" r="1.4" />
            <circle cx="9" cy="17" r="1.4" /><circle cx="15" cy="17" r="1.4" />
          </svg>
        </button>
      </span>
    </li>
  );
}
