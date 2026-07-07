import { useEffect, useState } from 'react';
import type { Traveler, Trip } from '@/domain/types';
import { tripRepository } from '@/data/repositories/tripRepository';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { newId } from '@/shared/utils/id';

interface Props {
  open: boolean;
  trip: Trip;
  onClose: () => void;
}

export function MembersSheet({ open, trip, onClose }: Props) {
  const [members, setMembers] = useState<Traveler[]>([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (open) setMembers(trip.travelers.map((t) => ({ ...t })));
  }, [open, trip.travelers]);

  const rename = (id: string, name: string) => {
    setMembers((m) => m.map((t) => (t.id === id ? { ...t, name } : t)));
  };

  const remove = (id: string) => {
    setMembers((m) => m.filter((t) => t.id !== id));
  };

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    setMembers((m) => [...m, { id: newId(), name, isChild: false }]);
    setNewName('');
  };

  const save = async () => {
    const cleaned = members
      .map((t) => ({ ...t, name: t.name.trim() }))
      .filter((t) => t.name);
    if (cleaned.length === 0) return;
    await tripRepository.updateTravelers(trip.id, cleaned);
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="成員管理">
      <div className="flex flex-col gap-3">
        <p className="text-xs text-ink-3">
          修改暱稱、新增或刪除成員。刪除成員後,其記帳紀錄仍保留,只是不再標記該成員。
        </p>

        <ul className="flex flex-col gap-2">
          {members.map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <input
                value={t.name}
                onChange={(e) => rename(t.id, e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-line bg-surface p-2.5 text-sm outline-none focus:border-primary"
              />
              {t.isChild && <span className="text-xs text-ink-3">兒童</span>}
              <button
                aria-label={`刪除 ${t.name}`}
                className="p-1.5 text-ink-3 active:text-danger"
                onClick={() => remove(t.id)}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M6 7l1 13h10l1-13" />
                </svg>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="新成員暱稱"
            className="min-w-0 flex-1 rounded-xl border border-dashed border-line bg-surface p-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            disabled={!newName.trim()}
            onClick={add}
            className="rounded-xl bg-surface-3 px-4 py-2.5 text-sm font-semibold disabled:opacity-40 active:opacity-70"
          >
            新增
          </button>
        </div>

        <button
          disabled={members.filter((t) => t.name.trim()).length === 0}
          onClick={save}
          className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
        >
          儲存成員
        </button>
      </div>
    </BottomSheet>
  );
}
