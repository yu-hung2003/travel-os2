import { useEffect, useState } from 'react';
import { expenseRepository } from '@/data/repositories/expenseRepository';
import { BottomSheet } from '@/shared/components/BottomSheet';

interface Props {
  open: boolean;
  tripId: string;
  current?: number;
  onClose: () => void;
}

export function BudgetSheet({ open, tripId, current, onClose }: Props) {
  const [text, setText] = useState('');
  useEffect(() => {
    setText(current ? String(current) : '');
  }, [current, open]);

  const value = Number(text);
  const valid = text === '' || (Number.isFinite(value) && value >= 0);

  const save = async () => {
    if (!valid) return;
    await expenseRepository.setTripBudget(tripId, text === '' ? undefined : Math.round(value));
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="設定旅程總預算">
      <div className="flex flex-col gap-3">
        <p className="text-xs text-ink-3">以日圓計。留空表示不設定預算。</p>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="例如:300000"
          className="w-full rounded-xl border border-line bg-surface p-3 text-2xl font-bold tabular-nums outline-none focus:border-primary"
        />
        <button
          disabled={!valid}
          onClick={save}
          className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
        >
          儲存
        </button>
      </div>
    </BottomSheet>
  );
}
