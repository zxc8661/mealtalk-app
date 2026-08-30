/** Shared number and date formatting for the nutrition surfaces. */

const NUMBER_FORMAT = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** Rounded calorie value with a thousands separator, e.g. "1,431". */
export function formatCalories(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

/** Gram value with at most one decimal, e.g. "159.8g". */
export function formatGrams(value: number): string {
  return `${NUMBER_FORMAT.format(value)}g`;
}

export function formatAmount(value: number): string {
  return NUMBER_FORMAT.format(value);
}

/** Today in the device's local timezone as YYYY-MM-DD. */
export function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

/** Shift an ISO date by whole days, staying on calendar days. */
export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** "2026-03-14" -> "3월 14일 (토)" */
export function formatKoreanDate(date: string): string {
  const value = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(value.valueOf())) return date;
  return `${value.getUTCMonth() + 1}월 ${value.getUTCDate()}일 (${WEEKDAYS[value.getUTCDay()]})`;
}

/** Progress ratio clamped to 0..1 for bar widths. */
export function progressRatio(current: number, target: number): number {
  if (!Number.isFinite(target) || target <= 0) return 0;
  return Math.min(Math.max(current / target, 0), 1);
}

/** Accepts a positive decimal with up to three fraction digits, matching the API contract. */
export function isPositiveDecimal(value: string): boolean {
  const trimmed = value.trim();
  if (!/^(?:\d{1,7}(?:\.\d{1,3})?|\.\d{1,3})$/.test(trimmed)) return false;
  return Number(trimmed) > 0;
}
