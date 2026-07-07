import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, parseISO } from 'date-fns';
import { db } from '@/data/db';
import { tripRepository } from '@/data/repositories/tripRepository';
import { journalRepository } from '@/data/repositories/journalRepository';
import { categoryMeta } from '@/features/expense/categoryMeta';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { useJpyTwd } from '@/shared/hooks/useJpyTwd';
import { useTrip } from '@/shared/hooks/useTrip';
import type { TripDay } from '@/domain/types';

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;

export default function SummaryPage() {
  const trip = useTrip();
  const data = useLiveQuery(async () => {
    if (!trip) return null;
    const [days, expenses, places, journal] = await Promise.all([
      tripRepository.listDays(trip.id),
      db.expenses.where('tripId').equals(trip.id).toArray(),
      db.places.where('tripId').equals(trip.id).toArray(),
      journalRepository.listByTrip(trip.id),
    ]);
    const eventsByDay = new Map<string, { done: number; total: number }>();
    let done = 0;
    let total = 0;
    for (const d of days) {
      const evs = await db.events.where('dayId').equals(d.id)
        .and((e) => !d.activeVersionId || (e.versionId ?? '') === d.activeVersionId)
        .toArray();
      const nonTransport = evs.filter((e) => e.type !== 'transport');
      const dDone = nonTransport.filter((e) => e.status === 'completed').length;
      const dTotal = nonTransport.filter((e) => e.status !== 'skipped').length;
      eventsByDay.set(d.id, { done: dDone, total: dTotal });
      done += dDone;
      total += dTotal;
    }
    return { days, expenses, places, journal, eventsByDay, done, total };
  }, [trip?.id]);
  const rate = useJpyTwd();
  const [editDay, setEditDay] = useState<TripDay | null>(null);
  const [editText, setEditText] = useState('');

  if (!trip || !data) return null;
  const { days, expenses, places, journal, done, total } = data;

  const totalSpend = expenses.reduce((s, e) => s + e.amount, 0);
  const byDay = new Map<string, number>();
  for (const e of expenses) {
    if (e.dayId) byDay.set(e.dayId, (byDay.get(e.dayId) ?? 0) + e.amount);
  }
  const maxDaySpend = Math.max(1, ...byDay.values());

  const byCat = new Map<string, number>();
  for (const e of expenses) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
  const topCats = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  /* ---- settlement (expenses with a payer only) ---- */
  const withPayer = expenses.filter((e) => e.payerId);
  const paid = new Map<string, number>();
  const owed = new Map<string, number>();
  for (const t of trip.travelers) {
    paid.set(t.id, 0);
    owed.set(t.id, 0);
  }
  for (const e of withPayer) {
    paid.set(e.payerId!, (paid.get(e.payerId!) ?? 0) + e.amount);
    const sharers = e.memberIds && e.memberIds.length > 0
      ? e.memberIds
      : trip.travelers.map((t) => t.id);
    const share = e.amount / sharers.length;
    for (const id of sharers) owed.set(id, (owed.get(id) ?? 0) + share);
  }
  const balances = trip.travelers
    .map((t) => ({ id: t.id, name: t.name, bal: (paid.get(t.id) ?? 0) - (owed.get(t.id) ?? 0) }))
    .filter((b) => Math.abs(b.bal) >= 1);
  // greedy settlement suggestions
  const creditors = balances.filter((b) => b.bal > 0).map((b) => ({ ...b }))
    .sort((a, b) => b.bal - a.bal);
  const debtors = balances.filter((b) => b.bal < 0).map((b) => ({ ...b, bal: -b.bal }))
    .sort((a, b) => b.bal - a.bal);
  const transfers: string[] = [];
  let ci = 0;
  for (const d of debtors) {
    let remain = d.bal;
    while (remain >= 1 && ci < creditors.length) {
      const c = creditors[ci];
      const pay = Math.min(remain, c.bal);
      if (pay >= 1) transfers.push(`${d.name} → ${c.name} ${yen(pay)}`);
      remain -= pay;
      c.bal -= pay;
      if (c.bal < 1) ci += 1;
    }
  }

  const foodRank = places
    .filter((p) => p.status === 'visited' && p.myRating)
    .sort((a, b) => (b.myRating ?? 0) - (a.myRating ?? 0))
    .slice(0, 5);

  const journalByDay = new Map(journal.map((j) => [j.dayId, j]));

  return (
    <div className="flex flex-col gap-3 py-5">
      <div>
        <h1 className="text-2xl font-bold">🏁 旅程總結</h1>
        <p className="mt-0.5 text-xs text-ink-3">
          {trip.coverEmoji} {trip.title} · 隨時可看,旅程結束後就是完整回顧
        </p>
      </div>

      {/* spend */}
      <section className="card p-5">
        <h2 className="text-xs font-semibold text-ink-2">💴 總花費</h2>
        <p className="mt-1 text-3xl font-bold tabular-nums">
          {yen(totalSpend)}
          {rate && (
            <span className="ml-2 text-base font-semibold text-ink-3">
              ≈ NT$ {Math.round(totalSpend * rate.rate).toLocaleString()}
            </span>
          )}
        </p>
        <div className="mt-3 space-y-1.5">
          {days.map((d) => {
            const v = byDay.get(d.id) ?? 0;
            return (
              <div key={d.id} className="flex items-center gap-2 text-xs">
                <span className="w-12 shrink-0 tabular-nums text-ink-3">Day {d.dayIndex}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(v / maxDaySpend) * 100}%` }} />
                </div>
                <span className="w-20 shrink-0 text-right tabular-nums">{v > 0 ? yen(v) : '—'}</span>
              </div>
            );
          })}
        </div>
        {topCats.length > 0 && (
          <p className="mt-3 text-xs text-ink-2">
            花最多:{topCats.map(([c, v]) =>
              `${categoryMeta[c as keyof typeof categoryMeta].emoji}${categoryMeta[c as keyof typeof categoryMeta].label} ${yen(v)}`,
            ).join(' · ')}
          </p>
        )}
      </section>

      {/* settlement */}
      <section className="card p-5">
        <h2 className="text-xs font-semibold text-ink-2">🤝 成員分帳結算</h2>
        {withPayer.length === 0 ? (
          <p className="mt-1 text-sm text-ink-3">
            尚無標記付款人的支出。記帳時選「付款人」,這裡就會自動算出誰該給誰。
          </p>
        ) : (
          <>
            <ul className="mt-2 space-y-1 text-sm tabular-nums">
              {trip.travelers.map((t) => (
                <li key={t.id} className="flex justify-between">
                  <span>{t.name}</span>
                  <span className="text-ink-2">
                    已付 {yen(paid.get(t.id) ?? 0)} / 應攤 {yen(owed.get(t.id) ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
            {transfers.length > 0 && (
              <div className="mt-3 rounded-xl bg-primary/10 p-3">
                <p className="text-xs font-bold text-primary">結算建議:</p>
                {transfers.map((t) => (
                  <p key={t} className="mt-0.5 text-sm font-semibold tabular-nums">{t}</p>
                ))}
              </div>
            )}
            <p className="mt-2 text-[11px] text-ink-3">
              僅計入有標記付款人的支出({withPayer.length}/{expenses.length} 筆);
              未標記成員的支出視為全體均攤。
            </p>
          </>
        )}
      </section>

      {/* completion + food rank */}
      <section className="card p-5">
        <h2 className="text-xs font-semibold text-ink-2">⛩️ 行程足跡</h2>
        <p className="mt-1 text-sm">
          完成 <span className="text-xl font-bold tabular-nums">{done}</span>
          <span className="text-ink-3"> / {total}</span> 個景點與活動
          {total > 0 && <span className="ml-1 text-ink-2">({Math.round((done / total) * 100)}%)</span>}
        </p>
        {foodRank.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-ink-2">🏆 我們家的美食/景點榜</p>
            <ol className="mt-1 space-y-1">
              {foodRank.map((p, i) => (
                <li key={p.id} className="flex items-baseline gap-2 text-sm">
                  <span className="text-ink-3">{i + 1}.</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
                  <span className="shrink-0 font-bold text-warning">⭐ {p.myRating}/5</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {/* journal timeline */}
      <section className="card p-5">
        <h2 className="text-xs font-semibold text-ink-2">📔 旅程日記</h2>
        <ul className="mt-2 space-y-2.5">
          {days.map((d) => {
            const j = journalByDay.get(d.id);
            return (
              <li key={d.id}>
                <button
                  className="w-full text-left active:opacity-70"
                  onClick={() => {
                    setEditDay(d);
                    setEditText(j?.text ?? '');
                  }}
                >
                  <p className="text-xs font-semibold text-ink-3">
                    Day {d.dayIndex} · {format(parseISO(d.date), 'M/d')}
                  </p>
                  {j?.text ? (
                    <p className="mt-0.5 text-sm leading-relaxed">{j.text}</p>
                  ) : (
                    <p className="mt-0.5 text-sm text-ink-3">(點擊補寫)</p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <BottomSheet
        open={editDay !== null}
        onClose={() => setEditDay(null)}
        title={editDay ? `📔 Day ${editDay.dayIndex} 回顧` : ''}
      >
        {editDay && (
          <div className="flex flex-col gap-3">
            <textarea
              rows={3}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="一句話記下這天"
              className="w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary"
            />
            <button
              className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink active:opacity-80"
              onClick={async () => {
                await journalRepository.save(trip.id, editDay.id, editText);
                setEditDay(null);
              }}
            >
              儲存
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
