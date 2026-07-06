import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tripRepository } from '@/data/repositories/tripRepository';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { newId } from '@/shared/utils/id';
import type { Traveler } from '@/domain/types';

const EMOJIS = ['🧳', '⛩️', '🏝️', '🏔️', '🌆', '🚄', '🏯', '🌸', '🎢', '🍜'];
const TIMEZONES = [
  { value: 'Asia/Taipei', label: '台灣(台北)' },
  { value: 'Asia/Tokyo', label: '日本(東京)' },
  { value: 'Asia/Seoul', label: '韓國(首爾)' },
  { value: 'Asia/Bangkok', label: '泰國(曼谷)' },
  { value: 'Asia/Singapore', label: '新加坡' },
  { value: 'Europe/Paris', label: '歐洲(巴黎)' },
  { value: 'America/Los_Angeles', label: '美西(洛杉磯)' },
];
const CURRENCIES = ['TWD', 'JPY', 'KRW', 'THB', 'SGD', 'EUR', 'USD'];

export function CreateTripSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [emoji, setEmoji] = useState('🧳');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timezone, setTimezone] = useState('Asia/Taipei');
  const [currency, setCurrency] = useState('TWD');
  const [travelers, setTravelers] = useState<Traveler[]>([{ id: newId(), name: '我', isChild: false }]);
  const [busy, setBusy] = useState(false);

  const valid =
    title.trim() && destination.trim() && startDate && endDate &&
    endDate >= startDate && travelers.every((t) => t.name.trim());

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const id = await tripRepository.createTrip({
        title, destination, coverEmoji: emoji,
        startDate, endDate, timezone,
        currency, homeCurrency: 'TWD',
        travelers: travelers.map((t) => ({ ...t, name: t.name.trim() })),
      });
      onClose();
      navigate(`/t/${id}/today`);
    } finally {
      setBusy(false);
    }
  };

  const input =
    'mt-1 w-full rounded-xl border border-line bg-surface p-2.5 text-sm outline-none focus:border-primary';

  return (
    <BottomSheet open={open} onClose={onClose} title="建立新旅程">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-semibold text-ink-2">旅程名稱</label>
            <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="台東三日遊" />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-2">圖示</label>
            <select className={input} value={emoji} onChange={(e) => setEmoji(e.target.value)}>
              {EMOJIS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-ink-2">目的地</label>
          <input className={input} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="台東" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-ink-2">出發日</label>
            <input className={input} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-2">回程日</label>
            <input className={input} type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-ink-2">當地時區</label>
            <select className={input} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {TIMEZONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-2">當地幣別(記帳用)</label>
            <select className={input} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-ink-2">成員(行李/記帳共用)</label>
          <div className="mt-1 flex flex-col gap-1.5">
            {travelers.map((t, i) => (
              <div key={t.id} className="flex items-center gap-2">
                <input
                  className="min-w-0 flex-1 rounded-xl border border-line bg-surface p-2.5 text-sm outline-none focus:border-primary"
                  value={t.name}
                  onChange={(e) => {
                    const next = [...travelers];
                    next[i] = { ...t, name: e.target.value };
                    setTravelers(next);
                  }}
                  placeholder={`成員 ${i + 1}`}
                />
                <button
                  onClick={() => {
                    const next = [...travelers];
                    next[i] = { ...t, isChild: !t.isChild };
                    setTravelers(next);
                  }}
                  className={`shrink-0 rounded-xl px-3 py-2.5 text-xs font-semibold ${
                    t.isChild ? 'bg-accent/15 text-accent' : 'bg-surface-3 text-ink-3'
                  }`}
                >
                  🧒 兒童
                </button>
                {travelers.length > 1 && (
                  <button
                    aria-label="移除成員"
                    onClick={() => setTravelers(travelers.filter((x) => x.id !== t.id))}
                    className="shrink-0 p-1 text-ink-3 active:text-danger"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setTravelers([...travelers, { id: newId(), name: '', isChild: false }])}
              className="rounded-xl border border-dashed border-line py-2 text-xs font-semibold text-ink-3 active:bg-surface-3"
            >
              ＋ 加成員
            </button>
          </div>
        </div>

        <button
          disabled={!valid || busy}
          onClick={submit}
          className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
        >
          {busy ? '建立中…' : '建立旅程(自動生成每日行程頁)'}
        </button>
      </div>
    </BottomSheet>
  );
}
