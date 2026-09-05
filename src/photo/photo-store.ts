import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import type { MealPhotoRef } from '@/meal/meal-record';

/** Matches the limits the record format was designed around: a legible photo, not an archive master. */
const MAX_EDGE = 2048;
const JPEG_QUALITY = 0.85;
const PHOTO_DIRECTORY = 'meal-photos';

/**
 * The picked image, before it is normalized and stored.
 * Dimensions come from the picker so the resize decision needs no extra decode.
 */
export type PickedImage = {
  readonly uri: string;
  readonly width: number;
  readonly height: number;
};

export class PhotoStorageError extends Error {
  constructor(cause: unknown) {
    super('사진을 저장하지 못했습니다. 다시 시도해주세요.');
    this.name = 'PhotoStorageError';
    this.cause = cause;
  }
}

/**
 * Web has no app-private file system, so the normalized image is kept inline as
 * a data URI there. Native stores a file and the row keeps only its name.
 */
function isInlineLocator(file: string): boolean {
  return file.startsWith('data:') || file.includes('://');
}

function photoDirectory(): Directory {
  const directory = new Directory(Paths.document, PHOTO_DIRECTORY);
  directory.create({ intermediates: true, idempotent: true });
  return directory;
}

/** Resolves a stored locator to something an `Image` source can load. */
export function photoUri(file: string): string {
  return isInlineLocator(file) ? file : new File(photoDirectory(), file).uri;
}

/**
 * Normalizes a picked image to a bounded JPEG and stores it.
 *
 * The name is generated rather than taken from the picker: a gallery filename is
 * attacker-influenced on some platforms and would let one record's write land on
 * another record's bytes.
 */
export async function savePhoto(picked: PickedImage): Promise<MealPhotoRef> {
  try {
    const context = ImageManipulator.manipulate(picked.uri);
    const longestEdge = Math.max(picked.width, picked.height);
    if (longestEdge > MAX_EDGE) {
      const scale = MAX_EDGE / longestEdge;
      context.resize({
        width: Math.round(picked.width * scale),
        height: Math.round(picked.height * scale),
      });
    }

    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: JPEG_QUALITY,
      base64: Platform.OS === 'web',
    });

    if (Platform.OS === 'web') {
      return {
        file: `data:image/jpeg;base64,${result.base64 ?? ''}`,
        width: result.width,
        height: result.height,
      };
    }

    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
    new File(result.uri).moveSync(new File(photoDirectory(), name));
    return { file: name, width: result.width, height: result.height };
  } catch (cause) {
    throw new PhotoStorageError(cause);
  }
}

/**
 * Removes a photo the database no longer references.
 *
 * Deletion runs after the row is committed, so a file that survives a crash is
 * only wasted space. Failing the user's save over it would be the worse trade,
 * which is why this never throws.
 */
export function deletePhotoQuietly(photo: MealPhotoRef | null): void {
  if (photo === null || isInlineLocator(photo.file)) return;

  try {
    const file = new File(photoDirectory(), photo.file);
    if (file.exists) file.delete();
  } catch (cause) {
    console.warn('사진 파일을 정리하지 못했습니다.', cause);
  }
}
