import {
  collection, doc, getDoc, getDocs, onSnapshot, setDoc, writeBatch,
} from 'firebase/firestore';
import Dexie from 'dexie';
import { db } from '@/data/db';
import { getFirestoreDb, isFirebaseConfigured } from '@/data/sync/firebase';

/* ---------------------------------------------------------------
   Partner sync v2 (夥伴同步) — per-trip rooms.
   - Each trip may link to one Firestore room via its code
     (stored as { tripId: code } on this device).
   - Joining a code: trip missing locally → the whole trip is
     downloaded and created; trip already present → caller asks the
     user, then calls linkRoom() explicitly.
   - Offline-first, last-write-wins, echo-suppressed via clientId.
---------------------------------------------------------------- */

const SYNC_TABLES = [
  'trips', 'days', 'dayVersions', 'events', 'expenses',
  'packing', 'accommodations', 'transfers', 'places', 'shopping', 'photos',
  'flights', 'journal',
] as const;
type SyncTable = (typeof SYNC_TABLES)[number];

const MAP_KEY = 'travelos2-sync-rooms';   // { [tripId]: code }
const CLIENT_KEY = 'travelos2-client-id';
const LAST_RX_KEY = 'travelos2-sync-last-rx';
const LAST_APPLY_KEY = 'travelos2-sync-last-apply';

function clientId(): string {
  let id = localStorage.getItem(CLIENT_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_KEY, id);
  }
  return id;
}

function loadMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(MAP_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function saveMap(map: Record<string, string>): void {
  localStorage.setItem(MAP_KEY, JSON.stringify(map));
}

export function getRoomCode(tripId: string): string | null {
  return loadMap()[tripId] ?? null;
}

export function getLastReceivedAt(): number | null {
  const v = localStorage.getItem(LAST_RX_KEY);
  return v ? Number(v) : null;
}

let applyingRemote = false;
let hooksInstalled = false;
const listeners = new Map<string, () => void>(); // code → unsubscribe

function plain(record: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(record));
}

function recordDocId(table: string, key: string): string {
  return `${table}|${key}`;
}

async function pushRecord(code: string, table: SyncTable, key: string): Promise<void> {
  const fs = getFirestoreDb();
  const record = await db.table(table).get(key);
  const ref = doc(fs, 'rooms', code, 'records', recordDocId(table, key));
  if (record === undefined) {
    await setDoc(ref, { table, key, deleted: true, updatedAt: Date.now(), clientId: clientId() });
  } else {
    await setDoc(ref, {
      table, key, data: plain(record), deleted: false,
      updatedAt: Date.now(), clientId: clientId(),
    });
  }
}

/** hooks capture the record's tripId so each change routes to its own room */
function queueOnCommit(table: SyncTable, key: string, tripId: string | undefined): void {
  if (applyingRemote || !tripId) return;
  const code = loadMap()[tripId];
  if (!code) return;
  const fire = () => {
    pushRecord(code, table, key).catch((e) => console.warn('[sync] push failed', e));
  };
  const tx = Dexie.currentTransaction;
  if (tx) tx.on('complete', fire);
  else fire();
}

function tripIdOf(table: SyncTable, obj: unknown, primKey: unknown): string | undefined {
  if (table === 'trips') return String(primKey);
  return (obj as { tripId?: string } | undefined)?.tripId;
}

function installHooks(): void {
  if (hooksInstalled) return;
  hooksInstalled = true;
  for (const table of SYNC_TABLES) {
    const t = db.table(table);
    t.hook('creating', function (primKey, obj) {
      queueOnCommit(table, String(primKey), tripIdOf(table, obj, primKey));
    });
    t.hook('updating', function (_mods, primKey, obj) {
      queueOnCommit(table, String(primKey), tripIdOf(table, obj, primKey));
    });
    t.hook('deleting', function (primKey, obj) {
      queueOnCommit(table, String(primKey), tripIdOf(table, obj, primKey));
    });
  }
}

