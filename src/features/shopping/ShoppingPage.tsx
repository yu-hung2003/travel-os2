import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { shoppingRepository } from '@/data/repositories/shoppingRepository';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { useJpyTwd } from '@/shared/hooks/useJpyTwd';
import type { ShoppingItem } from '@/domain/types';
import { useTrip } from '@/shared/hooks/useTrip';

export default function ShoppingPage() {
  const trip = useTrip();
  const items = useLiveQuery(
    () => (trip ? shoppingRepository.list(trip.id) : Promise.resolve([])),
    [trip?.id],
  );
  const rate = useJpyTwd();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [forWho, setForWho] = useState('');
  const [priceText, setPriceText] = useState('');
  const [qtyText, setQtyText] = useState('1');
  const [note, setNote] = useState('');

  const [undoItem, setUndoItem] = useState<ShoppingItem | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  if (!trip || !items) return null;

  const pending = items.filter((i) => !i.checked);
  const bought = items.filter((i) => i.checked);
  const estTotal = pending.reduce((s, i) => s + (i.estPrice ?? 0) * i.qty, 0);

  const doDelete = (item: ShoppingItem) => {
    void shoppingRepository.remove(item.id);
    setUndoItem(item);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoItem(null), 3000);
  };

  const submit = async () => {
    if (!name.trim()) return;
    const price = Number(priceText);
    await shoppingRepository.add({
      tripId: trip.id,
      name,
      forWho,
      estPrice: priceText.trim() !== '' && Number.isFinite(price) && price >= 0 ? Math.round(price) : undefined,
      qty: Number(qtyText) || 1,
      note,
    });
    setName(''); setForWho(''); setPriceText(''); setQtyText('1'); setNote('');
    setAdding(false);
  };

  const Row = ({ item }: { item: ShoppingItem }) => (
    <li className="flex items-center gap-3 py-2.5">
      <button
        aria-label={item.checked ? '取消勾選' : '已買到'}
        onClick={() => shoppingRepository.toggle(item.id)}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
          item.checked ? 'border-primary bg-primary text-primary-ink' : 'border-line'
        }`}
      >
        {item.checked && (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4 10-10" />
          </svg>
        )}
      </button>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-semibold ${item.checked ? 'text-ink-3 line-through' : ''}`}>
          {item.name}
          {item.qty > 1 && <span className="ml-1 text-xs font-normal text-ink-3">×{item.qty}</span>}
        </span>
        <span className="block text-xs text-ink-3">
          {[
            item.forWho ? `👤 ${item.forWho}` : undefined,
            item.estPrice !== undefined ? `約¥${item.estPrice.toLocaleString()}${item.qty > 1 ? '/個' : ''}` : undefined,
            item.note,
          ].filter(Boolean).join(' · ')}
        </span>
      </span>
      <button aria-label="刪除" className="p-1 text-ink-3 active:text-danger" onClick={() => doDelete(item)}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M6 7l1 13h10l1-13" />
        </svg>
      </button>
    </li>
  );

  return (
    <div className="flex flex-col gap-3 py-5 pb-16">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">血拼清單</h1>
        {estTotal > 0 && (
          <span className="text-xs tabular-nums text-ink-2">
            待買預估 ¥{estTotal.toLocaleString()}
            {rate && ` ≈ NT$${Math.round(estTotal * rate.rate).toLocaleString()}`}
          </span>
        )}
      </header>
      <p className="-mt-1 text-xs text-ink-3">
        全家共享同步:藥妝、伴手禮、親友託買,誰在店裡誰順手買、買到就勾。
      </p>

      <button
        onClick={() => setAdding(true)}
        className="rounded-2xl bg-primary py-3.5 text-base font-bold text-primary-ink active:opacity-80"
      >
        ＋ 加入待買
      </button>

      {items.length === 0 && (
        <p className="py-8 text-center text-sm text-ink-3">
          清單還是空的。把想買的、被託買的都丟進來吧。
        </p>
      )}

      {pending.length > 0 && (
        <section className="card p-4">
          <h2 className="text-sm font-bold">🛒 待買({pending.length})</h2>
          <ul className="mt-1 divide-y divide-line/60">
            {pending.map((i) => <Row key={i.id} item={i} />)}
          </ul>
        </section>
      )}

      {bought.length > 0 && (
        <section className="card p-4">
          <h2 className="text-sm font-bold text-success">✅ 已買到({bought.length})</h2>
          <ul className="mt-1 divide-y divide-line/60">
            {bought.map((i) => <Row key={i.id} item={i} />)}
          </ul>
        </section>
      )}

      <BottomSheet open={adding} onClose={() => setAdding(false)} title="加入待買">
        <div className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="品名,例如:EVE 止痛藥"
            className="w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              value={forWho}
              onChange={(e) => setForWho(e.target.value)}
              placeholder="誰託買"
              className="col-span-1 rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary"
            />
            <input
              type="number" inputMode="numeric" min="0"
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
              placeholder="預估¥"
              className="col-span-1 rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary"
            />
            <input
              type="number" inputMode="numeric" min="1"
              value={qtyText}
              onChange={(e) => setQtyText(e.target.value)}
              placeholder="數量"
              className="col-span-1 rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="備註,例如:藍色包裝、松本清較便宜"
            className="w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary"
          />
          <button
            disabled={!name.trim()}
            onClick={submit}
            className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
          >
            加入
          </button>
        </div>
      </BottomSheet>

      {undoItem && (
        <div className="fixed inset-x-0 bottom-16 z-50 flex justify-center px-4 pb-safe">
          <div className="flex w-full max-w-lg items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-surface shadow-card">
            <span className="min-w-0 flex-1 truncate text-sm">已刪除「{undoItem.name}」</span>
            <button
              onClick={() => {
                void shoppingRepository.restore(undoItem);
                setUndoItem(null);
              }}
              className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-primary-ink active:opacity-80"
            >
              還原
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
