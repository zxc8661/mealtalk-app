import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderWidth, ControlSize, Opacity, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Top bar for stack screens, with an optional back affordance. */
export function ScreenHeader({
  title,
  showBack = true,
}: {
  readonly title: string;
  readonly showBack?: boolean;
}) {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View
      style={[styles.header, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
      {showBack && router.canGoBack() ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <ThemedText type="heading4">‹</ThemedText>
        </Pressable>
      ) : (
        <View style={styles.button} />
      )}
      <ThemedText accessibilityRole="header" type="bodyStrong" numberOfLines={1} style={styles.title}>
        {title}
      </ThemedText>
      <View style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    borderBottomWidth: BorderWidth.thin,
  },
  button: {
    width: ControlSize.minimum,
    height: ControlSize.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  title: { flex: 1, textAlign: 'center' },
  pressed: { opacity: Opacity.pressed },
});
