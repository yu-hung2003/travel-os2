import { useEffect, useState } from 'react';

const PRESETS = [
  { id: 'passport', label: '護照效期(建議 6 個月以上)' },
  { id: 'entry', label: '入境手續(如日本 VJW QR code)' },
  { id: 'insurance', label: '旅平險/不便險' },
  { id: 'money', label: '外幣現金 + 信用卡海外開通' },
  { id: 'license', label: '駕照譯本(若租車)' },
];

/** pre-departure documents checklist; checked state is device-local */
export function DocsChecklistCard({ tripId }: { tripId: string }) {
  const KEY = `travelos2-docs-${tripId}`;
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      setChecked(new Set(raw ? (JSON.parse(raw) as string[]) : []));
    } catch { /* fresh */ }
  }, [KEY]);

  const toggle = (id: string) => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
    localStorage.setItem(KEY, JSON.stringify([...next]));
  };

  const allDone = PRESETS.every((p) => checked.has(p.id));

  return (
    <section className="card p-4">
      <p className="text-xs font-semibold text-ink-2">
        📄 行前證件檢查{allDone ? ' · 全部完成 ✅' : `(${checked.size}/${PRESETS.length})`}
      </p>
      {!allDone && (
        <ul className="mt-2 space-y-1.5">
          {PRESETS.map((p) => (
            <li key={p.id}>
              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={checked.has(p.id)}
                  onChange={() => toggle(p.id)}
                  className="h-5 w-5 shrink-0 rounded accent-[var(--primary,#0d9488)]"
                />
                <span className={checked.has(p.id) ? 'text-ink-3 line-through' : ''}>{p.label}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 text-[11px] text-ink-3">勾選狀態僅存於此裝置(每人自己勾自己的)。</p>
    </section>
  );
}
