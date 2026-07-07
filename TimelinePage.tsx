import React, { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import { shoppingRepository } from '@/data/repositories/shoppingRepository';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { compressImage } from '@/shared/utils/image';
import { useJpyTwd } from '@/shared/hooks/useJpyTwd';
import type { ShoppingItem, ShoppingPhoto } from '@/domain/types';
import { useTrip } from '@/shared/hooks/useTrip';

export default function ShoppingPage() {
  const trip = useTrip();
  const items = useLiveQuery(
    () => (trip ? shoppingRepository.list(trip.id) : Promise.resolve([])),
    [trip?.id],
  );
  const rate = useJpyTwd();
  const photos = useLiveQuery(
    async () => (trip ? db.photos.where('tripId').equals(trip.id).toArray() : ([] as ShoppingPhoto[])),
    [trip?.id],
  );

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [forWho, setForWho] = useState('');
  const [priceText, setPriceText] = useState('');
  const [qtyText, setQtyText] = useState('1');
  const [note, setNote] = useState('');

  const [undoItem, setUndoItem] =
    useState<{ item: ShoppingItem; photos: ShoppingPhoto[] } | null>(null);
  const [viewer, setViewer] = useState<ShoppingPhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  const photoTarget = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  if (!trip || !items || !photos) return null;

  const photosByItem = new Map<string, ShoppingPhoto[]>();
  for (const p of [...photos].sort((a, b) => a.createdAt - b.createdAt)) {
    if (!photosByItem.has(p.itemId)) photosByItem.set(p.itemId, []);
    photosByItem.get(p.itemId)!.push(p);
  }

  const pickPhoto = (itemId: string) => {
    photoTarget.current = itemId;
    fileInput.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const itemId = photoTarget.current;
    if (!file || !itemId) return;
    setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      await shoppingRepository.addPhoto(trip.id, itemId, dataUrl);
    } catch {
      alert('照片處理失敗,請換一張試試。');
    } finally {
      setUploading(false);
    }
  };

  const pending = items.filter((i) => !i.checked);
  const bought = items.filter((i) => i.checked);
  const estTotal = pending.reduce((s, i) => s + (i.estPrice ?? 0) * i.qty, 0);

  const doDelete = async (item: ShoppingItem) => {
    const removedPhotos = await shoppingRepository.remove(item.id);
    setUndoItem({ item, photos: removedPhotos });
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
        <span className="mt-1.5 flex items-center gap-1.5">
          {(photosByItem.get(item.id) ?? []).map((p) => (
            <button
              key={p.id}
              onClick={() => setViewer(p)}
              className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line/60 active:opacity-70"
            >
              <img src={p.dataUrl} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
          {(photosByItem.get(item.id)?.length ?? 0) < 3 && (
            <button
              onClick={() => pickPhoto(item.id)}
              disabled={uploading}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-line text-lg text-ink-3 disabled:opacity-40 active:bg-surface-3"
              aria-label="加照片"
            >
              📷
            </button>
          )}
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
            <span className="min-w-0 flex-1 truncate text-sm">已刪除「{undoItem.item.name}」</span>
            <button
              onClick={() => {
                void shoppingRepository.restore(undoItem.item, undoItem.photos);
                setUndoItem(null);
              }}
              className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-primary-ink active:opacity-80"
            >
              還原
            </button>
          </div>
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFile}
      />

      {viewer && (
        <button
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 p-4"
          onClick={() => setViewer(null)}
        >
          <img src={viewer.dataUrl} alt="" className="max-h-[80vh] max-w-full rounded-xl object-contain" />
          <span className="mt-3 flex gap-3">
            <span
              role="button"
              className="rounded-xl bg-danger px-4 py-2 text-sm font-bold text-white active:opacity-80"
              onClick={(e) => {
                e.stopPropagation();
                void shoppingRepository.removePhoto(viewer.id);
                setViewer(null);
              }}
            >
              🗑 刪除照片
            </span>
            <span className="rounded-xl bg-surface-2 px-4 py-2 text-sm font-bold text-ink">關閉</span>
          </span>
        </button>
      )}
    </div>
  );
}
