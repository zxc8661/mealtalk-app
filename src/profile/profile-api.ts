import type { ApiClient } from '@/api/client';

export type ActivityLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type GoalMode = 'LOSS' | 'MAINTAIN' | 'GAIN';
export type TargetType = 'TARGET_WEIGHT' | 'DAILY_CALORIES' | 'DAILY_PROTEIN';

export type NutritionTarget = {
  readonly targetType: TargetType;
  readonly targetValue: number;
  readonly dueDate: string | null;
};

export type CurrentUser = {
  readonly id: number;
  readonly email: string;
  readonly name: string;
  readonly profileCompleted: boolean;
  readonly timezone: string;
  readonly profile: {
    readonly heightCm: number;
    readonly weightKg: number;
    readonly activityLevel: ActivityLevel;
    readonly goalMode: GoalMode;
  } | null;
  readonly targets: readonly NutritionTarget[];
};

export type ProfileUpdate = {
  readonly heightCm: number;
  readonly weightKg: number;
  readonly activityLevel: ActivityLevel;
  readonly goalMode: GoalMode;
  readonly targets: readonly NutritionTarget[];
};

export function getCurrentUser(api: ApiClient, signal?: AbortSignal): Promise<CurrentUser> {
  return api.request<CurrentUser>('/api/v1/me', { signal });
}

export function replaceProfile(api: ApiClient, update: ProfileUpdate): Promise<CurrentUser> {
  return api.request<CurrentUser>('/api/v1/me/profile', { method: 'PUT', body: update });
}
