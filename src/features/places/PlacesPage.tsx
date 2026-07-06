import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTrip } from '@/shared/hooks/useTrip';
import { placeRepository, type PlaceInput } from '@/data/repositories/placeRepository';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { SchedulePlaceSheet } from '@/features/places/components/SchedulePlaceSheet';
import {
  distanceKm, gmapsDirectionsUrl, gmapsSearchUrl, parseGoogleMapsUrl, parseCoords,
} from '@/shared/utils/maps';
import type {
  GeoPoint, MealType, Place, PlaceKind, PlaceStatus, SightTag,
} from '@/domain/types';

const statusMeta: Record<PlaceStatus, { label: string; cls: string }> = {
  candidate: { label: '備選', cls: 'bg-surface-3 text-ink-2' },
  chosen: { label: '已選定', cls: 'bg-primary/15 text-primary' },
  scheduled: { label: '已加入行程', cls: 'bg-accent/15 text-accent' },
  visited: { label: '去過了', cls: 'bg-success/15 text-success' },
};
const statusOrder: PlaceStatus[] = ['scheduled', 'chosen', 'candidate', 'visited'];

const mealMeta: Record<MealType, { emoji: string; label: string }> = {
  breakfast: { emoji: '🍳', label: '早餐' },
  lunch: { emoji: '🍜', label: '中餐' },
  dinner: { emoji: '🍽️', label: '晚餐' },
  snack: { emoji: '🧋', label: '點心/飲料' },
};
const mealOrder: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const sightMeta: Record<SightTag, { emoji: string; label: string }> = {
  shrine: { emoji: '⛩️', label: '神社寺廟' },
  nature: { emoji: '🏞️', label: '自然風景' },
  landmark: { emoji: '🗼', label: '地標展望' },
  museum: { emoji: '🖼️', label: '博物館美術館' },
  themepark: { emoji: '🎢', label: '樂園體驗' },
  shopping: { emoji: '🛍️', label: '購物商圈' },
  kids: { emoji: '🧒', label: '親子友善' },
};
const sightOrder: SightTag[] = ['shrine', 'nature', 'landmark', 'museum', 'themepark', 'shopping', 'kids'];

const kindMeta: Record<PlaceKind, { emoji: string; label: string }> = {
  food: { emoji: '🍜', label: '餐廳' },
  sight: { emoji: '⛩️', label: '景點' },
};

function kindOf(p: Place): PlaceKind {
  return p.kind ?? 'food';
}

