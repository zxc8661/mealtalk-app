import type { ApiClient } from '@/api/client';

export type Food = {
  readonly id: number;
  readonly name: string;
  readonly servingAmount: number;
  readonly servingUnit: string;
  readonly caloriesKcal: number;
  readonly carbohydratesG: number;
  readonly proteinG: number;
  readonly fatG: number;
};

export type FoodInput = {
  readonly name: string;
  readonly servingAmount: number;
  readonly servingUnit: string;
  readonly caloriesKcal: number;
  readonly carbohydratesG: number;
  readonly proteinG: number;
  readonly fatG: number;
};

export function listFoods(api: ApiClient, query: string, signal?: AbortSignal): Promise<Food[]> {
  const parameters = query ? `?query=${encodeURIComponent(query)}` : '';
  return api.request<Food[]>(`/api/v1/foods${parameters}`, { signal });
}

export function createFood(api: ApiClient, input: FoodInput): Promise<Food> {
  return api.request<Food>('/api/v1/foods', { method: 'POST', body: input });
}

export function updateFood(api: ApiClient, foodId: number, input: FoodInput): Promise<Food> {
  return api.request<Food>(`/api/v1/foods/${foodId}`, { method: 'PUT', body: input });
}

export function archiveFood(api: ApiClient, foodId: number): Promise<void> {
  return api.request<void>(`/api/v1/foods/${foodId}`, { method: 'DELETE' });
}
