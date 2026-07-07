import type { EventStatus, EventType } from '@/domain/types';

export const typeMeta: Record<EventType, { emoji: string; label: string }> = {
  sight: { emoji: '⛩️', label: '景點' },
  food: { emoji: '🍽️', label: '餐飲' },
  transport: { emoji: '🚃', label: '交通' },
  hotel: { emoji: '🏨', label: '住宿' },
  shopping: { emoji: '🛍️', label: '購物' },
  flight: { emoji: '✈️', label: '航班' },
  rest: { emoji: '☕', label: '休息' },
  custom: { emoji: '📌', label: '自訂' },
};

export const statusMeta: Record<EventStatus, { label: string; badgeCls: string }> = {
  scheduled: { label: '', badgeCls: '' },
  completed: { label: '已完成', badgeCls: 'bg-success/15 text-success' },
  skipped: { label: '已略過', badgeCls: 'bg-surface-3 text-ink-3' },
  postponed: { label: '已延後', badgeCls: 'bg-warning/15 text-warning' },
};

export const addableTypes: EventType[] = [
  'sight', 'food', 'shopping', 'transport', 'rest', 'custom',
];
