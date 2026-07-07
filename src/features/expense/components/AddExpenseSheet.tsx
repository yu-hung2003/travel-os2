import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import type { ExpenseCategory, Traveler, TripDay } from '@/domain/types';
import { expenseRepository } from '@/data/repositories/expenseRepository';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { categoryMeta, categoryOrder } from '@/features/expense/categoryMeta';

interface Props {
  open: boolean;
  tripId: string;
  days: TripDay[];
  travelers: Traveler[];
  onClose: () => void;
}

const NO_DAY = '__none__';

export function AddExpenseSheet({ open, tripId, days, travelers, onClose }: Props) {
  const todayIso = format(new Date(), 'yyyy-MM-dd');
  const todayDay = useMemo(() => days.find((d) => d.date === todayIso), [days, todayIso]);

  const [category, setCategory] = useState<ExpenseCategory>('lunch');
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [dayId, setDayId] = useState<string>(todayDay?.id ?? NO_DAY);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [payerId, setPayerId] = useState<string | null>(null);

  const toggleMember = (id: string) => {
    setMemberIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  };

  const amount = Number(amountText);
  const valid = Number.isFinite(amount) && amount > 0;

  const submit = async () => {
    if (!valid) return;
    await expenseRepository.add({
      tripId,
      dayId: dayId === NO_DAY ? undefined : dayId,
      category,
      amount: Math.round(amount),
      note,
      memberIds,
      payerId: payerId ?? undefined,
    });
    setAmountText('');
    setNote('');
    setMemberIds([]);
    setPayerId(null);
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="記一筆">
      <div className="flex flex-col gap-4">
        {/* 1. category */}
        <div className="grid grid-cols-3 gap-2">
          {categoryOrder.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`flex flex-col items-center rounded-xl py-2.5 text-sm font-semibold ${
                category === c ? 'bg-primary text-primary-ink' : 'bg-surface-3 text-ink-2'
              }`}
            >
              <span className="text-lg">{categoryMeta[c].emoji}</span>
              {categoryMeta[c].label}
            </button>
          ))}
        </div>

        {/* 2. amount */}
        <div>
          <label className="text-xs font-semibold text-ink-2" htmlFor="exp-amount">
            金額(¥ 日圓)
          </label>
          <input
            id="exp-amount"
            type="number"
            inputMode="numeric"
            min="0"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            placeholder="0"
            className="mt-1 w-full rounded-xl border border-line bg-surface p-3 text-2xl font-bold tabular-nums outline-none focus:border-primary"
          />
        </div>

        {/* day + note (optional) */}
        <div className="-mx-1 overflow-x-auto px-1">
          <div className="flex w-max gap-1.5">
            <button
              onClick={() => setDayId(NO_DAY)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                dayId === NO_DAY ? 'bg-primary text-primary-ink' : 'bg-surface-3 text-ink-2'
              }`}
            >
              不指定
            </button>
            {days.map((d) => (
              <button
                key={d.id}
                onClick={() => setDayId(d.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  dayId === d.id ? 'bg-primary text-primary-ink' : 'bg-surface-3 text-ink-2'
                }`}
              >
                Day {d.dayIndex}{d.date === todayIso ? '(今天)' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* members: none selected = shared by everyone */}
        <div>
          <p className="text-xs font-semibold text-ink-2">
            成員(不選 = 全體共同)
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {travelers.map((t) => (
              <button
                key={t.id}
                onClick={() => toggleMember(t.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  memberIds.includes(t.id)
                    ? 'bg-accent text-white'
                    : 'bg-surface-3 text-ink-2'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* payer: enables settlement in the trip summary */}
        <div>
          <p className="text-xs font-semibold text-ink-2">
            付款人(選填 — 填了才能在旅程總結算「誰該給誰」)
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {travelers.map((t) => (
              <button
                key={t.id}
                onClick={() => setPayerId(payerId === t.id ? null : t.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  payerId === t.id ? 'bg-primary text-primary-ink' : 'bg-surface-3 text-ink-2'
                }`}
              >
                💳 {t.name}
              </button>
            ))}
          </div>
        </div>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="備註(可留空),例如:HARBS 千層蛋糕"
          className="w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary"
        />

        {/* 3. save */}
        <button
          disabled={!valid}
          onClick={submit}
          className="rounded-xl bg-primary py-3.5 text-base font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
        >
          儲存 {valid ? `¥${Math.round(amount).toLocaleString()}` : ''}
        </button>
      </div>
    </BottomSheet>
  );
}
