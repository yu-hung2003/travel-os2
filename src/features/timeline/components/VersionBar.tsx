import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { dayVersionRepository } from '@/data/repositories/dayVersionRepository';
import { BottomSheet } from '@/shared/components/BottomSheet';
import type { TripDay } from '@/domain/types';

const PRESETS = ['Rain Version 🌧️', 'Shopping Version 🛍️', 'Modified Version ✏️'];

export function VersionBar({ day }: { day: TripDay }) {
  const versions = useLiveQuery(() => dayVersionRepository.list(day.id), [day.id]);
  const [managing, setManaging] = useState(false);
  const [newName, setNewName] = useState('');

  if (!versions || versions.length === 0) return null;
  const activeId = day.activeVersionId ?? versions[0].id;

  const create = async (name: string) => {
    if (!name.trim()) return;
    await dayVersionRepository.createFrom({
      dayId: day.id,
      tripId: day.tripId,
      name,
      sourceVersionId: activeId,
    });
    setNewName('');
    setManaging(false);
  };

  return (
    <>
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max items-center gap-1.5">
          {versions.map((v) => (
            <button
              key={v.id}
              onClick={() => dayVersionRepository.setActive(day.id, v.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                v.id === activeId
                  ? 'bg-ink text-surface'
                  : 'bg-surface-2 border border-line/60 text-ink-2'
              }`}
            >
              {v.name}
            </button>
          ))}
          <button
            onClick={() => setManaging(true)}
            className="rounded-full border border-dashed border-line px-3 py-1.5 text-xs font-semibold text-ink-3"
          >
            ＋ 版本
          </button>
        </div>
      </div>

      <BottomSheet open={managing} onClose={() => setManaging(false)} title="行程版本管理">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-ink-3">
            新版本會複製目前「{versions.find((v) => v.id === activeId)?.name}」的所有事件,之後各自獨立編輯,隨時可切回。
          </p>

          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((name) => (
              <button
                key={name}
                onClick={() => create(name)}
                className="rounded-full bg-surface-3 px-3 py-2 text-xs font-semibold text-ink-2 active:opacity-70"
              >
                ＋ {name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create(newName)}
              placeholder="自訂版本名稱"
              className="min-w-0 flex-1 rounded-xl border border-line bg-surface p-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              disabled={!newName.trim()}
              onClick={() => create(newName)}
              className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
            >
              建立
            </button>
          </div>

          {versions.length > 1 && (
            <div>
              <p className="text-xs font-semibold text-ink-2">刪除版本</p>
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {versions.map((v) => (
                  <li key={v.id} className="flex items-center justify-between rounded-xl bg-surface-3 px-3 py-2">
                    <span className="text-sm">{v.name}{v.id === activeId ? '(目前)' : ''}</span>
                    <button
                      className="text-xs font-semibold text-danger active:opacity-70"
                      onClick={() => dayVersionRepository.remove(day.id, v.id)}
                    >
                      刪除
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
