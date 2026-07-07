import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Service worker lifecycle UI:
 * - needRefresh → persistent banner with an explicit update button
 *   (user-controlled swap prevents stale-cache white screens)
 * - offlineReady → transient toast confirming full offline capability
 */
export function PwaBanner() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  const [showOffline, setShowOffline] = useState(false);
  useEffect(() => {
    if (!offlineReady) return;
    setShowOffline(true);
    const t = setTimeout(() => {
      setShowOffline(false);
      setOfflineReady(false);
    }, 4000);
    return () => clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  if (needRefresh) {
    return (
      <div className="fixed inset-x-0 top-0 z-[60] flex justify-center pt-safe">
        <div className="m-2 flex w-full max-w-lg items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-surface shadow-card">
          <span className="flex-1 text-sm font-semibold">有新版本可用</span>
          <button
            className="rounded-xl bg-primary px-3 py-1.5 text-sm font-bold text-primary-ink active:opacity-80"
            onClick={() => updateServiceWorker(true)}
          >
            立即更新
          </button>
        </div>
      </div>
    );
  }

  if (showOffline) {
    return (
      <div className="fixed inset-x-0 top-0 z-[60] flex justify-center pt-safe">
        <div className="m-2 rounded-2xl bg-success px-4 py-2.5 text-sm font-semibold text-white shadow-card">
          ✅ 已快取完成,現在可完全離線使用
        </div>
      </div>
    );
  }

  return null;
}
