import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, parseISO } from 'date-fns';
import { tripRepository } from '@/data/repositories/tripRepository';
import { lastTripId } from '@/shared/hooks/useTrip';
import { getRoomCode } from '@/data/sync/familySync';
import { CreateTripSheet } from '@/features/triplist/components/CreateTripSheet';
import { JoinSyncSheet } from '@/features/triplist/components/JoinSyncSheet';
import { TemplateSheet } from '@/features/triplist/components/TemplateSheet';
import { SettingsSheet } from '@/features/triplist/components/SettingsSheet';

const BOOT_KEY = 'travelos2-booted';

const statusLabel: Record<string, string> = {
  planning: '計畫中', ongoing: '旅行中', done: '已結束',
};

export default function TripListPage() {
  const navigate = useNavigate();
  const trips = useLiveQuery(() => tripRepository.listTrips());
  const [sheet, setSheet] = useState<'create' | 'join' | 'template' | 'settings' | null>(null);

  // boot: jump straight into the last-opened trip (only on app launch,
  // so tapping "切換旅程" doesn't bounce back)
  useEffect(() => {
    if (sessionStorage.getItem(BOOT_KEY)) return;
    sessionStorage.setItem(BOOT_KEY, '1');
    const last = lastTripId();
    if (!last) return;
    void tripRepository.getTrip(last).then((t) => {
      if (t) navigate(`/t/${t.id}/today`, { replace: true });
    });
  }, [navigate]);

  if (!trips) return null;

  return (
    <div className="flex flex-col gap-4 py-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">我的旅程</h1>
        <button className="text-sm font-semibold text-primary" onClick={() => setSheet('settings')}>
          ⚙️ 設定
        </button>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setSheet('create')}
          className="rounded-2xl bg-primary py-3 text-sm font-bold text-primary-ink active:opacity-80"
        >
          ＋ 建立旅程
        </button>
        <button
          onClick={() => setSheet('join')}
          className="rounded-2xl bg-surface-2 border border-line/60 py-3 text-sm font-bold text-ink-2 active:opacity-70"
        >
          🔑 夥伴同步
        </button>
        <button
          onClick={() => setSheet('template')}
          className="rounded-2xl bg-surface-2 border border-line/60 py-3 text-sm font-bold text-ink-2 active:opacity-70"
        >
          📦 匯入範本
        </button>
      </div>

      {trips.length === 0 ? (
        <section className="card p-6 text-center">
          <p className="text-4xl">🧳</p>
          <h2 className="mt-2 text-base font-bold">開始你的第一趟旅程</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            「＋ 建立旅程」從零規劃(例如台東三日遊);
            「🔑 夥伴同步」輸入家人朋友給的同步碼,整趟旅程會自動下載到這台裝置;
            或「📦 匯入範本」試試完整範例。
          </p>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {trips.map((t) => (
            <li key={t.id}>
              <Link to={`/t/${t.id}/today`} className="card block p-5 active:opacity-80">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-bold leading-snug">
                    {t.coverEmoji ?? '🧳'} {t.title}
                  </p>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {getRoomCode(t.id) && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        🔗 同步中
                      </span>
                    )}
                    <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold text-ink-2">
                      {statusLabel[t.status] ?? t.status}
                    </span>
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-2">
                  {format(parseISO(t.startDate), 'yyyy/M/d')} – {format(parseISO(t.endDate), 'M/d')} · {t.destination} · {t.travelers.length} 人
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CreateTripSheet open={sheet === 'create'} onClose={() => setSheet(null)} />
      <JoinSyncSheet open={sheet === 'join'} onClose={() => setSheet(null)} />
      <TemplateSheet open={sheet === 'template'} onClose={() => setSheet(null)} />
      <SettingsSheet open={sheet === 'settings'} onClose={() => setSheet(null)} />
    </div>
  );
}
