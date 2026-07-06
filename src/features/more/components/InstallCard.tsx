import { useSyncExternalStore } from 'react';

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari legacy flag
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function subscribe(cb: () => void) {
  const mq = window.matchMedia('(display-mode: standalone)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

export function InstallCard() {
  const standalone = useSyncExternalStore(subscribe, isStandalone, () => false);
  if (standalone) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold text-ink-2">📲 安裝到主畫面</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
        安裝後像原生 App 一樣全螢幕開啟,旅途中沒有網路也能完整使用。
      </p>
      {isIOS ? (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-2">
          <li>點 Safari 下方的「分享」按鈕(方框加箭頭)</li>
          <li>往下捲,選「加入主畫面」</li>
          <li>按「加入」完成</li>
        </ol>
      ) : (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-2">
          <li>點瀏覽器右上角「⋮」選單</li>
          <li>選「安裝應用程式」或「加到主畫面」</li>
        </ol>
      )}
    </section>
  );
}
