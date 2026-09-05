import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MealPhotoRef } from '@/meal/meal-record';
import { photoUri } from '@/photo/photo-store';

/**
 * A record's photo, from the device.
 *
 * A file can go missing between the row being written and this render - a user
 * clearing app storage, a restore that skipped the media. That shows as a stated
 * placeholder rather than a blank box, because the record itself is still valid
 * and its memo is still worth reading.
 */
export function MealPhoto({
  photo,
  accessibilityLabel,
}: {
  readonly photo: MealPhotoRef;
  readonly accessibilityLabel: string;
}) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const aspectRatio = photo.height > 0 ? photo.width / photo.height : 1;

  if (failed) {
    return (
      <View
        style={[styles.placeholder, { backgroundColor: theme.backgroundElement, aspectRatio }]}>
        <ThemedText type="small" themeColor="textSecondary">
          사진을 불러오지 못했습니다.
        </ThemedText>
      </View>
    );
  }

  return (
    <Image
      // `alt` is what expo-image puts on the web <img>; accessibilityLabel is
      // what the native screen readers announce. Both are needed to name it.
      alt={accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      source={{ uri: photoUri(photo.file) }}
      contentFit="cover"
      onError={() => setFailed(true)}
      style={[styles.image, { aspectRatio, backgroundColor: theme.backgroundElement }]}
    />
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', borderRadius: Radius.control },
  placeholder: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    borderRadius: Radius.control,
  },
});
