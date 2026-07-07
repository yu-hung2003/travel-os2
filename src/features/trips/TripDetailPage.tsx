import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, parseISO } from 'date-fns';
import { tripRepository } from '@/data/repositories/tripRepository';
import { TransferSection } from '@/features/trips/components/TransferSection';
import { FlightSection } from '@/features/trips/components/FlightSection';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { forgetTrip } from '@/shared/hooks/useTrip';

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

export default function TripDetailPage() {
  const { tripId = '' } = useParams();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const trip = useLiveQuery(() => tripRepository.getTrip(tripId), [tripId]);
  const days = useLiveQuery(() => tripRepository.listDays(tripId), [tripId]);
  const accommodations = useLiveQuery(() => tripRepository.listAccommodations(tripId), [tripId]);

  if (!trip || !days) return null;

  const noteLines = (trip.note ?? '').split('\n').filter(Boolean);

  return (
    <div className="flex flex-col gap-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">{trip.coverEmoji} {trip.title}</h1>
        <p className="mt-1 text-sm text-ink-2">
          {format(parseISO(trip.startDate), 'yyyy/M/d')} – {format(parseISO(trip.endDate), 'M/d')} · {trip.destination} · {trip.travelers.length} 人
        </p>
      </div>

      <section className="flex flex-col gap-2.5">
        {days.map((day) => {
          const d = parseISO(day.date);
          return (
            <Link
              key={day.id}
              to={`/t/${trip.id}/timeline?day=${day.id}`}
              className="card flex items-center gap-4 p-4 active:opacity-80"
            >
              <div className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-primary/10 py-1.5">
                <span className="text-[10px] font-semibold uppercase text-primary">Day</span>
                <span className="text-xl font-bold leading-none text-primary">{day.dayIndex}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-ink-3">
                  {format(d, 'M/d')}（{WEEKDAY[d.getDay()]}）
                </p>
                <p className="truncate text-sm font-semibold">{day.title}</p>
              </div>
            </Link>
          );
        })}
      </section>

      <FlightSection tripId={trip.id} />

      <TransferSection tripId={trip.id} />

      {accommodations && accommodations.length > 0 && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink-2">住宿</h2>
          <ul className="mt-2 space-y-3">
            {accommodations.map((a) => (
              <li key={a.id}>
                <p className="text-sm font-semibold">{a.name}</p>
                <p className="text-xs text-ink-3">
                  {format(parseISO(a.checkInDate), 'M/d')} 入住 – {format(parseISO(a.checkOutDate), 'M/d')} 退房
                  {a.note ? ` · ${a.note}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {noteLines.length > 0 && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink-2">旅程備忘</h2>
          <ul className="mt-2 space-y-2">
            {noteLines.map((line, i) => (
              <li key={i} className={`text-sm leading-relaxed ${line.startsWith('⚠️') ? 'text-warning' : 'text-ink-2'}`}>
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="card p-5">
        <h2 className="text-sm font-bold text-danger">🗑 刪除此旅程</h2>
        <p className="mt-1 text-xs text-ink-3">
          從這台裝置移除整趟旅程與其所有資料(行程、記帳、行李、口袋名單、血拼清單)。
          若此旅程有夥伴同步,會先停止此裝置的同步,夥伴裝置上的資料不受影響。
        </p>
        <button
          className="mt-3 rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-bold text-danger active:opacity-70"
          onClick={() => setConfirmDelete(true)}
        >
          刪除旅程
        </button>
      </section>

      <BottomSheet open={confirmDelete} onClose={() => !deleting && setConfirmDelete(false)} title="確認刪除旅程">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-2">
            確定要從此裝置刪除「{trip.coverEmoji} {trip.title}」?此動作無法還原。
          </p>
          <button
            disabled={deleting}
            className="rounded-xl bg-danger py-3 text-sm font-bold text-white disabled:opacity-40 active:opacity-80"
            onClick={async () => {
              setDeleting(true);
              try {
                // unlink sync first so local deletes never propagate to partners
                const sync = await import('@/data/sync/familySync');
                sync.leaveSync(trip.id);
                await tripRepository.deleteTrip(trip.id);
                forgetTrip(trip.id);
                navigate('/', { replace: true });
              } finally {
                setDeleting(false);
              }
            }}
          >
            {deleting ? '刪除中…' : '確認刪除'}
          </button>
          <button className="text-sm text-ink-3" onClick={() => setConfirmDelete(false)}>取消</button>
        </div>
      </BottomSheet>
    </div>
  );
}
