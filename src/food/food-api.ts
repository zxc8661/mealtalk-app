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

/**
 * Food search backing the meal entry screen.
 *
 * Creating, editing and archiving foods are supported by the API but have no
 * screen in the current product, so no client function exists for them. Add one
 * back alongside the UI that needs it rather than keeping unreachable code here.
 */
export function listFoods(api: ApiClient, query: string, signal?: AbortSignal): Promise<Food[]> {
  const parameters = query ? `?query=${encodeURIComponent(query)}` : '';
  return api.request<Food[]>(`/api/v1/foods${parameters}`, { signal });
}
