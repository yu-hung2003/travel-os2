import type { GeoPoint } from '@/domain/types';

export type TravelMode = 'walking' | 'transit' | 'driving';

/** Free Google Maps deep links — no API key, opens the native app on mobile. */
export function gmapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function gmapsDirectionsUrl(opts: {
  destination: string | GeoPoint;
  origin?: string | GeoPoint;
  mode?: TravelMode;
}): string {
  // NOTE: URLSearchParams encodes values itself — passing pre-encoded
  // strings here caused double-encoding (Google Maps showed literal %E4%BA%AC…).
  const fmt = (v: string | GeoPoint) =>
    typeof v === 'string' ? v : `${v.lat},${v.lng}`;
  const params = new URLSearchParams({ api: '1' });
  params.set('destination', fmt(opts.destination));
  if (opts.origin) params.set('origin', fmt(opts.origin));
  params.set('travelmode', opts.mode ?? 'transit');
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Straight-line distance in km (haversine). */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la = (a.lat * Math.PI) / 180;
  const lb = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}


/**
 * Extract name/coords from a FULL Google Maps URL
 * (e.g. https://www.google.com/maps/place/店名/@34.66,135.50,17z/data=!3d34.6687!4d135.5013).
 * Short links (maps.app.goo.gl) cannot be resolved client-side (CORS) — callers
 * should tell users to open the short link once and copy the full URL.
 */
export function parseGoogleMapsUrl(raw: string): { name?: string; location?: GeoPoint } | undefined {
  const url = raw.trim();
  if (!/google\.[a-z.]+\/maps|maps\.google/i.test(url)) return undefined;

  let name: string | undefined;
  const placeMatch = url.match(/\/maps\/place\/([^/@?]+)/i);
  if (placeMatch) {
    try {
      name = decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim() || undefined;
    } catch {
      name = placeMatch[1].replace(/\+/g, ' ');
    }
  }

  let location: GeoPoint | undefined;
  // pin coords (most precise) e.g. !3d34.6687!4d135.5013
  const pin = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (pin) {
    location = { lat: Number(pin[1]), lng: Number(pin[2]) };
  } else {
    // viewport coords e.g. @34.6687,135.5013,17z
    const at = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (at) location = { lat: Number(at[1]), lng: Number(at[2]) };
  }

  if (!name && !location) return undefined;
  return { name, location };
}


/** parse '34.6687, 135.5013' style text into a GeoPoint */
export function parseCoords(text: string): GeoPoint | undefined {
  const m = text.trim().match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
  if (!m) return undefined;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { lat, lng };
}
