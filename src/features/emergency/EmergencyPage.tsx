import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { tripRepository } from '@/data/repositories/tripRepository';
import { useTrip } from '@/shared/hooks/useTrip';

const MEETUP_KEY = 'travelos-meetup-note';

export default function EmergencyPage() {
  const trip = useTrip();
  const accommodations = useLiveQuery(
    () => (trip ? tripRepository.listAccommodations(trip.id) : Promise.resolve([])),
    [trip?.id],
  );

  const [meetup, setMeetup] = useState('');
  useEffect(() => {
    setMeetup(localStorage.getItem(MEETUP_KEY) ?? '');
  }, []);

  if (!trip || !accommodations) return null;

  return (
    <div className="flex flex-col gap-3 py-5">
      <h1 className="text-2xl font-bold">🆘 緊急資訊</h1>
      <p className="-mt-1 text-xs text-ink-3">
        全部離線可用。號碼與資訊出發前請再次確認,以官方公告為準。
      </p>

      <section className="card p-5">
        <h2 className="text-sm font-bold text-danger">📞 緊急電話(日本)</h2>
        <ul className="mt-2 space-y-2 text-sm">
          <li className="flex items-center justify-between">
            <span>警察(報案)</span>
            <a href="tel:110" className="rounded-xl bg-danger px-4 py-1.5 font-bold text-white active:opacity-80">110</a>
          </li>
          <li className="flex items-center justify-between">
            <span>救護車・消防</span>
            <a href="tel:119" className="rounded-xl bg-danger px-4 py-1.5 font-bold text-white active:opacity-80">119</a>
          </li>
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-bold">🏨 飯店資訊(給計程車司機看)</h2>
        <ul className="mt-2 space-y-3">
          {accommodations.map((a) => (
            <li key={a.id}>
              <p className="text-sm font-bold">{a.name}</p>
              {a.address ? (
                <p className="mt-0.5 select-all rounded-lg bg-surface-3 px-3 py-2 text-sm">{a.address}</p>
              ) : (
                <p className="mt-0.5 text-xs text-warning">
                  尚未填地址——可在地圖頁的地點清單或請我協助補上。
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-bold">🇹🇼 台北駐大阪經濟文化辦事處</h2>
        <p className="mt-1 text-sm text-ink-2">
          大阪市西區土佐堀 1-4-8 日榮ビル 4F
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <a href="tel:+81664438481" className="rounded-xl bg-surface-3 px-4 py-2 text-sm font-bold text-ink active:opacity-70">
            📞 代表號 06-6443-8481
          </a>
          <a href="tel:+819087944568" className="rounded-xl bg-danger/10 px-4 py-2 text-sm font-bold text-danger active:opacity-70">
            🚨 急難救助 090-8794-4568
          </a>
        </div>
        <p className="mt-2 text-xs text-ink-3">
          急難救助專線限性命攸關等緊急求助使用。
        </p>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-bold">🛂 護照遺失處理</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-2">
          <li>就近向警察局(交番)報案,取得報案證明(遺失受理番号)</li>
          <li>聯絡駐大阪辦事處申請入國證明書(備妥照片、報案證明)</li>
          <li>持入國證明書辦理返台;機票依航空公司指示改期</li>
        </ol>
        <p className="mt-2 text-xs text-ink-3">
          建議:護照影本 + 大頭照 2 張放在託運行李,與正本分開。
        </p>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-bold">📍 走散集合點(自填)</h2>
        <textarea
          rows={3}
          value={meetup}
          onChange={(e) => {
            setMeetup(e.target.value);
            localStorage.setItem(MEETUP_KEY, e.target.value);
          }}
          placeholder="例如:走散時回到該站的中央改札口集合;道頓堀 → 固力果看板前"
          className="mt-2 w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary"
        />
        <p className="mt-1 text-xs text-ink-3">此欄存於本機,出發前和全家講好並各自抄一份。</p>
      </section>
    </div>
  );
}
