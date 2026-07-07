import { useEffect, useState } from 'react';

interface Phrase { id: string; jp: string; zh: string }

const PRESETS: Array<{ group: string; items: Array<{ jp: string; zh: string }> }> = [
  {
    group: '🙏 基本',
    items: [
      { jp: 'すみません', zh: '不好意思/請問' },
      { jp: 'ありがとうございます', zh: '謝謝' },
      { jp: 'トイレはどこですか?', zh: '請問廁所在哪裡?' },
      { jp: '日本語がわかりません', zh: '我不會日文' },
      { jp: '写真を撮ってもらえますか?', zh: '可以幫我們拍照嗎?' },
    ],
  },
  {
    group: '🍜 餐廳',
    items: [
      { jp: '4人です', zh: '4 位' },
      { jp: 'おすすめは何ですか?', zh: '有什麼推薦的?' },
      { jp: 'これをください', zh: '請給我這個(指菜單)' },
      { jp: '子供用の椅子はありますか?', zh: '有兒童椅嗎?' },
      { jp: 'お会計お願いします', zh: '麻煩結帳' },
      { jp: 'パクチー抜きでお願いします', zh: '請不要放香菜' },
    ],
  },
  {
    group: '🛍️ 購物',
    items: [
      { jp: 'カードは使えますか?', zh: '可以刷卡嗎?' },
      { jp: '免税できますか?', zh: '可以免稅嗎?' },
      { jp: 'これの色違いはありますか?', zh: '這個有別的顏色嗎?' },
      { jp: '袋をください', zh: '請給我袋子' },
    ],
  },
  {
    group: '🚃 交通',
    items: [
      { jp: 'この電車は京都に行きますか?', zh: '這班車有到京都嗎?' },
      { jp: '〇〇までお願いします', zh: '(計程車)麻煩到〇〇' },
      { jp: 'ここで降ります', zh: '我要在這裡下車' },
    ],
  },
  {
    group: '🆘 緊急',
    items: [
      { jp: '助けてください!', zh: '請幫幫我!' },
      { jp: '病院はどこですか?', zh: '醫院在哪裡?' },
      { jp: '子供がいなくなりました', zh: '我的小孩不見了' },
      { jp: '警察を呼んでください', zh: '請幫我叫警察' },
    ],
  },
];

const CUSTOM_KEY = 'travelos2-custom-phrases';

function loadCustom(): Phrase[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? '[]') as Phrase[];
  } catch {
    return [];
  }
}

export default function PhrasesPage() {
  const [custom, setCustom] = useState<Phrase[]>([]);
  const [viewer, setViewer] = useState<{ jp: string; zh: string } | null>(null);
  const [jp, setJp] = useState('');
  const [zh, setZh] = useState('');

  useEffect(() => setCustom(loadCustom()), []);

  const saveCustom = (list: Phrase[]) => {
    setCustom(list);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
  };

  const PhraseBtn = ({ p, onDelete }: { p: { jp: string; zh: string }; onDelete?: () => void }) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setViewer(p)}
        className="min-w-0 flex-1 rounded-xl bg-surface-2 border border-line/60 p-3 text-left active:opacity-70"
      >
        <span className="block truncate text-sm font-bold">{p.jp}</span>
        <span className="block truncate text-xs text-ink-3">{p.zh}</span>
      </button>
      {onDelete && (
        <button aria-label="刪除" onClick={onDelete} className="shrink-0 p-1.5 text-ink-3 active:text-danger">
          ✕
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 py-5">
      <div>
        <h1 className="text-2xl font-bold">🈺 溝通小卡</h1>
        <p className="mt-0.5 text-xs text-ink-3">全部離線可用。點任一句 → 放大全螢幕直接給對方看。</p>
      </div>

      <section className="card p-4">
        <h2 className="text-sm font-bold">⭐ 我的常用句</h2>
        <div className="mt-2 flex flex-col gap-2">
          {custom.map((p) => (
            <PhraseBtn key={p.id} p={p} onDelete={() => saveCustom(custom.filter((x) => x.id !== p.id))} />
          ))}
          <div className="rounded-xl border border-dashed border-line p-3">
            <input
              value={jp}
              onChange={(e) => setJp(e.target.value)}
              placeholder="日文/要顯示的句子(必填)"
              className="w-full rounded-xl border border-line bg-surface p-2.5 text-sm outline-none focus:border-primary"
            />
            <input
              value={zh}
              onChange={(e) => setZh(e.target.value)}
              placeholder="中文註解(選填)"
              className="mt-2 w-full rounded-xl border border-line bg-surface p-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              disabled={!jp.trim()}
              onClick={() => {
                saveCustom([...custom, { id: String(Date.now()), jp: jp.trim(), zh: zh.trim() }]);
                setJp('');
                setZh('');
              }}
              className="mt-2 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
            >
              ＋ 加入常用句(僅存此裝置)
            </button>
          </div>
        </div>
      </section>

      {PRESETS.map((g) => (
        <section key={g.group} className="card p-4">
          <h2 className="text-sm font-bold">{g.group}</h2>
          <div className="mt-2 flex flex-col gap-2">
            {g.items.map((p) => <PhraseBtn key={p.jp} p={p} />)}
          </div>
        </section>
      ))}

      {viewer && (
        <button
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-surface p-6"
          onClick={() => setViewer(null)}
        >
          <span className="text-4xl font-bold leading-snug">{viewer.jp}</span>
          {viewer.zh && <span className="text-lg text-ink-2">{viewer.zh}</span>}
          <span className="mt-4 rounded-xl bg-surface-3 px-5 py-2.5 text-sm font-semibold text-ink-2">
            點任意處關閉
          </span>
        </button>
      )}
    </div>
  );
}