export default function PlacesPage() {
  const trip = useTrip();
  const places = useLiveQuery(
    () => (trip ? placeRepository.list(trip.id) : Promise.resolve([])),
    [trip?.id],
  );

  const [kind, setKind] = useState<PlaceKind>('food');
  const [editing, setEditing] = useState<Place | 'new' | null>(null);
  const [scheduling, setScheduling] = useState<Place | null>(null);
  const [form, setForm] = useState<PlaceInput | null>(null);
  const [coordsText, setCoordsText] = useState('');
  const [gmLink, setGmLink] = useState('');
  const [gmLinkMsg, setGmLinkMsg] = useState<string | null>(null);
  const [myLocation, setMyLocation] = useState<GeoPoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sortByDist, setSortByDist] = useState(false);

  // delete-undo snackbar
  const [undoPlace, setUndoPlace] = useState<Place | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  useEffect(() => {
    if (!trip || editing === null) return;
    if (editing === 'new') {
      setForm({ tripId: trip.id, name: '', status: 'candidate', kind });
      setCoordsText('');
      setGmLink('');
      setGmLinkMsg(null);
    } else {
      setForm({
        tripId: trip.id,
        name: editing.name,
        kind: kindOf(editing),
        mealTypes: editing.mealTypes,
        sightTags: editing.sightTags,
        myRating: editing.myRating,
        recommended: editing.recommended,
        queueNote: editing.queueNote,
        cardAccepted: editing.cardAccepted,
        needsReservation: editing.needsReservation,
        priceRange: editing.priceRange,
        hours: editing.hours,
        webUrl: editing.webUrl,
        menuUrl: editing.menuUrl,
        location: editing.location,
        note: editing.note,
        status: editing.status,
      });
      setCoordsText(editing.location ? `${editing.location.lat}, ${editing.location.lng}` : '');
    }
  }, [editing, trip, kind]);

  if (!trip || !places) return null;

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setGeoMsg('此裝置/瀏覽器不支援定位。');
      return;
    }
    setLocating(true);
    setGeoMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        setGeoMsg(null);
        setSortByDist(true);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setGeoMsg('定位權限被拒。iPhone:設定 → 隱私權與安全性 → 定位服務 → Safari 網站 設為「使用 App 期間」;若加入主畫面開啟,請重新開啟 App 後再按一次並允許。');
        } else if (err.code === 3) {
          setGeoMsg('定位逾時,請到訊號較好的地方(室外)再試一次。');
        } else {
          setGeoMsg('暫時無法取得位置,稍後再試。');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 },
    );
  };

  const doDelete = (p: Place) => {
    void placeRepository.remove(p.id);
    setEditing(null);
    setUndoPlace(p);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoPlace(null), 3000);
  };

  const undo = () => {
    if (!undoPlace) return;
    void placeRepository.restore(undoPlace);
    setUndoPlace(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  const save = async () => {
    if (!form || !form.name.trim()) return;
    const payload: PlaceInput = {
      ...form,
      name: form.name.trim(),
      priceRange: form.priceRange?.trim() || undefined,
      hours: form.hours?.trim() || undefined,
      webUrl: form.webUrl?.trim() || undefined,
      menuUrl: form.menuUrl?.trim() || undefined,
      recommended: form.recommended?.trim() || undefined,
      queueNote: form.queueNote?.trim() || undefined,
      note: form.note?.trim() || undefined,
      location: coordsText.trim() ? parseCoords(coordsText) : undefined,
    };
    if (editing === 'new') await placeRepository.add(payload);
    else if (editing) await placeRepository.update(editing.id, payload);
    setEditing(null);
  };

  const input =
    'mt-1 w-full rounded-xl border border-line bg-surface p-2.5 text-sm outline-none focus:border-primary';

  const kindPlaces = places.filter((p) => kindOf(p) === kind);
  const filtered = tagFilter
    ? kindPlaces.filter((p) =>
        kind === 'food'
          ? p.mealTypes?.includes(tagFilter as MealType)
          : p.sightTags?.includes(tagFilter as SightTag))
    : kindPlaces;
  const sortRows = (rows: Place[]): Place[] => {
    if (!sortByDist || !myLocation) return rows;
    return [...rows].sort((a, b) => {
      const da = a.location ? distanceKm(myLocation, a.location) : Infinity;
      const db2 = b.location ? distanceKm(myLocation, b.location) : Infinity;
      return da - db2;
    });
  };
  const groups = statusOrder
    .map((st) => ({ st, rows: sortRows(filtered.filter((p) => p.status === st)) }))
    .filter((g) => g.rows.length > 0);

  const isFood = kind === 'food';
  const formKind: PlaceKind = form ? (form.kind ?? 'food') : kind;

  return (
    <div className="flex flex-col gap-3 py-5 pb-16">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">口袋名單</h1>
        <button
          className="text-sm font-semibold text-primary disabled:opacity-50"
          onClick={locate}
          disabled={locating}
        >
          {locating ? '定位中…' : myLocation ? '📍 已定位' : '📍 定位計算距離'}
        </button>
      </header>

      {/* kind tabs */}
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-3 p-1">
        {(Object.keys(kindMeta) as PlaceKind[]).map((k) => (
          <button
            key={k}
            onClick={() => {
              setKind(k);
              setTagFilter(null);
            }}
            className={`rounded-lg py-2 text-sm font-semibold ${
              kind === k ? 'bg-primary text-primary-ink' : 'text-ink-2'
            }`}
          >
            {kindMeta[k].emoji} {kindMeta[k].label}
          </button>
        ))}
      </div>

      {geoMsg && (
        <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs font-semibold leading-relaxed text-warning">
          📍 {geoMsg}
        </p>
      )}

      <button
        onClick={() => setEditing('new')}
        className="rounded-2xl bg-primary py-3.5 text-base font-bold text-primary-ink active:opacity-80"
      >
        ＋ 加入{kindMeta[kind].label}口袋名單
      </button>

      {/* filter row: 全部 → 依距離排序 → categories */}
      {kindPlaces.length > 0 && (
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex w-max gap-1.5">
            <button
              onClick={() => setTagFilter(null)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                tagFilter === null ? 'bg-primary text-primary-ink' : 'bg-surface-2 border border-line/60 text-ink-2'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setSortByDist(!sortByDist)}
              disabled={!myLocation}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${
                sortByDist && myLocation ? 'bg-accent text-white' : 'bg-surface-2 border border-line/60 text-ink-2'
              }`}
            >
              📍 依距離排序
            </button>
            {(isFood ? mealOrder : sightOrder).map((t) => {
              const meta = isFood ? mealMeta[t as MealType] : sightMeta[t as SightTag];
              return (
                <button
                  key={t}
                  onClick={() => setTagFilter(tagFilter === t ? null : t)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    tagFilter === t ? 'bg-primary text-primary-ink' : 'bg-surface-2 border border-line/60 text-ink-2'
                  }`}
                >
                  {meta.emoji} {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {kindPlaces.length === 0 && (
        <p className="py-8 text-center text-sm text-ink-3">
          {isFood
            ? '把想吃的餐廳先收進來:訂位、價位、營業時間、菜單連結——到了當地再看距離決定去哪間。'
            : '把想去的景點先收進來:門票、開放時間、必看亮點——行程有空檔時就近安插。'}
        </p>
      )}

      {groups.map(({ st, rows }) => (
        <section key={st} className="flex flex-col gap-2.5">
          <h2 className="text-sm font-bold text-ink-2">
            {statusMeta[st].label}({rows.length})
          </h2>
          {rows.map((p) => {
            const dist =
              myLocation && p.location ? distanceKm(myLocation, p.location) : undefined;
            const tags = isFood
              ? p.mealTypes?.map((m) => `${mealMeta[m].emoji}${mealMeta[m].label}`)
              : p.sightTags?.map((t) => `${sightMeta[t].emoji}${sightMeta[t].label}`);
            return (
              <div key={p.id} className="card p-4">
                <button className="w-full text-left active:opacity-70" onClick={() => setEditing(p)}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold leading-snug">{p.name}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusMeta[p.status].cls}`}>
                      {statusMeta[p.status].label}
                    </span>
                  </div>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-2">
                    {p.myRating && (
                      <span className="font-bold text-warning">⭐ {p.myRating}/5</span>
                    )}
                    {tags && tags.length > 0 && <span>{tags.join(' ')}</span>}
                    {p.needsReservation !== undefined && (
                      <span className={p.needsReservation ? 'font-semibold text-warning' : ''}>
                        {p.needsReservation ? '📞 需預約' : '免預約'}
                      </span>
                    )}
                    {isFood && p.cardAccepted !== undefined && (
                      <span>{p.cardAccepted ? '💳 可刷卡' : '💴 僅現金'}</span>
                    )}
                    {p.queueNote && <span>🕰 {p.queueNote}</span>}
                    {p.priceRange && <span>💴 {p.priceRange}</span>}
                    {p.hours && <span>🕐 {p.hours}</span>}
                    {dist !== undefined && (
                      <span className="font-semibold text-accent">
                        📍 直線約 {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
                      </span>
                    )}
                  </p>
                  {p.recommended && (
                    <p className="mt-1 text-xs font-semibold text-primary">
                      👍 {isFood ? '推薦' : '必看'}:{p.recommended}
                    </p>
                  )}
                  {p.note && <p className="mt-1 text-xs text-ink-3">{p.note}</p>}
                </button>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <a
                    href={gmapsDirectionsUrl({
                      destination: p.location ?? p.name,
                      origin: myLocation ?? undefined,
                      mode: 'transit',
                    })}
                    target="_blank" rel="noreferrer"
                    className="rounded-full bg-surface-3 px-3 py-1.5 text-xs font-semibold text-ink-2 active:opacity-70"
                  >
                    🧭 路線
                  </a>
                  <a
                    href={p.location ? gmapsSearchUrl(`${p.location.lat},${p.location.lng}`) : gmapsSearchUrl(p.name)}
                    target="_blank" rel="noreferrer"
                    className="rounded-full bg-surface-3 px-3 py-1.5 text-xs font-semibold text-ink-2 active:opacity-70"
                  >
                    🗺️ 地點
                  </a>
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(`${p.name} 評論`)}`}
                    target="_blank" rel="noreferrer"
                    className="rounded-full bg-surface-3 px-3 py-1.5 text-xs font-semibold text-ink-2 active:opacity-70"
                  >
                    💬 評論
                  </a>
                  {p.webUrl && (
                    <a href={p.webUrl} target="_blank" rel="noreferrer"
                      className="rounded-full bg-surface-3 px-3 py-1.5 text-xs font-semibold text-ink-2 active:opacity-70">
                      🔗 官網/介紹
                    </a>
                  )}
                  {p.menuUrl && (
                    <a href={p.menuUrl} target="_blank" rel="noreferrer"
                      className="rounded-full bg-surface-3 px-3 py-1.5 text-xs font-semibold text-ink-2 active:opacity-70">
                      📖 菜單
                    </a>
                  )}
                  {p.status !== 'scheduled' && (
                    <button
                      onClick={() => setScheduling(p)}
                      className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-ink active:opacity-80"
                    >
                      📅 排入行程
                    </button>
                  )}
                  {p.status !== 'chosen' && p.status !== 'scheduled' && (
                    <button
                      onClick={() => placeRepository.setStatus(p.id, 'chosen')}
                      className="rounded-full bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary active:opacity-70"
                    >
                      ✓ 選定
                    </button>
                  )}
                  {p.status !== 'candidate' && (
                    <button
                      onClick={() => placeRepository.setStatus(p.id, 'candidate')}
                      className="rounded-full bg-surface-3 px-3 py-1.5 text-xs font-semibold text-ink-2 active:opacity-70"
                    >
                      ↩ 回備選
                    </button>
                  )}
                  {p.status !== 'visited' && (
                    <button
                      onClick={() => placeRepository.setStatus(p.id, 'visited')}
                      className="rounded-full bg-success/15 px-3 py-1.5 text-xs font-semibold text-success active:opacity-70"
                    >
                      去過了
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ))}

      {/* add / edit sheet */}
      <BottomSheet
        open={editing !== null && form !== null}
        onClose={() => setEditing(null)}
        title={
          editing === 'new'
            ? `加入${kindMeta[kind].label}口袋名單`
            : `編輯${kindMeta[formKind].label}`
        }
      >
        {form && (
          <div className="flex flex-col gap-3">
            {editing === 'new' && (
              <div className="rounded-xl bg-surface-3 p-3">
                <label className="text-xs font-semibold text-ink-2">
                  ⚡ 懶人匯入:貼上 Google Maps 完整連結,自動帶入名稱與座標
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    value={gmLink}
                    onChange={(e) => setGmLink(e.target.value)}
                    placeholder="https://www.google.com/maps/place/…"
                    className="min-w-0 flex-1 rounded-xl border border-line bg-surface p-2.5 text-sm outline-none focus:border-primary"
                  />
                  <button
                    disabled={!gmLink.trim()}
                    onClick={() => {
                      const parsed = parseGoogleMapsUrl(gmLink);
                      if (!parsed) {
                        setGmLinkMsg(
                          /goo\.gl|maps\.app/i.test(gmLink)
                            ? '這是短連結,無法直接解析。請先在瀏覽器開啟該連結,再從網址列複製完整網址貼入。'
                            : '無法解析這個連結,請確認是 Google Maps 的地點網址。',
                        );
                        return;
                      }
                      setForm((f) => f ? {
                        ...f,
                        name: parsed.name ?? f.name,
                        webUrl: f.webUrl ?? gmLink.trim(),
                      } : f);
                      if (parsed.location) {
                        setCoordsText(`${parsed.location.lat}, ${parsed.location.lng}`);
                      }
                      setGmLinkMsg(
                        parsed.name
                          ? `✅ 已帶入:${parsed.name}${parsed.location ? '(含座標)' : ''}`
                          : '✅ 已帶入座標,名稱請自行填寫。',
                      );
                    }}
                    className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
                  >
                    帶入
                  </button>
                </div>
                {gmLinkMsg && (
                  <p className={`mt-1.5 text-xs ${gmLinkMsg.startsWith('✅') ? 'text-success' : 'text-warning'}`}>
                    {gmLinkMsg}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-ink-2">
                {formKind === 'food' ? '店名' : '景點名稱'}
              </label>
              <input className={input} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={formKind === 'food' ? '例如:たこ家道頓堀くくる' : '例如:teamLab Botanical Garden'} />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-2">分類(可複選)</label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {formKind === 'food'
                  ? mealOrder.map((m) => {
                      const on = form.mealTypes?.includes(m) ?? false;
                      return (
                        <button
                          key={m}
                          onClick={() =>
                            setForm({
                              ...form,
                              mealTypes: on
                                ? (form.mealTypes ?? []).filter((x) => x !== m)
                                : [...(form.mealTypes ?? []), m],
                            })
                          }
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                            on ? 'bg-accent text-white' : 'bg-surface-3 text-ink-2'
                          }`}
                        >
                          {mealMeta[m].emoji} {mealMeta[m].label}
                        </button>
                      );
                    })
                  : sightOrder.map((t) => {
                      const on = form.sightTags?.includes(t) ?? false;
                      return (
                        <button
                          key={t}
                          onClick={() =>
                            setForm({
                              ...form,
                              sightTags: on
                                ? (form.sightTags ?? []).filter((x) => x !== t)
                                : [...(form.sightTags ?? []), t],
                            })
                          }
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                            on ? 'bg-accent text-white' : 'bg-surface-3 text-ink-2'
                          }`}
                        >
                          {sightMeta[t].emoji} {sightMeta[t].label}
                        </button>
                      );
                    })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-2">個人評分(去過後填,點星星)</label>
              <div className="mt-1 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() =>
                      setForm({ ...form, myRating: form.myRating === n ? undefined : n })
                    }
                    className={`text-2xl ${((form.myRating ?? 0) >= n) ? '' : 'opacity-25 grayscale'}`}
                  >
                    ⭐
                  </button>
                ))}
                {form.myRating && (
                  <span className="ml-1 text-sm font-bold text-ink-2">{form.myRating}/5</span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {([[true, '📞 需預約'], [false, '免預約'], [undefined, '不確定']] as const).map(([v, label]) => (
                <button
                  key={label}
                  onClick={() => setForm({ ...form, needsReservation: v })}
                  className={`flex-1 rounded-xl py-2 text-xs font-semibold ${
                    form.needsReservation === v ? 'bg-primary text-primary-ink' : 'bg-surface-3 text-ink-2'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {formKind === 'food' && (
              <div className="flex gap-2">
                {([[true, '💳 可刷卡'], [false, '僅現金'], [undefined, '不確定']] as const).map(([v, label]) => (
                  <button
                    key={label}
                    onClick={() => setForm({ ...form, cardAccepted: v })}
                    className={`flex-1 rounded-xl py-2 text-xs font-semibold ${
                      form.cardAccepted === v ? 'bg-primary text-primary-ink' : 'bg-surface-3 text-ink-2'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-ink-2">
                  {formKind === 'food' ? '推薦料理(選填)' : '必看亮點(選填)'}
                </label>
                <input className={input} value={form.recommended ?? ''}
                  onChange={(e) => setForm({ ...form, recommended: e.target.value })}
                  placeholder={formKind === 'food' ? '章魚燒、明太子玉子燒' : '千本鳥居、山頂展望'} />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-2">排隊時間(選填)</label>
                <input className={input} value={form.queueNote ?? ''}
                  onChange={(e) => setForm({ ...form, queueNote: e.target.value })}
                  placeholder="平日15分,假日30分+" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-ink-2">
                  {formKind === 'food' ? '價位(選填)' : '門票/價位(選填)'}
                </label>
                <input className={input} value={form.priceRange ?? ''}
                  onChange={(e) => setForm({ ...form, priceRange: e.target.value })}
                  placeholder={formKind === 'food' ? '¥1,000-2,000/人' : '成人¥400,兒童¥200'} />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-2">營業/開放時間(選填)</label>
                <input className={input} value={form.hours ?? ''}
                  onChange={(e) => setForm({ ...form, hours: e.target.value })}
                  placeholder="09:00-17:00 週三休" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-2">官網/介紹連結(選填)</label>
              <input className={input} type="url" value={form.webUrl ?? ''}
                onChange={(e) => setForm({ ...form, webUrl: e.target.value })}
                placeholder="https://…" />
            </div>
            {formKind === 'food' && (
              <div>
                <label className="text-xs font-semibold text-ink-2">菜單連結(選填)</label>
                <input className={input} type="url" value={form.menuUrl ?? ''}
                  onChange={(e) => setForm({ ...form, menuUrl: e.target.value })}
                  placeholder="https://…" />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-ink-2">
                座標(選填,可算距離)— Google Maps 長按地點複製「緯度, 經度」貼上
              </label>
              <input className={input} value={coordsText}
                onChange={(e) => setCoordsText(e.target.value)}
                placeholder="34.6687, 135.5013" />
              {coordsText.trim() !== '' && !parseCoords(coordsText) && (
                <p className="mt-1 text-xs text-danger">格式不正確,範例:34.6687, 135.5013</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-2">備註(選填)</label>
              <textarea rows={2} className={input} value={form.note ?? ''}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder={formKind === 'food' ? '招牌菜、注意事項…' : '注意事項、交通方式…'} />
            </div>

            <button
              disabled={!form.name.trim()}
              onClick={save}
              className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
            >
              儲存
            </button>
            {editing !== 'new' && editing !== null && (
              <button
                className="text-sm font-semibold text-danger active:opacity-70"
                onClick={() => doDelete(editing)}
              >
                從名單移除
              </button>
            )}
          </div>
        )}
      </BottomSheet>

      {scheduling && (
        <SchedulePlaceSheet place={scheduling} trip={trip} onClose={() => setScheduling(null)} />
      )}

      {/* delete-undo snackbar */}
      {undoPlace && (
        <div className="fixed inset-x-0 bottom-16 z-50 flex justify-center px-4 pb-safe">
          <div className="flex w-full max-w-lg items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-surface shadow-card">
            <span className="min-w-0 flex-1 truncate text-sm">已移除「{undoPlace.name}」</span>
            <button
              onClick={undo}
              className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-primary-ink active:opacity-80"
            >
              還原
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
