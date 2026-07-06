import type { ExpenseCategory } from '@/domain/types';

export const categoryMeta: Record<ExpenseCategory, { emoji: string; label: string }> = {
  breakfast: { emoji: '🍳', label: '早餐' },
  lunch: { emoji: '🍜', label: '午餐' },
  dinner: { emoji: '🍽️', label: '晚餐' },
  coffee: { emoji: '☕', label: '咖啡' },
  transport: { emoji: '🚃', label: '交通' },
  ticket: { emoji: '🎫', label: '門票' },
  shopping: { emoji: '🛍️', label: '購物' },
  snack: { emoji: '🍡', label: '零食' },
  other: { emoji: '📦', label: '其他' },
};

export const categoryOrder: ExpenseCategory[] = [
  'breakfast', 'lunch', 'dinner', 'coffee', 'transport',
  'ticket', 'shopping', 'snack', 'other',
];
