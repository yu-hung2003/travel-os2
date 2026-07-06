import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { isFirebaseConfigured } from '@/data/sync/firebase';

export function JoinSyncSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmLink, setConfirmLink] =
    useState<{ code: string; tripId: string; title: string } | null>(null);

  const close = () => {
    setCode(''); setMsg(null); setConfirmLink(null);
    onClose();
  };

  const join = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const sync = await import('@/data/sync/familySync');
      const result = await sync.joinRoom(code);
      if (result.status === 'imported') {
        close();
        navigate(`/t/${result.tripId}/today`);
      } else {
        setConfirmLink({ code: result.code, tripId: result.tripId, title: result.title });
      }
    } catch (e) {
      setMsg(
        e instanceof Error && e.message === 'room-not-found'
          ? '找不到這組同步碼,請確認輸入是否正確(不分大小寫)。'
          : e instanceof Error && e.message === 'not-configured'
            ? '同步功能未啟用(缺 Firebase 環境變數)。'
            : '加入失敗,請確認網路後再試。',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={() => !busy && close()} title="🔑 夥伴同步">
      {confirmLink ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-relaxed text-ink-2">
            這台裝置已有「<span className="font-bold">{confirmLink.title}</span>」這個旅程。
            要與夥伴同步合併嗎?合併後雙方的修改即時互通,衝突以最後修改為準。
          </p>
          <button
            className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink active:opacity-80"
            onClick={async () => {
              const sync = await import('@/data/sync/familySync');
              sync.linkRoom(confirmLink.code, confirmLink.tripId);
              const tripId = confirmLink.tripId;
              close();
              navigate(`/t/${tripId}/today`);
            }}
          >
            ✓ 與現有旅程同步
          </button>
          <button className="text-sm text-ink-3" onClick={() => setConfirmLink(null)}>取消</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs leading-relaxed text-ink-3">
            輸入夥伴分享的同步碼(TRIP-XXXXXXXX)。
            裝置上還沒有這個旅程 → 會自動下載整趟旅程;
            已經有了 → 會先詢問你是否合併同步。
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="TRIP-XXXXXXXX"
            autoCapitalize="characters"
            className="w-full rounded-xl border border-line bg-surface p-3 text-center text-lg font-bold tabular-nums tracking-wider outline-none focus:border-primary"
          />
          {msg && <p className="text-xs text-danger">{msg}</p>}
          {!isFirebaseConfigured() && (
            <p className="text-xs text-warning">⚠️ 尚未設定 VITE_FIREBASE_API_KEY,同步無法使用。</p>
          )}
          <button
            disabled={busy || code.trim().length < 8}
            onClick={join}
            className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
          >
            {busy ? '連線中…' : '加入'}
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
