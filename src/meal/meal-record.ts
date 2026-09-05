export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | 'UNSPECIFIED';

/**
 * A stored photo, identified by its file name rather than a full URI.
 *
 * The app's sandbox path changes between installs and OS upgrades, so a row
 * holding an absolute URI would point at nothing after the next install. The
 * directory is resolved at read time instead; see `photoUri`.
 */
export type MealPhotoRef = {
  readonly file: string;
  readonly width: number;
  readonly height: number;
};

export type MealRecord = {
  readonly id: number;
  readonly mealDate: string;
  readonly mealType: MealType;
  readonly eatenAt: string | null;
  readonly memo: string | null;
  readonly photo: MealPhotoRef | null;
};

/** What the user authored, before it becomes a row. */
export type MealDraft = {
  readonly mealDate: string;
  readonly mealType: MealType;
  readonly eatenAt: string | null;
  readonly memo: string | null;
  readonly photo: MealPhotoRef | null;
};

export const MEMO_MAX_LENGTH = 1000;

/** The stored form of a memo: outer whitespace removed, blank becomes null. */
export function normalizeMemo(memo: string | null): string | null {
  if (memo === null) return null;
  const trimmed = memo.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** A record must carry something the user wrote or shot. */
export class EmptyMealRecordError extends Error {
  constructor() {
    super('메모나 사진 중 하나는 있어야 기록할 수 있어요.');
    this.name = 'EmptyMealRecordError';
  }
}

export class MemoTooLongError extends Error {
  constructor() {
    super(`메모는 ${MEMO_MAX_LENGTH}자까지 입력할 수 있습니다.`);
    this.name = 'MemoTooLongError';
  }
}

export class MealNotFoundError extends Error {
  constructor() {
    super('기록을 찾을 수 없습니다.');
    this.name = 'MealNotFoundError';
  }
}

/**
 * Applies the record rules to a draft and returns the memo as it will be stored.
 *
 * Both checks run against the normalized memo so trailing whitespace neither
 * consumes the length budget nor passes as content.
 */
export function validateDraft(draft: MealDraft): string | null {
  const memo = normalizeMemo(draft.memo);
  if (memo !== null && memo.length > MEMO_MAX_LENGTH) throw new MemoTooLongError();
  if (memo === null && draft.photo === null) throw new EmptyMealRecordError();
  return memo;
}
