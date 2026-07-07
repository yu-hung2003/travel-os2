import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { templates, importTemplate } from '@/data/templates';

export function TemplateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const existing = useLiveQuery(async () => {
    const set = new Set<string>();
    for (const t of templates) {
      if (await db.trips.get(t.id)) set.add(t.id);
    }
    return set;
  }, [open]);

  return (
    <BottomSheet open={open} onClose={() => !busy && onClose()} title="📦 匯入旅程範本">
      <div className="flex flex-col gap-3">
        <p className="text-xs text-ink-3">
          範本會建立成你自己的本機旅程,可自由修改,不會與任何人同步(要共用請之後再開啟夥伴同步)。
        </p>
        {templates.map((t) => {
          const has = existing?.has(t.id) ?? false;
          return (
            <div key={t.id} className="card p-4">
              <p className="text-sm font-bold">{t.emoji} {t.name}</p>
              <p className="mt-0.5 text-xs text-ink-3">{t.description}</p>
              <button
                disabled={busy || has}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const id = await importTemplate(t.id);
                    onClose();
                    navigate(`/t/${id}/today`);
                  } catch {
                    /* exists — button already disabled next render */
                  } finally {
                    setBusy(false);
                  }
                }}
                className="mt-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
              >
                {has ? '✅ 已在裝置中' : busy ? '匯入中…' : '匯入'}
              </button>
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
}
