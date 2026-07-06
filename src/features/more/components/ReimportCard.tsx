import { useState } from 'react';
import { reimportItinerary } from '@/data/seed';
import { BottomSheet } from '@/shared/components/BottomSheet';

export function ReimportCard() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await reimportItinerary();
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
      }, 1500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5">
      <h2 className="text-sm font-bold">🔄 重新匯入京阪行程 v2</h2>
      <p className="mt-1 text-xs text-ink-2">
        套用重整後的行程:利木津巴士、五條假日酒店、交通卡與景點卡完全分離。
      </p>
      <button
        onClick={() => setOpen(true)}
        className="mt-3 rounded-xl bg-surface-3 px-4 py-2.5 text-sm font-bold text-ink-2 active:opacity-70"
      >
        開始重新匯入
      </button>

      <BottomSheet open={open} onClose={() => !busy && setOpen(false)} title="重新匯入行程 v2">
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-surface-3 p-3 text-xs leading-relaxed text-ink-2">
            <p className="font-bold">✅ 會保留:</p>
            <p>記帳、行李清單、口袋名單、機場接送、成員名單、預算</p>
            <p className="mt-2 font-bold text-warning">⚠️ 會重置:</p>
            <p>
              每日事件(含你手動修改的行程)、行程版本、住宿資訊;
              已排入行程的口袋餐廳退回「已選定」,需重新排入。
            </p>
            <p className="mt-2">有開家庭同步的話,只需一台裝置執行,會自動同步給全家。</p>
          </div>
          <button
            disabled={busy || done}
            onClick={run}
            className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
          >
            {done ? '✅ 已完成' : busy ? '匯入中…' : '確認重新匯入'}
          </button>
          {!busy && !done && (
            <button className="text-sm text-ink-3" onClick={() => setOpen(false)}>取消</button>
          )}
        </div>
      </BottomSheet>
    </section>
  );
}
