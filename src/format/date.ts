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

/** "2026-03-14" -> "3월 14일" */
export function formatKoreanDate(date: string): string {
  const value = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(value.valueOf())) return date;
  return `${value.getUTCMonth() + 1}월 ${value.getUTCDate()}일`;
}

/** The eaten time of a record as "오후 1:20", or null when it was not recorded. */
export function formatEatenTime(eatenAt: string | null): string | null {
  if (eatenAt === null) return null;
  const value = new Date(eatenAt);
  if (Number.isNaN(value.valueOf())) return null;
  return new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' }).format(value);
}