function startListener(code: string): void {
  if (listeners.has(code)) return;
  const fs = getFirestoreDb();
  const unsub = onSnapshot(collection(fs, 'rooms', code, 'records'), (snap) => {
    if (!snap.metadata.fromCache) {
      localStorage.setItem(LAST_RX_KEY, String(Date.now()));
    }
    const changes = snap.docChanges().filter((c) => c.type !== 'removed');
    if (changes.length === 0) return;
    void (async () => {
      applyingRemote = true;
      try {
        for (const change of changes) {
          const d = change.doc.data() as {
            table: SyncTable; key: string; data?: Record<string, unknown>;
            deleted?: boolean; clientId?: string;
          };
          if (d.clientId === clientId()) continue;
          if (!SYNC_TABLES.includes(d.table)) continue;
          if (d.deleted) await db.table(d.table).delete(d.key);
          else if (d.data) await db.table(d.table).put(d.data);
          localStorage.setItem(LAST_APPLY_KEY, String(Date.now()));
        }
      } catch (e) {
        console.warn('[sync] apply failed', e);
      } finally {
        applyingRemote = false;
      }
    })();
  });
  listeners.set(code, unsub);
}

async function pushWholeTrip(code: string, tripId: string): Promise<void> {
  const fs = getFirestoreDb();
  const docs: Array<{ id: string; payload: Record<string, unknown> }> = [];
  for (const table of SYNC_TABLES) {
    const rows = table === 'trips'
      ? await db.trips.where('id').equals(tripId).toArray()
      : await db.table(table).where('tripId').equals(tripId).toArray();
    for (const row of rows as Array<{ id: string }>) {
      docs.push({
        id: recordDocId(table, row.id),
        payload: {
          table, key: row.id, data: plain(row), deleted: false,
          updatedAt: Date.now(), clientId: clientId(),
        },
      });
    }
  }
  for (let i = 0; i < docs.length; i += 400) {
    const batch = writeBatch(fs);
    for (const d of docs.slice(i, i + 400)) {
      batch.set(doc(fs, 'rooms', code, 'records', d.id), d.payload);
    }
    await batch.commit();
  }
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  const arr = new Uint32Array(8);
  crypto.getRandomValues(arr);
  const body = [...arr].map((n) => CODE_ALPHABET[n % CODE_ALPHABET.length]).join('');
  return `TRIP-${body}`;
}

/** Create a partner-sync room for one trip and upload its full dataset. */
export async function createRoom(tripId: string): Promise<string> {
  if (!isFirebaseConfigured()) throw new Error('not-configured');
  const fs = getFirestoreDb();
  const trip = await db.trips.get(tripId);
  const code = generateCode();
  await setDoc(doc(fs, 'rooms', code), {
    tripId, title: trip?.title ?? '', createdAt: Date.now(),
  });
  await pushWholeTrip(code, tripId);
  const map = loadMap();
  map[tripId] = code;
  saveMap(map);
  installHooks();
  startListener(code);
  void touchPresence(code);
  return code;
}

export type JoinResult =
  | { status: 'imported'; tripId: string; title: string }
  | { status: 'exists'; tripId: string; title: string; code: string };

/**
 * Join by code. Missing trip → download & create the whole trip, then link.
 * Existing trip → return 'exists'; caller confirms and calls linkRoom().
 */
