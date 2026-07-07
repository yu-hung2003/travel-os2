import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { transferRepository, type TransferInput } from '@/data/repositories/transferRepository';
import { BottomSheet } from '@/shared/components/BottomSheet';
import type { Transfer } from '@/domain/types';

interface Props {
  tripId: string;
}

const EMPTY: TransferInput = { tripId: '', title: '' };

export function TransferSection({ tripId }: Props) {
  const transfers = useLiveQuery(() => transferRepository.list(tripId), [tripId]);

  const [editing, setEditing] = useState<Transfer | 'new' | null>(null);
  const [form, setForm] = useState<TransferInput>({ ...EMPTY, tripId });
  const [amountText, setAmountText] = useState('');

  useEffect(() => {
    if (editing === 'new') {
      setForm({ ...EMPTY, tripId, title: '' });
      setAmountText('');
    } else if (editing) {
      setForm({
        tripId,
        title: editing.title,
        datetime: editing.datetime,
        amount: editing.amount,
        contactName: editing.contactName,
        contactPhone: editing.contactPhone,
        note: editing.note,
      });
      setAmountText(editing.amount !== undefined ? String(editing.amount) : '');
    }
  }, [editing, tripId]);

  if (!transfers) return null;

  const save = async () => {
    if (!form.title.trim()) return;
    const amount = amountText.trim() === '' ? undefined : Math.round(Number(amountText));
    const payload: TransferInput = {
      ...form,
      title: form.title.trim(),
      amount: Number.isFinite(amount as number) ? amount : undefined,
      contactName: form.contactName?.trim() || undefined,
      contactPhone: form.contactPhone?.trim() || undefined,
      note: form.note?.trim() || undefined,
      datetime: form.datetime || undefined,
    };
    if (editing === 'new') await transferRepository.add(payload);
    else if (editing) await transferRepository.update(editing.id, payload);
    setEditing(null);
  };

  const remove = async () => {
    if (editing && editing !== 'new') await transferRepository.remove(editing.id);
    setEditing(null);
  };

  const input =
    'mt-1 w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary';

  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-ink-2">🚐 機場接送</h2>
        <button className="text-sm font-semibold text-primary" onClick={() => setEditing('new')}>
          ＋新增
        </button>
      </div>

      {transfers.length === 0 ? (
        <p className="mt-2 text-sm text-ink-3">尚無接送資訊,點右上新增去程/回程接送。</p>
      ) : (
        <ul className="mt-2 divide-y divide-line/60">
          {transfers.map((t) => (
            <li key={t.id} className="py-3">
              <button className="w-full text-left active:opacity-70" onClick={() => setEditing(t)}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-bold">{t.title}</p>
                  {t.amount !== undefined && (
                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                      {t.amount.toLocaleString()}
                    </p>
                  )}
                </div>
                {t.datetime && (
                  <p className="mt-0.5 text-xs tabular-nums text-ink-2">
                    {t.datetime.replace('T', ' ')}
                  </p>
                )}
                {t.note && <p className="mt-0.5 text-xs text-ink-3">{t.note}</p>}
              </button>
              {(t.contactName || t.contactPhone) && (
                <p className="mt-1 text-xs text-ink-2">
                  聯絡:{t.contactName ?? ''}
                  {t.contactPhone && (
                    <a href={`tel:${t.contactPhone}`} className="ml-1.5 font-semibold text-primary">
                      {t.contactPhone} 📞
                    </a>
                  )}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <BottomSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? '新增接送' : '編輯接送'}
      >
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-ink-2">名稱</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="例如:去程 桃園機場接送"
              className={input}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-2">時間</label>
            <input
              type="datetime-local"
              value={form.datetime ?? ''}
              onChange={(e) => setForm({ ...form, datetime: e.target.value })}
              className={input}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-2">金額</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                placeholder="例如:1800"
                className={input}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-2">聯絡人</label>
              <input
                value={form.contactName ?? ''}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                placeholder="司機/車行"
                className={input}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-2">聯絡電話</label>
            <input
              type="tel"
              value={form.contactPhone ?? ''}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              placeholder="09xx-xxx-xxx"
              className={input}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-2">備註</label>
            <textarea
              rows={2}
              value={form.note ?? ''}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="車牌、集合地點、行李數…"
              className={input}
            />
          </div>

          <button
            disabled={!form.title.trim()}
            onClick={save}
            className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
          >
            儲存
          </button>
          {editing !== 'new' && (
            <button className="text-sm font-semibold text-danger active:opacity-70" onClick={remove}>
              刪除此筆接送
            </button>
          )}
        </div>
      </BottomSheet>
    </section>
  );
}
