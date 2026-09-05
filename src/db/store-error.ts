import {
  EmptyMealRecordError,
  MealNotFoundError,
  MemoTooLongError,
} from '@/meal/meal-record';
import { PhotoStorageError } from '@/photo/photo-store';

/**
 * The sentence to show when a local write or read fails.
 *
 * The typed errors carry a message written for the user, so they are shown as
 * they are. Anything else is a storage fault the user cannot act on, and gets
 * one honest generic sentence rather than a leaked SQLite string.
 */
export function storeMessage(error: unknown): string {
  if (
    error instanceof EmptyMealRecordError ||
    error instanceof MemoTooLongError ||
    error instanceof MealNotFoundError ||
    error instanceof PhotoStorageError
  ) {
    return error.message;
  }
  return '기기에 저장된 기록을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';
}