export async function joinRoom(rawCode: string): Promise<JoinResult> {
  if (!isFirebaseConfigured()) throw new Error('not-configured');
  const code = rawCode.trim().toUpperCase();
  const fs = getFirestoreDb();
  const room = await getDoc(doc(fs, 'rooms', code));
  if (!room.exists()) throw new Error('room-not-found');
  const meta = room.data() as { tripId: string; title?: string };

  const local = await db.trips.get(meta.tripId);
  if (local) {
    return { status: 'exists', tripId: meta.tripId, title: local.title, code };
  }

  // download the whole trip onto this device
  const snap = await getDocs(collection(fs, 'rooms', code, 'records'));
  applyingRemote = true;
  try {
    for (const d of snap.docs) {
      const r = d.data() as {
        table: SyncTable; key: string; data?: Record<string, unknown>; deleted?: boolean;
      };
      if (!SYNC_TABLES.includes(r.table) || r.deleted || !r.data) continue;
      await db.table(r.table).put(r.data);
    }
  } finally {
    applyingRemote = false;
  }

  linkRoom(code, meta.tripId);
  const title = (await db.trips.get(meta.tripId))?.title ?? meta.title ?? '';
  return { status: 'imported', tripId: meta.tripId, title };
}

/** Link an existing local trip to a room (after user confirmation). */
export function linkRoom(code: string, tripId: string): void {
  const map = loadMap();
  map[tripId] = code;
  saveMap(map);
  installHooks();
  startListener(code);
  void touchPresence(code);
}

/** Stop syncing one trip on this device; local data stays intact. */
export function leaveSync(tripId: string): void {
  const map = loadMap();
  const code = map[tripId];
  delete map[tripId];
  saveMap(map);
  if (code) {
    listeners.get(code)?.();
    listeners.delete(code);
  }
}

/** Boot: resume listeners for every linked trip. */
export function resumeSyncIfEnabled(): void {
  const map = loadMap();
  const codes = Object.values(map);
  if (codes.length === 0 || !isFirebaseConfigured()) return;
  try {
    installHooks();
    for (const code of codes) {
      startListener(code);
      void touchPresence(code);
    }
  } catch (e) {
    console.warn('[sync] resume failed', e);
  }
}

export function getLastAppliedAt(): number | null {
  const v = localStorage.getItem(LAST_APPLY_KEY);
  return v ? Number(v) : null;
}

/** leave a presence mark on the room doc (no rules change needed) */
async function touchPresence(code: string): Promise<void> {
  try {
    const fs = getFirestoreDb();
    await setDoc(
      doc(fs, 'rooms', code),
      { members: { [clientId()]: { lastSeenAt: Date.now() } } },
      { merge: true },
    );
  } catch { /* presence is best-effort */ }
}

/** how many devices have used this trip's sync code */
export async function getMemberCount(tripId: string): Promise<number | null> {
  const code = getRoomCode(tripId);
  if (!code || !isFirebaseConfigured()) return null;
  try {
    const fs = getFirestoreDb();
    const room = await getDoc(doc(fs, 'rooms', code));
    const members = (room.data() as { members?: Record<string, unknown> } | undefined)?.members;
    return members ? Object.keys(members).length : 1;
  } catch {
    return null;
  }
}

/**
 * Force-sync one trip: fetch ALL its room records from the server and
 * apply them, then rebuild the realtime listener. Guarantees convergence
 * even if the push channel missed events.
 */
export async function forceSync(tripId: string): Promise<number> {
  const code = getRoomCode(tripId);
  if (!code || !isFirebaseConfigured()) return 0;
  const fs = getFirestoreDb();
  const snap = await getDocs(collection(fs, 'rooms', code, 'records'));
  let applied = 0;
  applyingRemote = true;
  try {
    for (const d of snap.docs) {
      const r = d.data() as {
        table: SyncTable; key: string; data?: Record<string, unknown>; deleted?: boolean;
      };
      if (!SYNC_TABLES.includes(r.table)) continue;
      if (r.deleted) await db.table(r.table).delete(r.key);
      else if (r.data) await db.table(r.table).put(r.data);
      applied += 1;
    }
  } finally {
    applyingRemote = false;
  }
  localStorage.setItem(LAST_APPLY_KEY, String(Date.now()));
  localStorage.setItem(LAST_RX_KEY, String(Date.now()));
  listeners.get(code)?.();
  listeners.delete(code);
  startListener(code);
  void touchPresence(code);
  return applied;
}
