import { db } from '@/data/db';
import { newId } from '@/shared/utils/id';
import type { EventStatus, EventType, Place, TimelineEvent, TransitInfo } from '@/domain/types';

export const eventRepository = {
  /** FSM transition; any status can return to 'scheduled' (undo).
   *  Completing an event linked to a wishlist Place marks it 去過了. */
  async setStatus(eventId: string, status: EventStatus): Promise<void> {
    await db.transaction('rw', [db.events, db.places], async () => {
      await db.events.update(eventId, { status, updatedAt: Date.now() });
      const ev = await db.events.get(eventId);
      if (ev?.placeId && status === 'completed') {
        await db.places.update(ev.placeId, { status: 'visited', updatedAt: Date.now() });
      }
    });
  },

  /**
   * Insert a standalone transport card immediately BEFORE the given event,
   * renumbering the whole day so ordering stays consistent.
   */
  async insertTransportBefore(input: {
    tripId: string;
    dayId: string;
    beforeEventId: string;
    title: string;
    transit: TransitInfo;
    startTime?: string;
  }): Promise<string> {
    const id = newId();
    await db.transaction('rw', [db.events, db.days], async () => {
      const day = await db.days.get(input.dayId);
      const versionId = day?.activeVersionId;
      const siblings = (await db.events.where('dayId').equals(input.dayId).sortBy('order'))
        .filter((e) => !versionId || (e.versionId ?? '') === versionId);
      const idx = siblings.findIndex((e) => e.id === input.beforeEventId);
      const insertAt = idx < 0 ? siblings.length : idx;

      const prevActive = siblings.slice(0, insertAt).reverse()
        .find((e) => e.status !== 'skipped' && e.status !== 'postponed');
      const newEvent: TimelineEvent = {
        id,
        tripId: input.tripId,
        dayId: input.dayId,
        versionId,
        order: 0, // renumbered below
        type: 'transport',
        title: input.title,
        durationMin: input.transit.durationMin,
        transit: input.transit,
        neighborSig: `${prevActive?.id ?? ''}|${input.beforeEventId}`,
        status: 'scheduled',
        isFavorite: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const list = [...siblings];
      list.splice(insertAt, 0, newEvent);
      await db.events.add(newEvent);
      await Promise.all(
        list.map((e, i) =>
          db.events.update(e.id, { order: i + 1, updatedAt: Date.now() }),
        ),
      );
    });
    return id;
  },

  async updateTransit(eventId: string, transit: TransitInfo | undefined): Promise<void> {
    await db.events.update(eventId, { transit, updatedAt: Date.now() });
  },

  async updateNote(eventId: string, note: string): Promise<void> {
    await db.events.update(eventId, { note: note.trim() || undefined, updatedAt: Date.now() });
  },

  async updateAlert(eventId: string, alert: string): Promise<void> {
    await db.events.update(eventId, { alert: alert.trim() || undefined, updatedAt: Date.now() });
  },

  async updateDuration(eventId: string, durationMin: number | undefined): Promise<void> {
    await db.events.update(eventId, { durationMin, updatedAt: Date.now() });
  },

  async updateFixedStart(eventId: string, fixedStart: string | undefined): Promise<void> {
    await db.events.update(eventId, { fixedStart: fixedStart || undefined, updatedAt: Date.now() });
  },

  async updateHours(eventId: string, openUntil?: string, lastEntry?: string): Promise<void> {
    await db.events.update(eventId, {
      openUntil: openUntil || undefined,
      lastEntry: lastEntry || undefined,
      updatedAt: Date.now(),
    });
  },

  async updateInfo(eventId: string, patch: {
    ticketPerAdult?: number;
    needsBooking?: boolean;
    hasLockers?: boolean;
    hasToilets?: boolean;
    webUrl?: string;
    location?: import('@/domain/types').GeoPoint;
  }): Promise<void> {
    await db.events.update(eventId, { ...patch, updatedAt: Date.now() });
  },

  /**
   * Create or update a pinned event from flight/transfer info (帶入行程).
   * position 'start' places it before all events of the day's active version.
   */
  async upsertPinnedEvent(input: {
    existingId?: string;
    tripId: string;
    dayId: string;
    type: EventType;
    title: string;
    fixedStart: string;
    durationMin?: number;
    note?: string;
    transit?: TransitInfo;
    position: 'start' | 'end';
  }): Promise<string> {
    return db.transaction('rw', [db.events, db.days], async () => {
      if (input.existingId) {
        const existing = await db.events.get(input.existingId);
        if (existing) {
          await db.events.update(input.existingId, {
            title: input.title,
            fixedStart: input.fixedStart,
            durationMin: input.durationMin,
            note: input.note?.trim() || undefined,
            transit: input.transit,
            updatedAt: Date.now(),
          });
          return input.existingId;
        }
      }
      const day = await db.days.get(input.dayId);
      const versionId = day?.activeVersionId;
      const siblings = (await db.events.where('dayId').equals(input.dayId).toArray())
        .filter((e) => !versionId || (e.versionId ?? '') === versionId);
      const order = input.position === 'start'
        ? Math.min(0, ...siblings.map((e) => e.order)) - 1
        : siblings.reduce((m, e) => Math.max(m, e.order), 0) + 1;
      const id = newId();
      await db.events.add({
        id,
        tripId: input.tripId,
        dayId: input.dayId,
        versionId,
        order,
        type: input.type,
        title: input.title,
        fixedStart: input.fixedStart,
        durationMin: input.durationMin,
        note: input.note?.trim() || undefined,
        transit: input.transit,
        status: 'scheduled',
        isFavorite: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return id;
    });
  },

  /** mark a transport card's route as confirmed for its current neighbors */
  async confirmNeighborSig(eventId: string, sig: string): Promise<void> {
    await db.events.update(eventId, { neighborSig: sig, updatedAt: Date.now() });
  },

  async toggleFavorite(eventId: string): Promise<void> {
    const ev = await db.events.get(eventId);
    if (!ev) return;
    await db.events.update(eventId, { isFavorite: !ev.isFavorite, updatedAt: Date.now() });
  },

  /** Persist a full drag-and-drop reorder for one day. */
  async reorderDay(_dayId: string, orderedIds: string[]): Promise<void> {
    await db.transaction('rw', db.events, async () => {
      await Promise.all(
        orderedIds.map((id, i) =>
          db.events.update(id, { order: i + 1, updatedAt: Date.now() }),
        ),
      );
    });
  },

  /** Move event to another day (appended at the end, back to 'scheduled'). */
  async moveToDay(eventId: string, targetDayId: string): Promise<void> {
    await db.transaction('rw', [db.events, db.days], async () => {
      const day = await db.days.get(targetDayId);
      const versionId = day?.activeVersionId;
      const siblings = await db.events.where('dayId').equals(targetDayId)
        .and((e) => !versionId || (e.versionId ?? '') === versionId).toArray();
      const maxOrder = siblings.reduce((m, e) => Math.max(m, e.order), 0);
      await db.events.update(eventId, {
        dayId: targetDayId,
        versionId,
        order: maxOrder + 1,
        status: 'scheduled',
        updatedAt: Date.now(),
      });
    });
  },

  async addEvent(input: {
    tripId: string;
    dayId: string;
    type: EventType;
    title: string;
    durationMin?: number;
    fixedStart?: string;
    note?: string;
    alert?: string;
  }): Promise<void> {
    await db.transaction('rw', [db.events, db.days], async () => {
      const day = await db.days.get(input.dayId);
      const versionId = day?.activeVersionId;
      const siblings = await db.events.where('dayId').equals(input.dayId)
        .and((e) => !versionId || (e.versionId ?? '') === versionId).toArray();
      const maxOrder = siblings.reduce((m, e) => Math.max(m, e.order), 0);
      const event: TimelineEvent = {
        id: newId(),
        tripId: input.tripId,
        dayId: input.dayId,
        versionId,
        order: maxOrder + 1,
        type: input.type,
        title: input.title.trim(),
        durationMin: input.durationMin,
        fixedStart: input.fixedStart || undefined,
        note: input.note?.trim() || undefined,
        alert: input.alert?.trim() || undefined,
        status: 'scheduled',
        isFavorite: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.events.add(event);
    });
  },

  async deleteEvent(eventId: string): Promise<void> {
    await db.transaction('rw', [db.events, db.places], async () => {
      const ev = await db.events.get(eventId);
      await db.events.delete(eventId);
      // deleting a scheduled wishlist visit returns the place to 已選定
      if (ev?.placeId) {
        const place = await db.places.get(ev.placeId);
        if (place?.status === 'scheduled') {
          await db.places.update(ev.placeId, { status: 'chosen', updatedAt: Date.now() });
        }
      }
    });
  },

  /**
   * Create a food event from a wishlist Place, inserted at day end or
   * right after a given event; flips the place to 已加入行程.
   */
  async addFromPlace(input: {
    place: Place;
    dayId: string;
    startTime?: string;
    afterEventId?: string;
  }): Promise<void> {
    const { place } = input;
    const noteParts = [
      place.priceRange ? `💴 ${place.priceRange}` : undefined,
      place.hours ? `🕐 ${place.hours}` : undefined,
      place.recommended ? `👍 推薦:${place.recommended}` : undefined,
      place.queueNote ? `🕰 排隊:${place.queueNote}` : undefined,
      place.note,
    ].filter(Boolean);

    await db.transaction('rw', [db.events, db.places, db.days], async () => {
      const day = await db.days.get(input.dayId);
      const versionId = day?.activeVersionId;
      const siblings = (await db.events.where('dayId').equals(input.dayId).sortBy('order'))
        .filter((e) => !versionId || (e.versionId ?? '') === versionId);
      const newEvent: TimelineEvent = {
        id: newId(),
        tripId: place.tripId,
        dayId: input.dayId,
        versionId,
        order: 0,
        type: place.kind === 'sight' ? 'sight' : 'food',
        title: place.name,
        placeName: place.name,
        startTime: input.startTime || undefined,
        location: place.location,
        note: noteParts.length ? noteParts.join('\n') : undefined,
        alert: place.needsReservation ? '此餐廳需訂位,請先確認訂位狀況' : undefined,
        placeId: place.id,
        webUrl: place.webUrl,
        needsBooking: place.needsReservation,
        status: 'scheduled',
        isFavorite: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      let insertAt = siblings.length;
      if (input.afterEventId) {
        const idx = siblings.findIndex((e) => e.id === input.afterEventId);
        if (idx >= 0) insertAt = idx + 1;
      }
      const list = [...siblings];
      list.splice(insertAt, 0, newEvent);
      await db.events.add(newEvent);
      await Promise.all(
        list.map((e, i) => db.events.update(e.id, { order: i + 1, updatedAt: Date.now() })),
      );
      await db.places.update(place.id, { status: 'scheduled', updatedAt: Date.now() });
    });
  },
};
