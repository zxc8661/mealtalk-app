import * as ImagePicker from 'expo-image-picker';

import type { PickedImage } from '@/photo/photo-store';

export type PickSource = 'camera' | 'library';

/**
 * Why no image arrived, kept apart on purpose: a cancel is the user changing
 * their mind and must stay silent, while a denial needs an explanation of how to
 * recover. Collapsing them into `null` would force the screen to guess.
 */
export type PickResult =
  | { readonly status: 'selected'; readonly image: PickedImage }
  | { readonly status: 'cancelled' }
  | { readonly status: 'denied'; readonly source: PickSource };

const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsMultipleSelection: false,
  quality: 1,
};

export async function pickImage(source: PickSource): Promise<PickResult> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { status: 'denied', source };

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(OPTIONS)
      : await ImagePicker.launchImageLibraryAsync(OPTIONS);
  if (result.canceled) return { status: 'cancelled' };

  const asset = result.assets[0];
  if (asset === undefined) return { status: 'cancelled' };

  return {
    status: 'selected',
    image: { uri: asset.uri, width: asset.width, height: asset.height },
  };
}

export function permissionMessage(source: PickSource): string {
  return source === 'camera'
    ? '카메라 권한이 없어 사진을 찍을 수 없습니다. 설정에서 권한을 허용하면 사진을 추가할 수 있어요. 메모만 남겨도 기록됩니다.'
    : '사진 접근 권한이 없어 앨범을 열 수 없습니다. 설정에서 권한을 허용하면 사진을 추가할 수 있어요. 메모만 남겨도 기록됩니다.';
}
