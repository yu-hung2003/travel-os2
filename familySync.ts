import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTrip } from '@/shared/hooks/useTrip';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { tripRepository } from '@/data/repositories/tripRepository';
import { placeRepository } from '@/data/repositories/placeRepository';
import { typeMeta } from '@/features/timeline/eventMeta';
import { gmapsDirectionsUrl, parseCoords, parseGoogleMapsUrl } from '@/shared/utils/maps';
import { eventRepository } from '@/data/repositories/eventRepository';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { useOnline } from '@/shared/hooks/useOnline';
import type { GeoPoint } from '@/domain/types';

interface Pin {
  id: string;
  point: GeoPoint;
  emoji: string;
  title: string;
  subtitle?: string;
}

interface InventoryRow {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  hasCoords: boolean;
  hint: string; // how to add coords when missing
  source: 'event' | 'acc' | 'place';
  rawId: string;
  dayId?: string; // events: jump target
}

function emojiIcon(emoji: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:34px;height:34px;border-radius:50%;
      background:rgb(var(--c-surface-2));
      border:2px solid rgb(var(--c-primary));
      box-shadow:0 2px 8px rgb(0 0 0 / .25);
      display:flex;align-items:center;justify-content:center;
      font-size:17px;line-height:1;">${emoji}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

function FitBounds({ pins }: { pins: Pin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    const bounds = L.latLngBounds(pins.map((p) => [p.point.lat, p.point.lng]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
  }, [map, pins]);
  return null;
}

export default function MapPage() {
  const online = useOnline();

  const trip = useTrip();

  const [showList, setShowList] = useState(false);
  const [editingRow, setEditingRow] = useState<InventoryRow | null>(null);
  const [coordInput, setCoordInput] = useState('');
  const [coordMsg, setCoordMsg] = useState<string | null>(null);

  const saveCoords = async () => {
    if (!editingRow) return;
    const text = coordInput.trim();
    const point = parseCoords(text) ?? parseGoogleMapsUrl(text)?.location;
    if (!point) {
      setCoordMsg('無法解析。可貼「34.6687, 135.5013」格式,或 Google Maps 完整連結(短連結請先開啟後複製完整網址)。');
      return;
    }
    const { placeRepository: placeRepo } = await import('@/data/repositories/placeRepository');
    if (editingRow.source === 'event') {
      await eventRepository.updateInfo(editingRow.rawId, { location: point });
    } else if (editingRow.source === 'place') {
      await placeRepo.update(editingRow.rawId, { location: point });
    } else {
      await tripRepository.updateAccommodationLocation(editingRow.rawId, point);
    }
    setEditingRow(null);
    setCoordInput('');
    setCoordMsg(null);
  };

  const data = useLiveQuery(async () => {
    if (!trip) return { pins: [] as Pin[], inventory: [] as InventoryRow[] };
    const [allEvents, days, accommodations, places] = await Promise.all([
      tripRepository.listTripEvents(trip.id),
      tripRepository.listDays(trip.id),
      tripRepository.listAccommodations(trip.id),
      placeRepository.list(trip.id),
    ]);
    const dayIndex = new Map(days.map((d) => [d.id, d.dayIndex]));
    const activeVersion = new Map(days.map((d) => [d.id, d.activeVersionId]));
    // show only each day's active version
    const events = allEvents.filter((e) => {
      const v = activeVersion.get(e.dayId);
      return !v || (e.versionId ?? '') === v;
    });

    const out: Pin[] = [];
    const inventory: InventoryRow[] = [];

    for (const e of events) {
      // transport cards are routes, not point places — skip in inventory
      if (e.type === 'transport') continue;
      const subtitle = `Day ${dayIndex.get(e.dayId) ?? '?'}${e.startTime ? ` · ${e.startTime}` : ''}`;
      inventory.push({
        id: `ev-${e.id}`,
        emoji: typeMeta[e.type].emoji,
        title: e.title,
        subtitle,
        hasCoords: !!e.location,
        hint: '貼上座標或 Google Maps 連結即可',
        source: 'event',
        rawId: e.id,
        dayId: e.dayId,
      });
      if (e.location) {
        out.push({
          id: `ev-${e.id}`,
          point: e.location,
          emoji: typeMeta[e.type].emoji,
          title: e.title,
          subtitle,
        });
      }
    }
    for (const a of accommodations) {
      inventory.push({
        id: `acc-${a.id}`,
        emoji: '🏨',
        title: a.name,
        subtitle: '住宿',
        hasCoords: !!a.location,
        hint: '貼上座標或 Google Maps 連結即可',
        source: 'acc',
        rawId: a.id,
      });
      if (a.location) {
        out.push({ id: `acc-${a.id}`, point: a.location, emoji: '🏨', title: a.name, subtitle: '住宿' });
      }
    }
    for (const p of places) {
      const emoji = p.kind === 'sight' ? '⛩️' : '🍜';
      inventory.push({
        id: `pl-${p.id}`,
        emoji,
        title: p.name,
        subtitle: `口袋名單${p.priceRange ? ` · ${p.priceRange}` : ''}`,
        hasCoords: !!p.location,
        hint: '貼上座標或 Google Maps 連結即可',
        source: 'place',
        rawId: p.id,
      });
      if (p.location) {
        out.push({
          id: `pl-${p.id}`,
          point: p.location,
          emoji,
          title: p.name,
          subtitle: `口袋名單${p.priceRange ? ` · ${p.priceRange}` : ''}`,
        });
      }
    }
    return { pins: out, inventory };
  }, [trip?.id]);

  if (!trip || !data) return null;
  const { pins, inventory } = data;
  const missing = inventory.filter((r) => !r.hasCoords);

  return (
    <div className="flex h-full flex-col gap-3 py-5">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">地圖</h1>
        <span className="text-xs text-ink-3">{pins.length} 個地點</span>
      </header>

      {!online && (
        <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs font-semibold text-warning">
          離線中:地圖底圖需要網路,地點清單與導航連結仍可使用。
        </p>
      )}

      <div className="card min-h-[420px] flex-1 overflow-hidden">
        <MapContainer
          center={[34.85, 135.6]}
          zoom={10}
          className="h-full min-h-[420px] w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds pins={pins} />
          {pins.map((p) => (
            <Marker key={p.id} position={[p.point.lat, p.point.lng]} icon={emojiIcon(p.emoji)}>
              <Popup>
                <div style={{ minWidth: 140 }}>
                  <p style={{ fontWeight: 700, margin: 0 }}>{p.emoji} {p.title}</p>
                  {p.subtitle && (
                    <p style={{ margin: '2px 0 6px', fontSize: 12, opacity: 0.7 }}>{p.subtitle}</p>
                  )}
                  <a
                    href={gmapsDirectionsUrl({ destination: p.point })}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 13, fontWeight: 700 }}
                  >
                    🧭 導航前往
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <button
        onClick={() => setShowList(!showList)}
        className="rounded-2xl border border-line/60 bg-surface-2 py-3 text-sm font-semibold text-ink-2 active:bg-surface-3"
      >
        📋 地點清單({inventory.length})
        {missing.length > 0 && (
          <span className="ml-1.5 text-warning">⚠️ {missing.length} 個未設座標</span>
        )}
        <span className="ml-1.5 text-ink-3">{showList ? '▲ 收合' : '▼ 展開'}</span>
      </button>

      {showList && (
        <section className="card p-4">
          <p className="text-xs text-ink-3">
            清單即時包含行程(啟用中版本)、住宿與口袋名單的所有地點;之後新加入的項目會自動出現。
            未設座標的項目補上座標後即會顯示於地圖。
          </p>
          <ul className="mt-2 divide-y divide-line/60">
            {[...inventory].sort((a, b) => Number(a.hasCoords) - Number(b.hasCoords)).map((r) => (
              <li key={r.id}>
                <button
                  className="flex w-full items-start gap-3 py-2.5 text-left active:opacity-70"
                  onClick={() => {
                    setEditingRow(r);
                    setCoordInput('');
                    setCoordMsg(null);
                  }}
                >
                  <span className="text-lg">{r.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-snug">{r.title}</span>
                    <span className="block text-xs text-ink-3">{r.subtitle}</span>
                    {!r.hasCoords && (
                      <span className="mt-0.5 block text-xs text-warning">點擊補座標:{r.hint}</span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      r.hasCoords ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                    }`}
                  >
                    {r.hasCoords ? '✅ 已在地圖' : '⚠️ 未設座標'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <BottomSheet
        open={editingRow !== null}
        onClose={() => setEditingRow(null)}
        title={editingRow ? `${editingRow.emoji} ${editingRow.title}` : ''}
      >
        {editingRow && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-ink-3">
              {editingRow.hasCoords ? '修改座標:' : '補上座標:'}
              貼「緯度, 經度」(Google Maps 長按地點複製)或 Google Maps 完整連結。
            </p>
            <input
              value={coordInput}
              onChange={(e) => setCoordInput(e.target.value)}
              placeholder="34.6687, 135.5013 或 https://www.google.com/maps/place/…"
              className="w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary"
            />
            {coordMsg && <p className="text-xs text-danger">{coordMsg}</p>}
            <button
              disabled={!coordInput.trim()}
              onClick={saveCoords}
              className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
            >
              儲存座標
            </button>
            {editingRow.source === 'event' && editingRow.dayId && (
              <Link
                to={`/t/${trip.id}/timeline?day=${editingRow.dayId}`}
                className="rounded-xl bg-surface-3 py-3 text-center text-sm font-semibold text-ink-2 active:opacity-70"
              >
                ↗ 前往行程頁編輯此事件
              </Link>
            )}
            {editingRow.source === 'place' && (
              <Link
                to={`/t/${trip.id}/places`}
                className="rounded-xl bg-surface-3 py-3 text-center text-sm font-semibold text-ink-2 active:opacity-70"
              >
                ↗ 前往口袋名單編輯
              </Link>
            )}
          </div>
        )}
      </BottomSheet>

      <p className="text-center text-xs text-ink-3">
        行程景點・住宿・口袋名單自動上圖;點 marker 可直接導航
      </p>
    </div>
  );
}
