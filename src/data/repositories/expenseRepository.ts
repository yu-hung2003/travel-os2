import { db } from '@/data/db';
import { newId } from '@/shared/utils/id';
import type { Expense, ExpenseCategory } from '@/domain/types';

export const expenseRepository = {
  async add(input: {
    tripId: string;
    dayId?: string;
    category: ExpenseCategory;
    amount: number;
    note?: string;
    memberIds?: string[];
  }): Promise<void> {
    const expense: Expense = {
      id: newId(),
      tripId: input.tripId,
      dayId: input.dayId,
      category: input.category,
      amount: input.amount,
      note: input.note?.trim() || undefined,
      memberIds: input.memberIds ?? [],
      timestamp: Date.now(),
    };
    await db.expenses.add(expense);
  },

  async remove(id: string): Promise<void> {
    await db.expenses.delete(id);
  },

  listByTrip(tripId: string): Promise<Expense[]> {
    return db.expenses.where('tripId').equals(tripId).reverse().sortBy('timestamp');
  },

  async setTripBudget(tripId: string, totalBudget: number | undefined): Promise<void> {
    await db.trips.update(tripId, { totalBudget, updatedAt: Date.now() });
  },
};
