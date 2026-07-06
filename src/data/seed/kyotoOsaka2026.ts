import type {
  Trip, TripDay, TimelineEvent, Accommodation,
  EventType, TransitInfo, DayVersion,
} from '@/domain/types';

/* ---------------------------------------------------------------
   Seed · 2026 京阪夏日深度 7天6夜 家族旅行
   IDs are deterministic ('ko26-*') so seeding is idempotent and
   easy to debug. User edits after import are never overwritten.
---------------------------------------------------------------- */

const TRIP_ID = 'ko26';
const now = () => Date.now();

export const kyotoOsakaTrip: Trip = {
  id: TRIP_ID,
  title: '2026 京阪夏日深度遊',
  destination: '京都・大阪',
  timezone: 'Asia/Tokyo',
  startDate: '2026-08-08',
  endDate: '2026-08-14',
  currency: 'JPY',
  homeCurrency: 'TWD',
  travelers: [
    { id: 'ko26-t1', name: '大人 1', isChild: false },
    { id: 'ko26-t2', name: '大人 2', isChild: false },
    { id: 'ko26-t3', name: '大人 3', isChild: false },
    { id: 'ko26-t4', name: '小學生', isChild: true },
  ],
  status: 'upcoming',
  coverEmoji: '🎌',
  note:
    '交通策略:全程一人一張 IC 卡(ICOCA/Suica)嗶卡進出,搭配單買 HARUKA 電子車票與南海電鐵臨空城停留券。\n' +
    '⚠️ 盛夏防暑:8 月關西體感 38°C+,每日 11:00-15:00 盡量安排室內行程,攜帶防曬乳、遮陽傘、手持電風扇。\n' +
    '⚠️ 盂蘭盆節(Obon)連假人潮多,行程採定點放射狀規劃、減少跨區移動。\n' +
    '⚠️ 兒童票(滿6歲未滿12歲)為成人半價;實體 ICOCA 需臨櫃申辦兒童專用卡(查驗護照)。\n' +
    '⚠️ 2025-2026 退稅新制:出境前於機場退稅櫃檯統一退稅,請提早抵達機場辦理海關驗證。',
  createdAt: now(),
  updatedAt: now(),
};

export const kyotoOsakaAccommodations: Accommodation[] = [
  {
    id: 'ko26-acc-kyoto',
    tripId: TRIP_ID,
    name: '京都五條假日酒店(Holiday Inn Kyoto Gojo)',
    address: '179 Higashikazariyacho, Shimogyo Ward, Kyoto 600-8107',
    location: { lat: 34.9967, lng: 135.7589 },
    checkInDate: '2026-08-08',
    checkOutDate: '2026-08-10',
    note: '共 2 晚。近地下鐵五條站;座標為約略位置,可於地圖確認微調。',
  },
  {
    id: 'ko26-acc-osaka',
    tripId: TRIP_ID,
    name: '大阪蒙特利格斯米爾飯店 Hotel Monterey Grasmere Osaka',
    address: '大阪・難波',
    location: { lat: 34.6602, lng: 135.5006 },
    checkInDate: '2026-08-10',
    checkOutDate: '2026-08-14',
    note: '共 4 晚。難波站地下連通道直達。',
  },
];

/* ---- day definitions ---- */

interface SeedEvent {
  type: EventType;
  title: string;
  startTime?: string;
  endTime?: string;
  placeName?: string;
  location?: { lat: number; lng: number };
  transit?: TransitInfo;
  costEstimate?: number;
  note?: string;
  alert?: string;
}

interface SeedDay {
  date: string;
  title: string;
  accommodationId?: string;
  note?: string;
  events: SeedEvent[];
}

