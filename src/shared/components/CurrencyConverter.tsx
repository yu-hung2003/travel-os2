import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useJpyTwd } from '@/shared/hooks/useJpyTwd';

/**
 * Two-way currency converter. Auto rate (cached offline) with a manual
 * override so it still works with no network and no cache.
 */
export function CurrencyConverter({ compact = false }: { compact?: boolean }) {
  const auto = useJpyTwd();
  const [manualRate, setManualRate] = useState('');
  const rate = manualRate.trim() !== '' && Number(manualRate) > 0
    ? Number(manualRate)
    : auto?.rate;

  const [jpy, setJpy] = useState('');
  const [twd, setTwd] = useState('');
  const [last, setLast] = useState<'jpy' | 'twd'>('jpy');

  useEffect(() => {
    if (!rate) return;
    if (last === 'jpy') {
      const v = Number(jpy);
      setTwd(jpy.trim() === '' || !Number.isFinite(v) ? '' : String(Math.round(v * rate)));
    } else {
      const v = Number(twd);
      setJpy(twd.trim() === '' || !Number.isFinite(v) ? '' : String(Math.round(v / rate)));
    }
  }, [jpy, twd, rate, last]);

  const inputCls =
    'mt-1 w-full rounded-xl border border-line bg-surface p-2.5 text-lg font-bold tabular-nums outline-none focus:border-primary';

  return (
    <section className={`card ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold text-ink-2">💱 匯率試算 JPY ⇄ TWD</h2>
        {rate && (
          <span className="text-[10px] tabular-nums text-ink-3">
            1円 ≈ {rate.toFixed(4)} 元
            {auto && !manualRate && (auto.stale ? ' · 離線快取' : '')}
            {auto && !manualRate && ` · ${format(auto.fetchedAt, 'M/d HH:mm')}`}
          </span>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 items-end gap-3">
        <div>
          <label className="text-xs font-semibold text-ink-2">¥ 日圓</label>
          <input
            type="number" inputMode="numeric" min="0" placeholder="1000"
            value={jpy}
            onChange={(e) => { setLast('jpy'); setJpy(e.target.value); }}
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-2">NT$ 台幣</label>
          <input
            type="number" inputMode="numeric" min="0" placeholder="210"
            value={twd}
            onChange={(e) => { setLast('twd'); setTwd(e.target.value); }}
            className={inputCls}
          />
        </div>
      </div>

      {!rate && (
        <div className="mt-2">
          <p className="text-xs text-warning">目前無法取得匯率,可手動輸入(1 円 = ? 元):</p>
          <input
            type="number" inputMode="decimal" min="0" step="0.001" placeholder="0.21"
            value={manualRate}
            onChange={(e) => setManualRate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-surface p-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
      )}
    </section>
  );
}
