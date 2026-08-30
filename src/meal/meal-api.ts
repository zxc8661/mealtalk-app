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

export function createMeal(api: ApiClient, input: MealInput): Promise<Meal> {
  return api.request<Meal>('/api/v1/meals', { method: 'POST', body: input });
}

export function updateMeal(api: ApiClient, mealId: number, input: MealInput): Promise<Meal> {
  return api.request<Meal>(`/api/v1/meals/${mealId}`, { method: 'PUT', body: input });
}

export function deleteMeal(api: ApiClient, mealId: number): Promise<void> {
  return api.request<void>(`/api/v1/meals/${mealId}`, { method: 'DELETE' });
}

/** Mirrors the API ordering contract when a cached/intercepted response needs normalization. */
export function orderMeals(meals: readonly Meal[]): Meal[] {
  return [...meals].sort((left, right) => {
    if (left.eatenAt === null && right.eatenAt !== null) return 1;
    if (left.eatenAt !== null && right.eatenAt === null) return -1;
    if (left.eatenAt !== null && right.eatenAt !== null) {
      const compared = left.eatenAt.localeCompare(right.eatenAt);
      if (compared !== 0) return compared;
    }
    return left.id - right.id;
  });
}
