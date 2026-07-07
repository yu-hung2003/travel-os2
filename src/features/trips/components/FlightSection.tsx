import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { flightRepository } from '@/data/repositories/flightRepository';
import { eventRepository } from '@/data/repositories/eventRepository';
import { tripRepository } from '@/data/repositories/tripRepository';
import { db } from '@/data/db';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { format, parseISO } from 'date-fns';
import type { Flight } from '@/domain/types';

const kinds = [
  { kind: 'outbound' as const, label: '✈️ 去程' },
  { kind: 'return' as const, label: '🛬 回程' },
];

export function FlightSection({ tripId }: { tripId: string }) {
  const flights = useLiveQuery(() => flightRepository.list(tripId), [tripId]);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const importToItinerary = async (kind: 'outbound' | 'return') => {
    const flight = flights?.find((f) => f.kind === kind);
    if (!flight) return;
    const days = await tripRepository.listDays(tripId);
    const day = days.find((d) => d.date === flight.depTime.slice(0, 10));
    if (!day) {
      setImportMsg(`⚠️ 起飛日期 ${flight.depTime.slice(0, 10)} 不在旅程日期內,無法帶入。`);
      return;
    }
    let durationMin: number | undefined;
    if (flight.arrTime) {
      const diff = (new Date(flight.arrTime).getTime() - new Date(flight.depTime).getTime()) / 60000;
      if (diff > 0 && diff < 24 * 60) durationMin = Math.round(diff);
    }
    const eventId = await eventRepository.upsertPinnedEvent({
      existingId: flight.linkedEventId,
      tripId,
      dayId: day.id,
      type: 'flight',
      title: `✈️ ${flight.flightNo} ${flight.depAirport ?? ''} → ${flight.arrAirport ?? ''}`.trim(),
      fixedStart: flight.depTime.slice(11, 16),
      durationMin,
      note: [flight.airline, flight.note].filter(Boolean).join(' · ') || undefined,
      position: kind === 'outbound' ? 'start' : 'end',
    });
    await db.flights.update(flight.id, { linkedEventId: eventId });
    setImportMsg(`✅ 已帶入 Day ${day.dayIndex} 行程${flight.linkedEventId ? '(已更新)' : ''}`);
    setTimeout(() => setImportMsg(null), 3000);
  };
  const [editing, setEditing] = useState<'outbound' | 'return' | null>(null);
  const [form, setForm] = useState<Partial<Flight>>({});

  const current = editing ? flights?.find((f) => f.kind === editing) : undefined;

  useEffect(() => {
    if (!editing) return;
    const f = flights?.find((x) => x.kind === editing);
    setForm(f ? { ...f } : { remindCheckIn: true, remindDepart: true });
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!flights) return null;

  const input =
    'mt-1 w-full rounded-xl border border-line bg-surface p-2.5 text-sm outline-none focus:border-primary';

  return (
    <section className="card p-5">
      <h2 className="text-sm font-bold">✈️ 航班資訊</h2>
      <div className="mt-2 flex flex-col gap-2">
        {kinds.map(({ kind, label }) => {
          const f = flights.find((x) => x.kind === kind);
          return (
            <div key={kind} className="flex flex-col gap-1.5">
            <button
              onClick={() => setEditing(kind)}
              className="rounded-xl bg-surface-3 p-3 text-left active:opacity-70"
            >
              <p className="text-xs font-semibold text-ink-2">{label}</p>
              {f ? (
                <p className="mt-0.5 text-sm font-bold tabular-nums">
                  {f.flightNo} · {format(parseISO(f.depTime), 'M/d HH:mm')} {f.depAirport ?? ''} → {f.arrAirport ?? ''}
                </p>
              ) : (
                <p className="mt-0.5 text-sm text-ink-3">尚未填寫,點擊新增</p>
              )}
            </button>
            {flights.find((x) => x.kind === kind) && (
              <button
                onClick={() => importToItinerary(kind)}
                className="rounded-xl bg-primary/10 py-2 text-xs font-bold text-primary active:opacity-70"
              >
                {flights.find((x) => x.kind === kind)?.linkedEventId
                  ? '🔁 更新行程中的航班卡'
                  : '📥 帶入行程(免再輸入)'}
              </button>
            )}
            </div>
          );
        })}
      </div>
      {importMsg && <p className="mt-2 text-xs font-semibold text-success">{importMsg}</p>}

      <BottomSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'outbound' ? '✈️ 去程航班' : '🛬 回程航班'}
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-2">航班號</label>
              <input className={input} value={form.flightNo ?? ''} placeholder="IT220"
                onChange={(e) => setForm({ ...form, flightNo: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-2">航空公司(選填)</label>
              <input className={input} value={form.airline ?? ''} placeholder="台灣虎航"
                onChange={(e) => setForm({ ...form, airline: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-2">出發機場/航廈</label>
              <input className={input} value={form.depAirport ?? ''} placeholder="TPE T1"
                onChange={(e) => setForm({ ...form, depAirport: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-2">抵達機場/航廈</label>
              <input className={input} value={form.arrAirport ?? ''} placeholder="KIX T1"
                onChange={(e) => setForm({ ...form, arrAirport: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-2">起飛時間</label>
              <input className={input} type="datetime-local" value={form.depTime ?? ''}
                onChange={(e) => setForm({ ...form, depTime: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-2">降落時間(選填)</label>
              <input className={input} type="datetime-local" value={form.arrTime ?? ''}
                onChange={(e) => setForm({ ...form, arrTime: e.target.value })} />
            </div>
          </div>

          <div className="rounded-xl bg-surface-3 p-3">
            <p className="text-xs font-semibold text-ink-2">提醒(顯示於首頁)</p>
            {([
              ['remindCheckIn', '🛄 起飛前 24 小時提醒線上報到'],
              ['remindDepart', '🚕 起飛前 3 小時提醒出發去機場'],
            ] as const).map(([key, label]) => (
              <label key={key} className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(form[key])}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  className="h-5 w-5 rounded accent-[var(--primary,#0d9488)]"
                />
                {label}
              </label>
            ))}
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-2">備註(選填)</label>
            <input className={input} value={form.note ?? ''} placeholder="行李 20kg / 靠窗座位"
              onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>

          <button
            disabled={!form.flightNo?.trim() || !form.depTime}
            className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
            onClick={async () => {
              await flightRepository.save({
                id: current?.id,
                tripId,
                kind: editing!,
                flightNo: form.flightNo!.trim(),
                airline: form.airline?.trim() || undefined,
                depAirport: form.depAirport?.trim() || undefined,
                arrAirport: form.arrAirport?.trim() || undefined,
                depTime: form.depTime!,
                arrTime: form.arrTime || undefined,
                note: form.note?.trim() || undefined,
                remindCheckIn: Boolean(form.remindCheckIn),
                remindDepart: Boolean(form.remindDepart),
              });
              setEditing(null);
            }}
          >
            儲存
          </button>
          {current && (
            <button
              className="text-sm font-semibold text-danger active:opacity-70"
              onClick={async () => {
                await flightRepository.remove(current.id);
                setEditing(null);
              }}
            >
              刪除此航班
            </button>
          )}
        </div>
      </BottomSheet>
    </section>
  );
}
