import type { LocalDatabase } from '@/db/database';
import type { MealDraft, MealRecord } from '@/meal/meal-record';
import { createMeal, deleteMeal, updateMeal } from '@/meal/meal-store';
import { deletePhotoQuietly, savePhoto, type PickedImage } from '@/photo/photo-store';

/**
 * What the entry screen holds for the photo slot.
 *
 * `keep` is not the same as "the draft already has a photo": editing must be able
 * to say "leave the stored image alone" without re-reading or re-writing it, and
 * must be able to say "remove it" without that being mistaken for "unchanged".
 */
export type PhotoIntent =
  | { readonly kind: 'keep' }
  | { readonly kind: 'remove' }
  | { readonly kind: 'replace'; readonly picked: PickedImage };

export type RecordDraft = Omit<MealDraft, 'photo'>;

/**
 * Writes a new record, storing the picked image before the row that names it.
 *
 * If the row write then fails, the just-stored file is removed: nothing
 * references it, and leaving it behind would accumulate garbage no later run can
 * attribute to anything.
 */
export async function createRecord(
  database: LocalDatabase,
  draft: RecordDraft,
  intent: PhotoIntent,
): Promise<MealRecord> {
  const photo = intent.kind === 'replace' ? await savePhoto(intent.picked) : null;
  try {
    return await createMeal(database, { ...draft, photo });
  } catch (failure) {
    deletePhotoQuietly(photo);
    throw failure;
  }
}

/**
 * Applies an edit, then deletes whatever image the edit superseded.
 *
 * The order matters: the row is committed first, so a file that outlives its row
 * is reclaimable waste, while a row naming bytes that were already deleted would
 * be a broken record with nothing to restore it from.
 */
export async function updateRecord(
  database: LocalDatabase,
  mealId: number,
  draft: RecordDraft,
  current: MealRecord,
  intent: PhotoIntent,
): Promise<MealRecord> {
  const photo =
    intent.kind === 'keep'
      ? current.photo
      : intent.kind === 'remove'
        ? null
        : await savePhoto(intent.picked);

  try {
    const { record, supersededPhoto } = await updateMeal(database, mealId, { ...draft, photo });
    deletePhotoQuietly(supersededPhoto);
    return record;
  } catch (failure) {
    if (intent.kind === 'replace') deletePhotoQuietly(photo);
    throw failure;
  }
}

export async function removeRecord(database: LocalDatabase, mealId: number): Promise<void> {
  deletePhotoQuietly(await deleteMeal(database, mealId));
}