const seedDays: SeedDay[] = [
  {
    date: '2026-08-08',
    title: '台灣 → 關西機場 → 京都(市區購物與燒肉)',
    accommodationId: 'ko26-acc-kyoto',
    events: [
      {
        type: 'flight',
        title: '抵達關西機場(KIX)・入境',
        startTime: '12:00', endTime: '13:00',
        placeName: '關西國際機場',
        note: '辦理入境手續、領取行李。',
      },
      {
        type: 'transport',
        title: '機場利木津巴士 → 京都車站八條口',
        startTime: '13:10', endTime: '14:40',
        transit: {
          mode: 'bus',
          line: '關西機場利木津巴士(關西空港交通/京阪巴士/JR西日本巴士聯營)',
          from: '關西機場 T1', to: '京都車站八條口',
          station: '第一航廈1樓 8號巴士站牌(T2為2號站牌)',
          durationMin: 90,
          farePerAdult: 2600, fareNote: '兒童(小學生)¥1,300',
        },
        note: '大行李交給隨車服務人員並領取行李兌換牌,上車一路睡到京都,免推行李轉車。行經高速公路,連假尖峰可能稍有延遲。',
        alert: '建議先於站牌旁自動售票機購買實體票,或提前網路購買電子券(亦可直接刷 ICOCA 上車)。',
      },
      {
        type: 'transport',
        title: '計程車 八條口 → 飯店',
        startTime: '14:45', endTime: '15:00',
        transit: {
          mode: 'taxi',
          from: '京都車站八條口', to: '京都五條假日酒店',
          station: '八條口計程車搭乘處',
          durationMin: 10,
          farePerAdult: 1500, fareNote: '總價約 ¥1,200-1,800,三位大人分攤划算',
        },
        note: '全家完全不需拉行李擠地鐵或公車。',
      },
      {
        type: 'hotel',
        title: '京都五條假日酒店 Check-in・置放行李',
        startTime: '15:00', endTime: '15:30',
        placeName: '京都五條假日酒店(Holiday Inn Kyoto Gojo)',
        location: { lat: 34.9967, lng: 135.7589 },
      },
      {
        type: 'transport',
        title: '步行前往河原町商圈',
        startTime: '15:40', endTime: '16:00',
        transit: { mode: 'walk', from: '飯店(五條)', to: '河原町商圈', walkMin: 20, farePerAdult: 0 },
      },
      {
        type: 'shopping',
        title: '河原町商圈:Loft 京都店 + Uniqlo 關西旗艦店',
        startTime: '16:00', endTime: '18:30',
        placeName: 'MINA 京都(Loft B1-4F・Uniqlo 5-6F)',
        note: '吹冷氣購物,同一棟解決。',
      },
      {
        type: 'food',
        title: '晚餐:本格燒肉 チファジャ',
        startTime: '19:00', endTime: '21:00',
        note: '京都高 CP 值國產牛燒肉吃到飽。',
        alert: '週末夜間極為熱門,務必提早 1-2 週透過官網預訂座位!',
      },
    ],
  },
  {
    date: '2026-08-09',
    title: '宇治 → 伏見稻荷 → 清水寺經典漫步',
    accommodationId: 'ko26-acc-kyoto',
    events: [
      {
        type: 'transport',
        title: '地下鐵五條 → 京都站 → JR 奈良線至宇治',
        startTime: '08:30', endTime: '09:10',
        transit: {
          mode: 'train', line: '地下鐵烏丸線(¥220)+ JR 奈良線 區間快速(¥240)',
          from: '五條站', to: '宇治站', durationMin: 40, farePerAdult: 460, fareNote: '兒童半價',
        },
      },
      {
        type: 'sight',
        title: '宇治茶鄉散策',
        startTime: '09:10', endTime: '11:30',
        placeName: '宇治橋・平等院表參道',
        location: { lat: 34.8894, lng: 135.8077 },
        note: '品嚐正宗宇治抹茶點心與冰品。',
      },
      {
        type: 'transport',
        title: 'JR 奈良線 宇治 → 稻荷',
        startTime: '11:30', endTime: '12:00',
        transit: { mode: 'train', line: 'JR 奈良線', from: '宇治站', to: '稻荷站', durationMin: 20, farePerAdult: 240, fareNote: '兒童半價' },
      },
      {
        type: 'sight',
        title: '伏見稻荷大社・千本鳥居',
        startTime: '12:00', endTime: '14:00',
        location: { lat: 34.9671, lng: 135.7727 },
        note: '中午在周邊商店街享用狐狸烏龍麵與稻荷壽司。',
      },
      {
        type: 'transport',
        title: '京阪電車 + 計程車上山至清水寺',
        startTime: '14:00', endTime: '14:30',
        transit: {
          mode: 'taxi', line: '京阪電車 伏見稻荷 → 清水五條(10分,¥220)+ 計程車(約10分,約¥1,000)',
          from: '伏見稻荷站', to: '清水寺', durationMin: 30,
        },
        alert: '交通優化:改搭計程車上山,避免盛夏烈日下排隊擠公車。',
      },
      {
        type: 'sight',
        title: '清水寺・二三年坂經典散策',
        startTime: '14:30', endTime: '17:30',
        location: { lat: 34.9949, lng: 135.785 },
        note: '參觀清水大舞台,沿清水坂、二年坂、三年坂古風街道漫遊。',
        alert: '清水寺夏季常規開放至 18:30。',
      },
      {
        type: 'food',
        title: '晚餐:祇園/河原町一帶',
        startTime: '18:00',
        note: '晚餐後步行回飯店。',
      },
    ],
  },
  {
    date: '2026-08-10',
    title: '嵐山 → 大飯店轉移(京都 → 大阪難波)',
    accommodationId: 'ko26-acc-osaka',
    events: [
      {
        type: 'transport',
        title: 'JR 嵯峨野線 → 嵯峨嵐山',
        startTime: '08:30', endTime: '09:00',
        transit: { mode: 'train', line: 'JR 嵯峨野線', from: '京都站', to: '嵯峨嵐山站', durationMin: 17, farePerAdult: 240, fareNote: '兒童半價' },
      },
      {
        type: 'sight',
        title: '嵐山大自然之旅',
        startTime: '09:00', endTime: '13:30',
        placeName: '竹林小徑・野宮神社・渡月橋',
        location: { lat: 35.0094, lng: 135.6668 },
        note: '中午於嵐山大街享用特色料理。',
      },
      {
        type: 'transport',
        title: '返京都車站・回飯店取行李',
        startTime: '13:30', endTime: '14:30',
        transit: { mode: 'train', line: 'JR 嵯峨野線', from: '嵯峨嵐山站', to: '京都站→飯店', durationMin: 60 },
      },
      {
        type: 'transport',
        title: '跨縣大移動:京都 → 大阪難波',
        startTime: '14:30', endTime: '15:30',
        transit: {
          mode: 'train',
          line: 'JR 京都線 新快速 京都→梅田(29分,¥580)→ 御堂筋線 梅田→難波(9分,¥240)',
          from: '京都站', to: '難波站', durationMin: 60, farePerAdult: 820, fareNote: '兒童半價',
        },
        note: '梅田不出站直接轉乘御堂筋線;難波出站經地下連通道直通飯店。',
      },
      {
        type: 'hotel',
        title: 'Hotel Monterey Grasmere Osaka Check-in',
        startTime: '15:30', endTime: '16:00',
        placeName: '大阪蒙特利格斯米爾飯店(難波)',
      },
      {
        type: 'rest',
        title: '難波自由時間',
        startTime: '16:00',
        note: '熟悉飯店周邊環境,輕鬆晚餐,儲備隔天體力。',
      },
    ],
  },
  {
    date: '2026-08-11',
    title: 'KKday 天橋立、美山町一日遊(專車行程)',
    accommodationId: 'ko26-acc-osaka',
    events: [
      {
        type: 'transport',
        title: '御堂筋線 難波 → 梅田・前往集合點',
        startTime: '07:15', endTime: '07:30',
        transit: { mode: 'subway', line: '地下鐵御堂筋線', from: '難波站', to: '梅田站', durationMin: 9, farePerAdult: 240, fareNote: '兒童半價' },
        note: '步行前往 KKday 指定集合地點(依行程憑證為準)。',
      },
      {
        type: 'sight',
        title: '海之京都專車一日遊:天橋立・伊根舟屋・美山町',
        startTime: '07:30', endTime: '19:00',
        note: '觀光巴士造訪日本三景「天橋立」、搭船觀賞伊根舟屋、美山町茅草屋之里。',
        alert: '需提前在台灣於 KKday 平台完成線上訂購!',
      },
      {
        type: 'transport',
        title: '巴士解散 → 御堂筋線回難波',
        startTime: '19:00', endTime: '19:30',
        transit: { mode: 'subway', line: '地下鐵御堂筋線', to: '難波站', farePerAdult: 240, fareNote: '兒童半價' },
        note: '回飯店休息,自由享用晚餐。',
      },
    ],
  },
  {
    date: '2026-08-12',
    title: '大阪南區:通天閣滑梯 → 阿倍野夜景 → 難波宵夜',
    accommodationId: 'ko26-acc-osaka',
    events: [
      {
        type: 'transport',
        title: '御堂筋線 難波 → 動物園前',
        startTime: '09:00', endTime: '09:15',
        transit: { mode: 'subway', line: '地下鐵御堂筋線', from: '難波站', to: '動物園前站', durationMin: 4, farePerAdult: 190, fareNote: '兒童半價' },
        note: '5 號出口步行 7 分鐘。',
      },
      {
        type: 'sight',
        title: '通天閣 TOWER SLIDER 高塔滑桿 + 新世界',
        startTime: '09:15', endTime: '11:30',
        location: { lat: 34.6525, lng: 135.5063 },
        note: '一早排隊體驗從 3 樓滑至 B1 的高塔滑桿。',
        alert: '建議先在官網預訂「展望台+滑桿套票」節省排隊時間。',
      },
      {
        type: 'transport',
        title: '徒步散步至天王寺阿倍野區',
        startTime: '11:30', endTime: '11:45',
        transit: { mode: 'walk', from: '通天閣', to: '阿倍野', durationMin: 15, farePerAdult: 0 },
      },
      {
        type: 'food',
        title: '午餐+下午茶:HARBS 水果千層蛋糕',
        startTime: '12:00', endTime: '14:30',
        placeName: '近鐵百貨海翼館 3F',
        note: '並在近鐵百貨或周邊 Q\'s Mall 購物避暑。',
      },
      {
        type: 'rest',
        title: '午後彈性時間',
        startTime: '14:30', endTime: '17:30',
        note: '商圈繼續購物,或搭地下鐵回飯店放戰利品、稍作歇息。',
      },
      {
        type: 'sight',
        title: 'Harukas 300 展望台:日落與夜景',
        startTime: '18:00', endTime: '20:00',
        location: { lat: 34.6459, lng: 135.5133 },
        note: '日本第一高樓展望台,8 月大阪絕美日落。',
        alert: '建議提前購買電子門票,黃金落日時段(約 18:00 前)提早進場佔位。',
      },
      {
        type: 'transport',
        title: '御堂筋線 天王寺 → 難波',
        startTime: '20:00', endTime: '20:15',
        transit: { mode: 'subway', line: '地下鐵御堂筋線', from: '天王寺站', to: '難波站', durationMin: 6, farePerAdult: 240, fareNote: '兒童半價' },
      },
      {
        type: 'food',
        title: '宵夜:Rikuro\'s 老爺爺起司蛋糕(難波本店)',
        startTime: '20:15',
        note: '排隊約 15-30 分鐘,作為家庭宵夜。',
      },
    ],
  },
  {
    date: '2026-08-13',
    title: '木津市場 → 梅田購物 → 心齋橋章魚燒',
    accommodationId: 'ko26-acc-osaka',
    events: [
      {
        type: 'transport',
        title: '步行前往木津卸売市場',
        startTime: '08:00', endTime: '08:12',
        transit: { mode: 'walk', from: '飯店', to: '木津卸売市場', walkMin: 12, farePerAdult: 0 },
      },
      {
        type: 'food',
        title: '早餐:木津 魚市食堂 海鮮丼',
        startTime: '08:15', endTime: '10:00',
        placeName: '木津卸売市場',
        note: '新鮮度爆表的極品海鮮丼。',
        alert: '8/13(四)市場有營業(已避開週日與週三公休)。魚市食堂不可預約且每日限量,務必提早現場排隊!',
      },
      {
        type: 'transport',
        title: '大國町 → 梅田',
        startTime: '10:00', endTime: '10:30',
        transit: { mode: 'subway', line: '地下鐵御堂筋線(市場步行 3 分至大國町站)', from: '大國町站', to: '梅田站', durationMin: 12, farePerAdult: 240, fareNote: '兒童半價' },
      },
      {
        type: 'shopping',
        title: '梅田商圈購物:HARADA 脆餅 + 寶可夢中心',
        startTime: '10:30', endTime: '15:30',
        placeName: '阪神百貨梅田本店 B1・梅田大丸百貨 13F',
        note: '阪神百貨 B1 買 GATEAU FESTA HARADA 法式麵包脆餅;大丸 13F 寶可夢中心與任天堂旗艦店(小學生最愛)。',
      },
      {
        type: 'transport',
        title: '梅田 → 心齋橋',
        startTime: '15:30', endTime: '15:50',
        transit: { mode: 'subway', line: '地下鐵御堂筋線', from: '梅田站', to: '心齋橋站', durationMin: 7, farePerAdult: 240, fareNote: '兒童半價' },
      },
      {
        type: 'shopping',
        title: '心齋橋 → 道頓堀經典散策 + 章魚燒晚餐',
        startTime: '16:00', endTime: '21:00',
        placeName: '心齋橋筋商店街・道頓堀',
        location: { lat: 34.6687, lng: 135.5013 },
        note: '一路向南血拼藥妝;晚餐於道頓堀運河旁吃たこ家道頓堀くくる章魚燒,與固力果跑跑人合影。',
      },
      {
        type: 'transport',
        title: '道頓堀步行返回難波飯店',
        startTime: '21:00', endTime: '21:10',
        transit: { mode: 'walk', from: '道頓堀', to: '難波飯店', durationMin: 10, farePerAdult: 0 },
      },
    ],
  },
  {
    date: '2026-08-14',
    title: '退房 → 臨空城 Outlet → 關西機場 → 台灣',
    events: [
      {
        type: 'hotel',
        title: '飯店 Check-out',
        startTime: '10:00', endTime: '10:30',
        note: '攜帶所有行李。',
      },
      {
        type: 'transport',
        title: '南海線空港急行 → 臨空城',
        startTime: '10:30', endTime: '11:15',
        transit: { mode: 'train', line: '南海線 空港急行', from: '南海難波站', to: '臨空城站', durationMin: 39 },
        alert: '此段與機場段建議購買「南海電鐵臨空城停留券」。',
      },
      {
        type: 'shopping',
        title: '臨空城 Outlet 最後血拼',
        startTime: '11:15', endTime: '16:30',
        placeName: 'Rinku Premium Outlets',
        location: { lat: 34.4058, lng: 135.2985 },
        note: '行李寄存在車站或 Outlet 置物櫃;午餐在 Outlet 解決。',
      },
      {
        type: 'transport',
        title: '臨空城 → 關西機場',
        startTime: '16:30', endTime: '16:40',
        transit: { mode: 'train', line: '南海電鐵或 JR(僅一站)', from: '臨空城站', to: '關西機場站', durationMin: 6 },
      },
      {
        type: 'flight',
        title: '機場報到・登機',
        startTime: '17:05', endTime: '19:05',
        placeName: '關西國際機場',
        note: '登機前 2 小時辦理報到與行李託運;19:05 班機返台。',
        alert: '2025-2026 退稅新制:出境前於機場退稅櫃檯統一退稅,請預留時間辦理海關驗證!',
      },
    ],
  },
];

