import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { packingRepository } from '@/data/repositories/packingRepository';
import type { Trip } from '@/domain/types';

/**
 * Pre-departure packing reminder: shown on the dashboard within 3 days
 * of departure. Per-member progress, with unchecked highlighted items
 * (e.g. passports) called out by name.
 */
export function PackingReminderCard({ trip }: { trip: Trip }) {
  const items = useLiveQuery(() => packingRepository.list(trip.id), [trip.id]);
  if (!items || items.length === 0) return null;

  const groups = [
    { key: '__shared__', name: '👨‍👩‍👧‍👦 共用', rows: items.filter((i) => !i.ownerId) },
    ...trip.travelers.map((t) => ({
      key: t.id,
      name: `${t.name}${t.isChild ? ' 🧒' : ''}`,
      rows: items.filter((i) => i.ownerId === t.id),
    })),
  ].filter((g) => g.rows.length > 0);

  return (
    <Link to={`/t/${trip.id}/packing`} className="card block p-5 active:opacity-80">
      <h2 className="text-xs font-semibold text-ink-2">🧳 行前打包提醒</h2>
      <ul className="mt-2 space-y-2">
        {groups.map((g) => {
          const done = g.rows.filter((i) => i.checked).length;
          const missingCritical = g.rows.filter((i) => i.highlight && !i.checked);
          const complete = done === g.rows.length;
          return (
            <li key={g.key} className="text-sm">
              <span className={`font-semibold ${complete ? 'text-success' : ''}`}>
                {g.name} {done}/{g.rows.length}{complete ? ' ✅' : ''}
              </span>
              {missingCritical.length > 0 && (
                <span className="mt-0.5 block text-xs font-bold text-danger">
                  ❗ 未勾:{missingCritical.map((i) => i.name).join('、')}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-ink-3">點擊前往行李清單 ›</p>
    </Link>
  );
}
