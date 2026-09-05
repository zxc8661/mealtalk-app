import type { LocalDatabase } from '@/db/database';
import {
  MealNotFoundError,
  validateDraft,
  type MealDraft,
  type MealPhotoRef,
  type MealRecord,
  type MealType,
} from '@/meal/meal-record';

type MealRow = {
  readonly id: number;
  readonly meal_date: string;
  readonly meal_type: string;
  readonly eaten_at: string | null;
  readonly memo: string | null;
  readonly photo_file: string | null;
  readonly photo_width: number | null;
  readonly photo_height: number | null;
};

const SELECT_COLUMNS =
  'id, meal_date, meal_type, eaten_at, memo, photo_file, photo_width, photo_height';

/** Records of one day, earliest eaten time first, untimed records last. */
const LIST_ORDER = 'ORDER BY eaten_at IS NULL, eaten_at, id';

function toRecord(row: MealRow): MealRecord {
  return {
    id: row.id,
    mealDate: row.meal_date,
    mealType: row.meal_type as MealType,
    eatenAt: row.eaten_at,
    memo: row.memo,
    photo:
      row.photo_file === null || row.photo_width === null || row.photo_height === null
        ? null
        : { file: row.photo_file, width: row.photo_width, height: row.photo_height },
  };
}

export async function listMeals(database: LocalDatabase, date: string): Promise<MealRecord[]> {
  const rows = await database.all<MealRow>(
    `SELECT ${SELECT_COLUMNS} FROM meals WHERE meal_date = ? ${LIST_ORDER}`,
    [date],
  );
  return rows.map(toRecord);
}

export async function getMeal(
  database: LocalDatabase,
  mealId: number,
): Promise<MealRecord | null> {
  const row = await database.get<MealRow>(
    `SELECT ${SELECT_COLUMNS} FROM meals WHERE id = ?`,
    [mealId],
  );
  return row === null ? null : toRecord(row);
}

export async function createMeal(
  database: LocalDatabase,
  draft: MealDraft,
): Promise<MealRecord> {
  const memo = validateDraft(draft);
  const now = new Date().toISOString();
  const { lastInsertRowId } = await database.run(
    `INSERT INTO meals
       (meal_date, meal_type, eaten_at, memo, photo_file, photo_width, photo_height, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      draft.mealDate,
      draft.mealType,
      draft.eatenAt,
      memo,
      draft.photo?.file ?? null,
      draft.photo?.width ?? null,
      draft.photo?.height ?? null,
      now,
      now,
    ],
  );

  const created = await getMeal(database, lastInsertRowId);
  if (created === null) throw new MealNotFoundError();
  return created;
}

/**
 * A write that replaced or removed a photo, and the file it left behind.
 *
 * The row is committed before the old file is deleted: a file that outlives its
 * row wastes space and can be reclaimed, while a row pointing at bytes that are
 * already gone cannot be repaired. The caller performs that deletion, because
 * the file system is not part of this transaction.
 */
export type MealWriteResult = {
  readonly record: MealRecord;
  readonly supersededPhoto: MealPhotoRef | null;
};

export async function updateMeal(
  database: LocalDatabase,
  mealId: number,
  draft: MealDraft,
): Promise<MealWriteResult> {
  const memo = validateDraft(draft);
  const existing = await getMeal(database, mealId);
  if (existing === null) throw new MealNotFoundError();

  await database.run(
    `UPDATE meals
        SET meal_date = ?, meal_type = ?, eaten_at = ?, memo = ?,
            photo_file = ?, photo_width = ?, photo_height = ?, updated_at = ?
      WHERE id = ?`,
    [
      draft.mealDate,
      draft.mealType,
      draft.eatenAt,
      memo,
      draft.photo?.file ?? null,
      draft.photo?.width ?? null,
      draft.photo?.height ?? null,
      new Date().toISOString(),
      mealId,
    ],
  );

  const updated = await getMeal(database, mealId);
  if (updated === null) throw new MealNotFoundError();
  return {
    record: updated,
    supersededPhoto:
      existing.photo !== null && existing.photo.file !== draft.photo?.file ? existing.photo : null,
  };
}

/** @returns the photo file the deleted record leaves behind, for the caller to remove. */
export async function deleteMeal(
  database: LocalDatabase,
  mealId: number,
): Promise<MealPhotoRef | null> {
  const existing = await getMeal(database, mealId);
  if (existing === null) throw new MealNotFoundError();
  await database.run('DELETE FROM meals WHERE id = ?', [mealId]);
  return existing.photo;
}

/** Every date that has at least one record, newest first. */
export async function listRecordedDates(
  database: LocalDatabase,
  limit: number,
): Promise<string[]> {
  const rows = await database.all<{ readonly meal_date: string }>(
    'SELECT DISTINCT meal_date FROM meals ORDER BY meal_date DESC LIMIT ?',
    [limit],
  );
  return rows.map((row) => row.meal_date);
}
