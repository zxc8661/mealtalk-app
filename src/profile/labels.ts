import type { ActivityLevel, GoalMode } from '@/profile/profile-store';

export const ACTIVITY_CHOICES: readonly { readonly value: ActivityLevel; readonly label: string }[] =
  [
    { value: 'LOW', label: '가벼움' },
    { value: 'MEDIUM', label: '보통' },
    { value: 'HIGH', label: '활발함' },
  ];

export const GOAL_CHOICES: readonly { readonly value: GoalMode; readonly label: string }[] = [
  { value: 'LOSS', label: '감량' },
  { value: 'MAINTAIN', label: '유지' },
  { value: 'GAIN', label: '증량' },
];

export function activityLabel(level: ActivityLevel | null): string {
  return ACTIVITY_CHOICES.find((choice) => choice.value === level)?.label ?? '-';
}

export function goalLabel(mode: GoalMode | null): string {
  return GOAL_CHOICES.find((choice) => choice.value === mode)?.label ?? '-';
}

/** A stored measurement for display, at most one decimal. */
export function formatMeasure(value: number | null, unit: string): string {
  if (value === null) return '-';
  return `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 }).format(value)} ${unit}`;
}

/** Accepts a positive decimal with up to one fraction digit. */
export function isPositiveMeasure(value: string): boolean {
  const trimmed = value.trim();
  if (!/^\d{1,3}(?:\.\d)?$/.test(trimmed)) return false;
  return Number(trimmed) > 0;
}
