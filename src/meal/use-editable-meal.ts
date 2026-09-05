import { useDatabase } from '@/db/database-context';
import { useAsyncRead } from '@/db/use-async-read';
import type { MealRecord } from '@/meal/meal-record';
import { getMeal } from '@/meal/meal-store';

type LoadState = {
  readonly meal: MealRecord | null;
  readonly isLoading: boolean;
  readonly error: string | null;
};

/**
 * The record being edited, or nothing when the screen is composing a new one.
 *
 * A record is self-contained - date, type, memo and its own photo - so unlike the
 * previous food-based editor there is nothing further to resolve after the row is
 * read, and an id that matches no row is an error rather than a half-loaded form.
 */
export function useEditableMeal(mealId: number | null): LoadState {
  const database = useDatabase();

  const { data, isLoading, error } = useAsyncRead(
    () => (mealId === null ? Promise.resolve(null) : getMeal(database, mealId)),
    String(mealId),
  );

  if (mealId === null) return { meal: null, isLoading: false, error: null };
  if (isLoading) return { meal: null, isLoading: true, error: null };
  if (error !== null) return { meal: null, isLoading: false, error };
  return data === null
    ? { meal: null, isLoading: false, error: '기록을 찾을 수 없습니다.' }
    : { meal: data, isLoading: false, error: null };
}
