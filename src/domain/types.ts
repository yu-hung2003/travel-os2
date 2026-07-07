/* ---------------------------------------------------------------
   Travel OS · Domain model
   All entities hang off a tripId so the system scales beyond
   the first Kyoto-Osaka trip.
---------------------------------------------------------------- */

export type ID = string;

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type TripStatus = 'planning' | 'upcoming' | 'active' | 'completed';

export interface Trip {
  id: ID;
  title: string;
  destination: string;
  /** IANA timezone of the destination, e.g. 'Asia/Tokyo' */
  timezone: string;
  /** ISO date (yyyy-MM-dd), local to destination */
  startDate: string;
  endDate: string;
  currency: string;          // e.g. 'JPY'
  homeCurrency: string;      // e.g. 'TWD'
  totalBudget?: number;      // in trip currency
  travelers: Traveler[];
  status: TripStatus;
  coverEmoji?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Traveler {
  id: ID;
  name: string;
  /** child fares are half price on JR / subway */
  isChild: boolean;
}

export interface TripDay {
  id: ID;
  tripId: ID;
  dayIndex: number;          // 1-based: Day 1, Day 2...
  date: string;              // ISO date
  title?: string;            // e.g. '宇治 → 伏見稻荷 → 清水寺'
  /** the day's departure time; all event times are computed from it */
  startTime?: string;        // 'HH:mm', default 08:30
  /** which DayVersion is currently shown for this day */
  activeVersionId?: ID;
  accommodationId?: ID;
  note?: string;
}

/** A per-day itinerary variant (Original / Rain / Shopping / Modified…) */
export interface DayVersion {
  id: ID;
  dayId: ID;
  tripId: ID;
  name: string;
  createdAt: number;
}

export type EventType =
  | 'sight' | 'food' | 'transport' | 'hotel'
  | 'shopping' | 'flight' | 'rest' | 'custom';

/**
 * Timeline event finite state machine:
 *   scheduled → completed | skipped | postponed
 * postponed events keep their data and can be re-slotted into any day.
 */
export type EventStatus = 'scheduled' | 'completed' | 'skipped' | 'postponed';

export interface TimelineEvent {
  id: ID;
  tripId: ID;
  dayId: ID;
  /** ordering within the day; drag-and-drop rewrites this */
  order: number;
  type: EventType;
  title: string;
  /** which day-version this event belongs to */
  versionId?: ID;
  /** planned stay / ride duration in minutes; times are computed from it */
  durationMin?: number;
  /** pin to an explicit start time ('HH:mm'); later events flow from its end */
  fixedStart?: string;
  /** legacy fixed times (pre-v4) — still used as fallback for imports */
  startTime?: string;
  endTime?: string;
  /** opening-hours info for closing-time warnings */
  openUntil?: string;        // 'HH:mm' 營業至
  lastEntry?: string;        // 'HH:mm' 最後入場
  /** transport cards: neighbor signature at last edit, for stale detection */
  neighborSig?: string;
  location?: GeoPoint;
  placeName?: string;
  /** transit details: line, fare, duration */
  transit?: TransitInfo;
  costEstimate?: number;     // trip currency
  status: EventStatus;
  isFavorite: boolean;
  note?: string;
  /** warnings surfaced on Dashboard, e.g. '需提前 1-2 週預約' */
  alert?: string;
  /** link back to a wishlist Place — enables completed→visited sync */
  placeId?: ID;
  /* --- structured sight info (all user-filled) --- */
  ticketPerAdult?: number;   // 門票/人
  needsBooking?: boolean;    // 是否需預約
  hasLockers?: boolean;      // 是否可寄物
  hasToilets?: boolean;      // 是否有廁所
  webUrl?: string;           // 官網
  createdAt: number;
  updatedAt: number;
}

export interface TransitInfo {
  mode: 'train' | 'subway' | 'bus' | 'taxi' | 'walk' | 'flight' | 'boat';
  line?: string;             // 路線 e.g. 'JR 奈良線（區間快速）'
  from?: string;             // 起點
  to?: string;               // 終點
  station?: string;          // 車站(上車站/轉乘站)
  platform?: string;         // 月台
  exit?: string;             // 出口
  trainType?: string;        // 車種 e.g. '新快速' '特急'
  durationMin?: number;      // 車程(分)
  walkMin?: number;          // 步行(分)
  distanceKm?: number;
  farePerAdult?: number;     // 票價(trip currency)
  fareNote?: string;         // e.g. '兒童半價'
}

/** Airport transfer / private car booking */
export interface Transfer {
  id: ID;
  tripId: ID;
  title: string;             // e.g. '去程:桃園機場接送'
  /** ISO local datetime, e.g. '2026-08-08T09:30' */
  datetime?: string;
  amount?: number;
  currency?: string;         // defaults to trip currency context
  contactName?: string;
  contactPhone?: string;
  note?: string;
  /** timeline event created from this transfer (帶入行程) */
  linkedEventId?: ID;
  createdAt: number;
  updatedAt: number;
}

export type PlaceStatus = 'candidate' | 'chosen' | 'scheduled' | 'visited';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type PlaceKind = 'food' | 'sight';

export type SightTag =
  | 'shrine'      // 神社寺廟
  | 'nature'      // 自然風景
  | 'landmark'    // 地標展望
  | 'museum'      // 博物館美術館
  | 'themepark'   // 樂園體驗
  | 'shopping'    // 購物商圈
  | 'kids';       // 親子友善

/** Restaurant / spot wishlist entry */
export interface Place {
  id: ID;
  tripId: ID;
  name: string;
  /** restaurant vs sight; undefined = food (pre-existing records) */
  kind?: PlaceKind;
  /** which meals this place suits — multi-select (food) */
  mealTypes?: MealType[];
  /** sight categories — multi-select (sight) */
  sightTags?: SightTag[];
  needsReservation?: boolean;
  priceRange?: string;       // e.g. '¥1,000-2,000/人'
  hours?: string;            // e.g. '11:00-21:00,週三休'
  webUrl?: string;
  menuUrl?: string;
  location?: GeoPoint;
  note?: string;
  /** personal rating after visiting, 1-5 */
  myRating?: number;
  /* --- structured restaurant info (all user-filled) --- */
  recommended?: string;      // 推薦料理
  queueNote?: string;        // 排隊時間 e.g. '平日約15分,假日30分+'
  cardAccepted?: boolean;    // 是否可刷卡
  status: PlaceStatus;
  createdAt: number;
  updatedAt: number;
}

export type ExpenseCategory =
  | 'breakfast' | 'lunch' | 'dinner' | 'coffee' | 'transport'
  | 'ticket' | 'shopping' | 'snack' | 'other';

export interface Expense {
  id: ID;
  tripId: ID;
  dayId?: ID;
  eventId?: ID;
  category: ExpenseCategory;
  amount: number;            // trip currency
  amountHome?: number;       // converted, optional
  /** tagged members; empty/undefined = shared by everyone */
  memberIds?: ID[];
  /** who paid — enables settlement in the trip summary (optional) */
  payerId?: ID;
  /** @deprecated superseded by memberIds (kept for v1 data) */
  paidBy?: ID;
  note?: string;
  timestamp: number;
}

export interface JournalEntry {
  id: ID;
  tripId: ID;
  dayId: ID;
  text: string;
  /** unused — kept optional so entries stay JSON-serializable for sync */
  photos?: Blob[];
  createdAt: number;
  updatedAt: number;
}

export type BagKind = 'carry' | 'checked';

export interface PackingItem {
  id: ID;
  tripId: ID;
  /** which traveler this item belongs to; undefined = 共用 */
  ownerId?: ID;
  /** soft-red emphasis for critical items (e.g. passports) */
  highlight?: boolean;
  /** carry-on (隨身) vs checked luggage (託運大件) */
  bag: BagKind;
  category: string;          // e.g. '證件' | '電子' | '防暑' | '衣物'
  name: string;
  qty: number;
  checked: boolean;
}

export interface Accommodation {
  id: ID;
  tripId: ID;
  name: string;
  address?: string;
  location?: GeoPoint;
  checkInDate: string;       // ISO date
  checkOutDate: string;
  checkInTime?: string;      // 'HH:mm'
  bookingRef?: string;
  note?: string;
}

export interface WeatherCache {
  /** e.g. 'kyoto' | 'osaka' */
  locationKey: string;
  fetchedAt: number;
  payload: unknown;
}

export type ThemePref = 'light' | 'dark' | 'auto';

export interface UserPref {
  key: string;               // singleton row: 'default'
  theme: ThemePref;
  homeCurrency: string;
  activeTripId?: ID;
}

/** shared shopping / errand list (drugstore hauls, gifts, 代購) */
export interface ShoppingItem {
  id: ID;
  tripId: ID;
  name: string;
  forWho?: string;           // 誰託買/給誰
  estPrice?: number;         // 預估 ¥
  qty: number;
  checked: boolean;
  note?: string;
  createdAt: number;
}

/** compressed photo attached to a shopping item (synced as base64) */
export interface ShoppingPhoto {
  id: ID;
  tripId: ID;
  itemId: ID;
  dataUrl: string;           // compressed JPEG data URL
  createdAt: number;
}

/** flight info for pre-departure reminders */
export interface Flight {
  id: ID;
  tripId: ID;
  kind: 'outbound' | 'return';
  flightNo: string;          // e.g. 'IT220'
  airline?: string;
  depAirport?: string;       // e.g. 'TPE T1'
  arrAirport?: string;       // e.g. 'KIX T1'
  /** local datetime 'yyyy-MM-ddTHH:mm' */
  depTime: string;
  arrTime?: string;
  note?: string;
  /** per-reminder opt-in checkboxes */
  remindCheckIn: boolean;    // T-24h 線上報到
  remindDepart: boolean;     // T-3h 出發去機場
  /** timeline event created from this flight (帶入行程) */
  linkedEventId?: ID;
}
