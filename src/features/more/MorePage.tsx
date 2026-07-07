import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTrip } from '@/shared/hooks/useTrip';
import { PartnerSyncCard } from '@/features/more/components/FamilySyncCard';
import { CurrencyConverter } from '@/shared/components/CurrencyConverter';
import { InstallCard } from '@/features/more/components/InstallCard';

const ORDER_KEY = 'travelos2-more-order';
const CARD_IDS = ['sync', 'summary', 'info', 'places', 'packing', 'shopping', 'phrases', 'emergency', 'print', 'converter'] as const;
type CardId = (typeof CARD_IDS)[number];

const cardLabels: Record<CardId, string> = {
  sync: '🤝 夥伴同步',
  info: '📋 旅程資訊',
  places: '🍜⛩️ 餐廳/景點口袋名單',
  packing: '🧳 行李清單',
  shopping: '🛒 血拼清單',
  emergency: '🆘 緊急資訊',
  print: '🖨️ 列印行程表',
  converter: '💱 匯率試算',
  phrases: '🈺 溝通小卡',
  summary: '🏁 旅程總結',
};

function loadOrder(): CardId[] {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as CardId[];
      const valid = saved.filter((id) => (CARD_IDS as readonly string[]).includes(id));
      const missing = CARD_IDS.filter((id) => !valid.includes(id));
      return [...valid, ...missing];
    }
  } catch { /* fall through */ }
  return [...CARD_IDS];
}

function LinkCard({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link to={to} className="card flex items-center justify-between p-5 active:opacity-80">
      <div>
        <h2 className="text-sm font-bold">{title}</h2>
        <p className="mt-0.5 text-xs text-ink-3">{desc}</p>
      </div>
      <span className="text-ink-3">›</span>
    </Link>
  );
}

export default function MorePage() {
  const trip = useTrip();
  const [order, setOrder] = useState<CardId[]>(loadOrder());
  const [editing, setEditing] = useState(false);

  if (!trip) return null;
  const base = `/t/${trip.id}`;

  const move = (id: CardId, dir: -1 | 1) => {
    setOrder((cur) => {
      const idx = cur.indexOf(id);
      const to = idx + dir;
      if (to < 0 || to >= cur.length) return cur;
      const next = [...cur];
      [next[idx], next[to]] = [next[to], next[idx]];
      localStorage.setItem(ORDER_KEY, JSON.stringify(next));
      return next;
    });
  };

  const cards: Record<CardId, ReactNode> = {
    sync: <PartnerSyncCard tripId={trip.id} />,
    info: (
      <LinkCard to={`${base}/info`} title="📋 旅程資訊"
        desc="每日總覽、機場接送、住宿、行前備忘" />
    ),
    places: (
      <LinkCard to={`${base}/places`} title="🍜⛩️ 餐廳/景點口袋名單"
        desc="想吃想去先收藏:預約、價位、亮點、距離一目瞭然,一鍵排入行程" />
    ),
    packing: (
      <LinkCard to={`${base}/packing`} title="🧳 行李清單"
        desc="成員分頁 + 隨身/託運分區,重要物品醒目標示" />
    ),
    shopping: (
      <LinkCard to={`${base}/shopping`} title="🛒 血拼清單"
        desc="藥妝、伴手禮、代購託買——夥伴共享,誰在店裡誰買" />
    ),
    emergency: (
      <LinkCard to={`${base}/emergency`} title="🆘 緊急資訊"
        desc="緊急電話、駐外館處、飯店地址、走散集合點,離線可用" />
    ),
    print: (
      <LinkCard to={`${base}/print`} title="🖨️ 列印行程表"
        desc="A4 全程行程表,列印或存 PDF 備援" />
    ),
    phrases: (
      <LinkCard to={`${base}/phrases`} title="🈺 溝通小卡"
        desc="常用日文句 + 自訂句,點了放大給店員看,離線可用" />
    ),
    summary: (
      <LinkCard to={`${base}/summary`} title="🏁 旅程總結"
        desc="花費統計、成員分帳結算、行程足跡、美食榜、日記——隨時可看" />
    ),
    converter: <CurrencyConverter />,
  };

  return (
    <div className="flex flex-col gap-4 py-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">更多</h1>
        <button
          onClick={() => setEditing(!editing)}
          className={`text-sm font-semibold ${editing ? 'text-success' : 'text-primary'}`}
        >
          {editing ? '✓ 完成' : '⇅ 調整排序'}
        </button>
      </header>

      {order.map((id) => (
        <div key={id} className="relative">
          {editing && (
            <div className="mb-1 flex items-center justify-between rounded-xl bg-surface-3 px-3 py-1.5">
              <span className="text-xs font-semibold text-ink-2">{cardLabels[id]}</span>
              <span className="flex gap-1">
                <button aria-label="上移" onClick={() => move(id, -1)}
                  className="rounded-lg bg-surface-2 px-3 py-1 text-sm font-bold text-ink-2 active:opacity-70">↑</button>
                <button aria-label="下移" onClick={() => move(id, 1)}
                  className="rounded-lg bg-surface-2 px-3 py-1 text-sm font-bold text-ink-2 active:opacity-70">↓</button>
              </span>
            </div>
          )}
          {cards[id]}
        </div>
      ))}

      <InstallCard />

      <p className="text-center text-xs text-ink-3">
        Travel OS 2 · 排序僅存於此裝置,不會同步 · 主題設定在旅程列表 ⚙️
      </p>
    </div>
  );
}
