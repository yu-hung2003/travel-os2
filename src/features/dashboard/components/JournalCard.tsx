import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import { journalRepository } from '@/data/repositories/journalRepository';
import { BottomSheet } from '@/shared/components/BottomSheet';
import type { TripDay } from '@/domain/types';

/** one-line nightly recap; entries feed the trip summary */
export function JournalCard({ day }: { day: TripDay }) {
  const entry = useLiveQuery(() => journalRepository.getByDay(day.id), [day.id]);
  const stats = useLiveQuery(async () => {
    const events = await db.events.where('dayId').equals(day.id)
      .and((e) => !day.activeVersionId || (e.versionId ?? '') === day.activeVersionId)
      .toArray();
    const expenses = await db.expenses.where('tripId').equals(day.tripId)
      .and((x) => x.dayId === day.id).toArray();
    return {
      done: events.filter((e) => e.status === 'completed').length,
      spend: expenses.reduce((s, x) => s + x.amount, 0),
    };
  }, [day.id, day.activeVersionId]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    if (open) setText(entry?.text ?? '');
  }, [open, entry?.text]);

  return (
    <>
      <button onClick={() => setOpen(true)} className="card block w-full p-4 text-left active:opacity-80">
        <p className="text-xs font-semibold text-ink-2">📔 今日回顧</p>
        {entry?.text ? (
          <p className="mt-1 text-sm leading-relaxed">{entry.text}</p>
        ) : (
          <p className="mt-1 text-sm text-ink-3">睡前寫一句今天的回憶,回國就是現成遊記 ›</p>
        )}
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={`📔 Day ${day.dayIndex} 回顧`}>
        <div className="flex flex-col gap-3">
          {stats && (
            <p className="rounded-xl bg-surface-3 px-3 py-2 text-xs text-ink-2">
              今天完成 {stats.done} 個行程{stats.spend > 0 ? ` · 花費 ¥${stats.spend.toLocaleString()}` : ''}
            </p>
          )}
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="一句話就好,例如:清水寺的風鈴聲 + 小孩第一次看到藝伎超興奮"
            className="w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary"
          />
          <button
            className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink active:opacity-80"
            onClick={async () => {
              await journalRepository.save(day.tripId, day.id, text);
              setOpen(false);
            }}
          >
            儲存
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
