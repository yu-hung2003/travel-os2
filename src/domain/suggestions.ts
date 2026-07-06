import type { TimelineEvent } from '@/domain/types';
import type { WeatherSnapshot } from '@/data/sync/weatherService';

export type SuggestionSeverity = 'danger' | 'warning' | 'info';

export interface Suggestion {
  id: string;
  icon: string;
  text: string;
  severity: SuggestionSeverity;
  /** when set, the UI offers quick actions (complete / postpone) on this event */
  overdueEventId?: string;
}

function minutesOf(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

const OUTDOOR_TYPES = new Set(['sight']);
const OVERDUE_GRACE_MIN = 30;
const CLOSING_WINDOW_MIN = 45;

/**
 * Local, offline rule engine — no AI API, deterministic and instant.
 * Rules: schedule delay, closing-time window, heat plan, rain plan.
 */
export function buildSuggestions(input: {
  events: TimelineEvent[];
  weather: WeatherSnapshot | null;
  nowMins: number;
  preview?: boolean;
}): Suggestion[] {
  const { events, weather, nowMins, preview } = input;

  if (preview) {
    // demo entries so the UI can be verified before the trip starts
    return [
      {
        id: 'demo-heat',
        icon: '🥵',
        text: '(示範)體感 38°C:建議 11-15 時將「清水寺」調整至傍晚,先改逛室內百貨。',
        severity: 'warning',
      },
      {
        id: 'demo-late',
        icon: '⏰',
        text: '(示範)「伏見稻荷大社」已超過預定開始 40 分鐘,可標記完成或延後。',
        severity: 'danger',
      },
    ];
  }

  const out: Suggestion[] = [];
  const scheduled = events.filter((e) => e.status === 'scheduled');

  // 1) schedule delay: scheduled events that should have started a while ago
  for (const e of scheduled) {
    if (!e.startTime) continue;
    const late = nowMins - minutesOf(e.startTime);
    if (late > OVERDUE_GRACE_MIN && (!e.endTime || nowMins < minutesOf(e.endTime))) {
      out.push({
        id: `late-${e.id}`,
        icon: '⏰',
        text: `「${e.title}」已超過預定開始 ${late} 分鐘 — 進行中請標記完成,不去了可延後。`,
        severity: 'danger',
        overdueEventId: e.id,
      });
    }
  }

  // 2) closing window: things ending soon
  for (const e of scheduled) {
    if (!e.endTime) continue;
    const remain = minutesOf(e.endTime) - nowMins;
    if (remain > 0 && remain <= CLOSING_WINDOW_MIN) {
      out.push({
        id: `closing-${e.id}`,
        icon: '⌛',
        text: `「${e.title}」再 ${remain} 分鐘結束(${e.endTime}),把握時間。`,
        severity: 'warning',
      });
    }
  }

  // 3) heat plan
  if (weather && Math.max(weather.feelsC, weather.tempC) >= 36) {
    const middayOutdoor = scheduled.filter(
      (e) =>
        OUTDOOR_TYPES.has(e.type) &&
        e.startTime &&
        minutesOf(e.startTime) >= 11 * 60 &&
        minutesOf(e.startTime) <= 15 * 60,
    );
    out.push({
      id: 'heat',
      icon: '🥵',
      text:
        middayOutdoor.length > 0
          ? `體感 ${weather.feelsC}°C:${middayOutdoor.map((e) => `「${e.title}」`).join('、')}落在 11-15 時,建議延後至傍晚,中午先改室內(百貨/咖啡)。`
          : `體感 ${weather.feelsC}°C:11-15 時盡量待室內,補水防曬。`,
      severity: 'warning',
    });
  }

  // 4) rain plan
  if (weather && weather.pop >= 0.6) {
    const outdoor = scheduled.filter((e) => OUTDOOR_TYPES.has(e.type));
    out.push({
      id: 'rain',
      icon: '🌧️',
      text:
        outdoor.length > 0
          ? `降雨機率 ${Math.round(weather.pop * 100)}%:${outdoor.map((e) => `「${e.title}」`).join('、')}請備雨具,或改走室內備案(口袋名單/百貨)。`
          : `降雨機率 ${Math.round(weather.pop * 100)}%:出門記得帶傘。`,
      severity: 'info',
    });
  }

  const rank: Record<SuggestionSeverity, number> = { danger: 0, warning: 1, info: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
