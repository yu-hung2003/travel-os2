import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  createRoom, getRoomCode, leaveSync, getLastReceivedAt,
} from '@/data/sync/familySync';
import { isFirebaseConfigured } from '@/data/sync/firebase';
import { BottomSheet } from '@/shared/components/BottomSheet';

/** Per-trip partner sync (夥伴同步) card, shown inside the trip workspace. */
export function PartnerSyncCard({ tripId }: { tripId: string }) {
  const [code, setCode] = useState<string | null>(getRoomCode(tripId));
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lastRx, setLastRx] = useState<number | null>(getLastReceivedAt());

  useEffect(() => {
    setCode(getRoomCode(tripId));
  }, [tripId]);

  useEffect(() => {
    const t = setInterval(() => setLastRx(getLastReceivedAt()), 5000);
    return () => clearInterval(t);
  }, []);

  if (!isFirebaseConfigured()) {
    return (
      <section className="card p-5">
        <h2 className="text-sm font-bold">🤝 夥伴同步</h2>
        <p className="mt-1 text-xs text-warning">
          尚未設定 VITE_FIREBASE_API_KEY 環境變數,同步功能未啟用。
        </p>
      </section>
    );
  }

  const create = async () => {
    setBusy(true);
    setMsg(null);
    try {
      setCode(await createRoom(tripId));
    } catch {
      setMsg('建立失敗,請確認網路後再試。');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <section className="card p-5">
      <h2 className="text-sm font-bold">🤝 夥伴同步</h2>

      {code ? (
        <>
          <p className="mt-1 text-xs text-ink-2">
            此旅程同步中——把同步碼分享給夥伴,對方在旅程列表按「🔑 夥伴同步」輸入即可:
            沒有這個旅程會自動下載整趟,已有則會詢問是否合併。
          </p>
          <button
            onClick={copy}
            className="mt-3 w-full rounded-xl bg-surface-3 py-3 text-center text-lg font-bold tabular-nums tracking-wider active:opacity-70"
          >
            {code}
            <span className="ml-2 text-xs font-semibold text-primary">
              {copied ? '✅ 已複製' : '點擊複製'}
            </span>
          </button>
          <p className="mt-2 text-[11px] tabular-nums text-ink-3">
            {lastRx
              ? `🟢 連線正常 · 最後收到同步 ${format(lastRx, 'HH:mm:ss')}`
              : '🟡 尚未收到伺服器回應,請確認網路'}
          </p>
          <button
            className="mt-1 text-xs font-semibold text-danger active:opacity-70"
            onClick={() => setConfirmLeave(true)}
          >
            點擊停止此裝置同步
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-xs text-ink-2">
            讓夥伴的裝置共用「這個旅程」:按下建立取得同步碼,行程、記帳、行李、口袋名單、血拼清單即時互通;離線修改會在連網後自動合併。
          </p>
          <button
            disabled={busy}
            onClick={create}
            className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
          >
            {busy ? '建立中…' : '建立此旅程的夥伴同步'}
          </button>
        </>
      )}
      {msg && <p className="mt-2 text-xs text-danger">{msg}</p>}

      <BottomSheet open={confirmLeave} onClose={() => setConfirmLeave(false)} title="停止同步">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-2">
            此裝置將停止同步這個旅程;本機資料完整保留,夥伴的裝置不受影響。之後可用同一組同步碼重新加入。
          </p>
          <button
            className="rounded-xl bg-danger py-3 text-sm font-bold text-white active:opacity-80"
            onClick={() => {
              leaveSync(tripId);
              setCode(null);
              setConfirmLeave(false);
            }}
          >
            確認停止同步
          </button>
          <button className="text-sm text-ink-3" onClick={() => setConfirmLeave(false)}>取消</button>
        </div>
      </BottomSheet>
    </section>
  );
}
