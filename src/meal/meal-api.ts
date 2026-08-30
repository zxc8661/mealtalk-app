import type { ApiClient } from '@/api/client';

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | 'UNSPECIFIED';

export type MealItem = {
  readonly id: number;
  readonly foodId: number;
  readonly foodName: string;
  readonly amount: number;
  readonly unit: string;
  readonly caloriesKcal: number;
  readonly carbohydratesG: number;
  readonly proteinG: number;
  readonly fatG: number;
};

export type Meal = {
  readonly id: number;
  readonly mealDate: string;
  readonly mealType: MealType;
  readonly eatenAt: string | null;
  readonly items: readonly MealItem[];
  readonly totalCaloriesKcal: number;
  readonly totalCarbohydratesG: number;
  readonly totalProteinG: number;
  readonly totalFatG: number;
};

export type MealJournal = {
  readonly mealDate: string;
  readonly meals: readonly Meal[];
  readonly totalCaloriesKcal: number;
  readonly totalCarbohydratesG: number;
  readonly totalProteinG: number;
  readonly totalFatG: number;
};

export type MealInput = {
  readonly mealDate: string;
  readonly mealType: MealType;
  readonly eatenAt: string | null;
  readonly items: readonly { readonly foodId: number; readonly amount: number }[];
};

export function listMeals(api: ApiClient, date: string, signal?: AbortSignal): Promise<MealJournal> {
  return api.request<MealJournal>(`/api/v1/meals?date=${encodeURIComponent(date)}`, { signal });
}

/*
 * There is no getMeal client function on purpose. The only screen that shows a
 * single meal also shows that day's running totals, and the journal response
 * carries both, so fetching one meal separately would add a second request
 * without removing the first.
 */

export function createMeal(api: ApiClient, input: MealInput): Promise<Meal> {
  return api.request<Meal>('/api/v1/meals', { method: 'POST', body: input });
}

/*
 * Updating and deleting a meal are supported by the API, but the guide defers
 * 식단 수정/삭제 to a later release and no screen calls them yet. Add the client
 * functions back together with that UI.
 */
