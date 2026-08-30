import type { ActivityLevel, CurrentUser, GoalMode, NutritionTarget, TargetType } from '@/profile/profile-api';

export const ACTIVITY_CHOICES: readonly { readonly value: ActivityLevel; readonly label: string }[] = [
  { value: 'LOW', label: '가벼움' },
  { value: 'MEDIUM', label: '보통' },
  { value: 'HIGH', label: '활발함' },
];

export const GOAL_CHOICES: readonly { readonly value: GoalMode; readonly label: string }[] = [
  { value: 'LOSS', label: '감량' },
  { value: 'MAINTAIN', label: '유지' },
  { value: 'GAIN', label: '증량' },
];

export function activityLabel(level: ActivityLevel): string {
  return ACTIVITY_CHOICES.find((choice) => choice.value === level)?.label ?? '보통';
}

export function goalLabel(mode: GoalMode): string {
  return GOAL_CHOICES.find((choice) => choice.value === mode)?.label ?? '유지';
}

/**
 * Reads a target value the server holds.
 *
 * The API only stores TARGET_WEIGHT, DAILY_CALORIES and DAILY_PROTEIN, so carbohydrate
 * and fat goals have no server-side source. Screens show those two as consumed amounts
 * instead of inventing a target the server never agreed to.
 */
export function targetValue(user: CurrentUser | null, type: TargetType): number | null {
  const target = user?.targets.find((candidate) => candidate.targetType === type);
  return target ? target.targetValue : null;
}

export function findTarget(
  targets: readonly NutritionTarget[],
  type: TargetType,
): NutritionTarget | null {
  return targets.find((candidate) => candidate.targetType === type) ?? null;
}