/* ---- build flat records ---- */

export function buildKyotoOsakaSeed(): {
  trip: Trip;
  days: TripDay[];
  events: TimelineEvent[];
  accommodations: Accommodation[];
  versions: DayVersion[];
} {
  const days: TripDay[] = [];
  const events: TimelineEvent[] = [];
  const versions: DayVersion[] = [];

  seedDays.forEach((d, i) => {
    const dayIndex = i + 1;
    const dayId = `ko26-d${dayIndex}`;
    const versionId = `${dayId}-v1`;
    versions.push({ id: versionId, dayId, tripId: TRIP_ID, name: 'Original', createdAt: now() });
    days.push({
      id: dayId,
      tripId: TRIP_ID,
      dayIndex,
      date: d.date,
      title: d.title,
      startTime: d.events.find((e) => e.startTime)?.startTime ?? '08:30',
      activeVersionId: versionId,
      accommodationId: d.accommodationId,
      note: d.note,
    });
    d.events.forEach((e, j) => {
      let durationMin: number | undefined;
      if (e.startTime && e.endTime) {
        const [sh, sm] = e.startTime.split(':').map(Number);
        const [eh, em] = e.endTime.split(':').map(Number);
        const dur = eh * 60 + em - (sh * 60 + sm);
        if (dur > 0 && dur <= 12 * 60) durationMin = dur;
      }
      events.push({
        id: `${dayId}-e${j + 1}`,
        tripId: TRIP_ID,
        dayId,
        versionId,
        durationMin,
        order: j + 1,
        type: e.type,
        title: e.title,
        startTime: e.startTime,
        endTime: e.endTime,
        placeName: e.placeName,
        location: e.location,
        transit: e.transit,
        costEstimate: e.costEstimate,
        status: 'scheduled',
        isFavorite: false,
        note: e.note,
        alert: e.alert,
        createdAt: now(),
        updatedAt: now(),
      });
    });
  });

  return { trip: kyotoOsakaTrip, days, events, accommodations: kyotoOsakaAccommodations, versions };
}
