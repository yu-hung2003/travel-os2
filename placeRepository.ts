import { useState } from 'react';
import type { EventType } from '@/domain/types';
import { eventRepository } from '@/data/repositories/eventRepository';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { addableTypes, typeMeta } from '@/features/timeline/eventMeta';

interface Props {
  open: boolean;
  tripId: string;
  dayId: string;
  onClose: () => void;
}

export function AddEventSheet({ open, tripId, dayId, onClose }: Props) {
  const [type, setType] = useState<EventType>('sight');
  const [title, setTitle] = useState('');
  const [durText, setDurText] = useState('');
  const [alertText, setAlertText] = useState('');

  const reset = () => {
    setType('sight');
    setTitle('');
    setDurText('');
    setAlertText('');
  };

  const submit = async () => {
    if (!title.trim()) return;
    const dur = Number(durText);
    await eventRepository.addEvent({
      tripId, dayId, type, title,
      durationMin: Number.isFinite(dur) && dur > 0 ? Math.round(dur) : undefined,
      alert: alertText.trim() || undefined,
    });
    reset();
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="新增事件">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {addableTypes.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                type === t ? 'bg-primary text-primary-ink' : 'bg-surface-3 text-ink-2'
              }`}
            >
              {typeMeta[t].emoji} {typeMeta[t].label}
            </button>
          ))}
        </div>

        <div>
          <label className="text-xs font-semibold text-ink-2" htmlFor="new-title">
            名稱
          </label>
          <input
            id="new-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如:午後改逛 PARCO 避暑"
            className="mt-1 w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-ink-2" htmlFor="new-dur">
            預計停留(分鐘,留空用預設)— 時刻由系統自動推算
          </label>
          <input
            id="new-dur"
            type="number"
            inputMode="numeric"
            min="5"
            step="5"
            value={durText}
            onChange={(e) => setDurText(e.target.value)}
            placeholder="60"
            className="mt-1 w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary"
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[30, 60, 90, 120].map((m) => (
              <button
                key={m}
                onClick={() => setDurText(String(m))}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  durText === String(m) ? 'bg-primary text-primary-ink' : 'bg-surface-3 text-ink-2'
                }`}
              >
                {m}分
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-warning" htmlFor="new-alert">
            ⚠️ 警語(可留空)
          </label>
          <input
            id="new-alert"
            value={alertText}
            onChange={(e) => setAlertText(e.target.value)}
            placeholder="例如:需預約 / 週三公休"
            className="mt-1 w-full rounded-xl border border-warning/40 bg-surface p-3 text-sm outline-none focus:border-warning"
          />
        </div>

        <button
          disabled={!title.trim()}
          onClick={submit}
          className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
        >
          加入 Day 行程
        </button>
      </div>
    </BottomSheet>
  );
}
