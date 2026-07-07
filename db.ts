import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTrip } from '@/shared/hooks/useTrip';
import { packingRepository } from '@/data/repositories/packingRepository';
import { BottomSheet } from '@/shared/components/BottomSheet';
import type { BagKind, PackingItem } from '@/domain/types';

const bagMeta: Record<BagKind, { emoji: string; label: string }> = {
  carry: { emoji: '🎒', label: '隨身行李' },
  checked: { emoji: '🧳', label: '託運大件行李' },
};

const SHARED = '__shared__';
const DEFAULT_CATEGORIES = ['證件', '電子', '防暑', '衣物', '盥洗', '藥品', '其他'];
const LAST_IMPORT_KEY = 'travelos-packing-last-import';

interface LastImport {
  ownerKey: string;
  ids: string[];
}

function loadLastImport(): LastImport | null {
  try {
    const raw = localStorage.getItem(LAST_IMPORT_KEY);
    return raw ? (JSON.parse(raw) as LastImport) : null;
  } catch {
    return null;
  }
}

function BagSection({
  bag, items, onDelete,
}: {
  bag: BagKind;
  items: PackingItem[];
  onDelete: (item: PackingItem) => void;
}) {
  const done = items.filter((i) => i.checked).length;

  const byCategory = useMemo(() => {
    const map = new Map<string, PackingItem[]>();
    for (const i of items) {
      if (!map.has(i.category)) map.set(i.category, []);
      map.get(i.category)!.push(i);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-bold">
          {bagMeta[bag].emoji} {bagMeta[bag].label}
        </h2>
        <span className="text-sm font-semibold tabular-nums text-ink-2">
          {done}/{items.length}
        </span>
      </div>
      {items.length > 0 && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
          />
        </div>
      )}

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-ink-3">尚無項目。</p>
      ) : (
        byCategory.map(([category, rows]) => (
          <div key={category} className="mt-3">
            <p className="text-xs font-semibold text-ink-3">{category}</p>
            <ul className="mt-1 flex flex-col gap-1">
              {rows.map((item) => (
                <li
                  key={item.id}
                  className={`flex items-center gap-3 rounded-xl px-2 py-2 ${
                    item.highlight ? 'bg-danger/10' : ''
                  }`}
                >
                  <button
                    aria-label={item.checked ? '取消勾選' : '勾選'}
                    onClick={() => packingRepository.toggle(item.id)}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                      item.checked
                        ? 'border-primary bg-primary text-primary-ink'
                        : item.highlight ? 'border-danger/60' : 'border-line'
                    }`}
                  >
                    {item.checked && (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4 10-10" />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`min-w-0 flex-1 text-sm ${
                      item.checked ? 'text-ink-3 line-through' : item.highlight ? 'font-bold text-danger' : 'font-medium'
                    }`}
                  >
                    {item.highlight && '❗'}{item.name}
                    {item.qty > 1 && (
                      <span className="ml-1 text-xs font-normal text-ink-3">×{item.qty}</span>
                    )}
                  </span>
                  <button
                    aria-label="醒目標示"
                    className={`p-1 text-sm ${item.highlight ? '' : 'opacity-30 grayscale'}`}
                    onClick={() => packingRepository.toggleHighlight(item.id)}
                  >
                    ❗
                  </button>
                  <button
                    aria-label="刪除"
                    className="p-1 text-ink-3 active:text-danger"
                    onClick={() => onDelete(item)}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M6 7l1 13h10l1-13" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

export default function PackingPage() {
  const trip = useTrip();
  const allItems = useLiveQuery(
    () => (trip ? packingRepository.list(trip.id) : Promise.resolve([])),
    [trip?.id],
  );

  const [ownerKey, setOwnerKey] = useState<string>(SHARED);
  const [adding, setAdding] = useState(false);
  const [bag, setBag] = useState<BagKind>('carry');
  const [name, setName] = useState('');
  const [qtyText, setQtyText] = useState('1');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [highlight, setHighlight] = useState(false);

  const [lastImport, setLastImport] = useState<LastImport | null>(loadLastImport());

  // delete-undo snackbar
  const [undoItem, setUndoItem] = useState<PackingItem | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  if (!trip || !allItems) return null;

  const items = allItems.filter((i) =>
    ownerKey === SHARED ? !i.ownerId : i.ownerId === ownerKey,
  );
  const carry = items.filter((i) => i.bag === 'carry');
  const checked = items.filter((i) => i.bag === 'checked');
  const doneAll = items.filter((i) => i.checked).length;

  const existingCategories = [
    ...new Set([...DEFAULT_CATEGORIES, ...allItems.map((i) => i.category)]),
  ];

  const currentOwnerName =
    ownerKey === SHARED ? '共用' : trip.travelers.find((t) => t.id === ownerKey)?.name ?? '成員';

  const doDelete = (item: PackingItem) => {
    void packingRepository.remove(item.id);
    setUndoItem(item);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoItem(null), 3000);
  };

  const undo = () => {
    if (!undoItem) return;
    void packingRepository.restore(undoItem);
    setUndoItem(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  const importTemplate = async () => {
    const ids = await packingRepository.applyTemplate(
      trip.id,
      ownerKey === SHARED ? undefined : ownerKey,
    );
    const record: LastImport = { ownerKey, ids };
    setLastImport(record);
    localStorage.setItem(LAST_IMPORT_KEY, JSON.stringify(record));
  };

  const cancelImport = async () => {
    if (!lastImport) return;
    await packingRepository.removeMany(lastImport.ids);
    setLastImport(null);
    localStorage.removeItem(LAST_IMPORT_KEY);
  };

  const submit = async () => {
    if (!name.trim()) return;
    await packingRepository.add({
      tripId: trip.id,
      bag,
      name,
      qty: Number(qtyText) || 1,
      category: customCategory.trim() || category || '其他',
      ownerId: ownerKey === SHARED ? undefined : ownerKey,
      highlight,
    });
    setName('');
    setQtyText('1');
    setHighlight(false);
    setCustomCategory('');
    setAdding(false);
  };

  return (
    <div className="flex flex-col gap-3 py-5 pb-16">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">行李清單</h1>
        {items.length > 0 && (
          <span className="text-sm font-semibold tabular-nums text-ink-2">
            {currentOwnerName} {doneAll}/{items.length}
          </span>
        )}
      </header>

      {/* member tabs (rename via 花費頁 → 成員) */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-1.5">
          <button
            onClick={() => setOwnerKey(SHARED)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              ownerKey === SHARED ? 'bg-primary text-primary-ink' : 'bg-surface-2 border border-line/60 text-ink-2'
            }`}
          >
            👨‍👩‍👧‍👦 共用
          </button>
          {trip.travelers.map((t) => (
            <button
              key={t.id}
              onClick={() => setOwnerKey(t.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                ownerKey === t.id ? 'bg-primary text-primary-ink' : 'bg-surface-2 border border-line/60 text-ink-2'
              }`}
            >
              {t.name}{t.isChild ? ' 🧒' : ''}
            </button>
          ))}
        </div>
      </div>
      <p className="-mt-1 text-xs text-ink-3">
        成員暱稱可在「花費 → 成員」修改,兩邊共用同一份名單。
      </p>

      {/* template import / cancel */}
      {items.length === 0 ? (
        <section className="card p-5 text-center">
          <p className="text-sm text-ink-2">
            「{currentOwnerName}」的清單目前是空的。可帶入夏日日本預設清單,或直接自行新增。
          </p>
          <button
            onClick={importTemplate}
            className="mt-3 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-ink active:opacity-80"
          >
            帶入預設清單
          </button>
        </section>
      ) : (
        lastImport?.ownerKey === ownerKey && (
          <button
            onClick={cancelImport}
            className="rounded-xl bg-surface-3 py-2.5 text-xs font-semibold text-ink-2 active:opacity-70"
          >
            ↩ 取消這次帶入(移除剛帶入的預設項目)
          </button>
        )
      )}

      <BagSection bag="carry" items={carry} onDelete={doDelete} />
      <BagSection bag="checked" items={checked} onDelete={doDelete} />

      <button
        onClick={() => setAdding(true)}
        className="rounded-2xl border-2 border-dashed border-line py-3.5 text-sm font-semibold text-ink-2 active:bg-surface-3"
      >
        ＋ 新增物品到「{currentOwnerName}」
      </button>

      {/* add sheet */}
      <BottomSheet open={adding} onClose={() => setAdding(false)} title={`新增物品:${currentOwnerName}`}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-3 p-1">
            {(Object.keys(bagMeta) as BagKind[]).map((b) => (
              <button
                key={b}
                onClick={() => setBag(b)}
                className={`rounded-lg py-2 text-sm font-semibold ${
                  bag === b ? 'bg-primary text-primary-ink' : 'text-ink-2'
                }`}
              >
                {bagMeta[b].emoji} {bagMeta[b].label}
              </button>
            ))}
          </div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="物品名稱,例如:護照"
            className="w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary"
          />

          <div>
            <p className="text-xs font-semibold text-ink-2">分類(點選或自填)</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {existingCategories.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCategory(c);
                    setCustomCategory('');
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    category === c && !customCategory ? 'bg-primary text-primary-ink' : 'bg-surface-3 text-ink-2'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="或自填新分類,例如:小朋友用品"
              className="mt-2 w-full rounded-xl border border-dashed border-line bg-surface p-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 items-end gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-2" htmlFor="pk-qty">數量</label>
              <input
                id="pk-qty"
                type="number" inputMode="numeric" min="1"
                value={qtyText}
                onChange={(e) => setQtyText(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={() => setHighlight(!highlight)}
              className={`rounded-xl py-3 text-sm font-semibold ${
                highlight ? 'bg-danger/15 text-danger' : 'bg-surface-3 text-ink-2'
              }`}
            >
              ❗ 醒目標示{highlight ? ':開' : ''}
            </button>
          </div>

          <button
            disabled={!name.trim()}
            onClick={submit}
            className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
          >
            加入清單
          </button>
        </div>
      </BottomSheet>

      {/* delete-undo snackbar */}
      {undoItem && (
        <div className="fixed inset-x-0 bottom-16 z-50 flex justify-center px-4 pb-safe">
          <div className="flex w-full max-w-lg items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-surface shadow-card">
            <span className="min-w-0 flex-1 truncate text-sm">已刪除「{undoItem.name}」</span>
            <button
              onClick={undo}
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
