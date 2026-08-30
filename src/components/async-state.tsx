import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ControlSize, Opacity, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type StateFrameProps = {
  readonly title: string;
  readonly message?: string;
  readonly children?: ReactNode;
  readonly alert?: boolean;
};

function StateFrame({ title, message, children, alert = false }: StateFrameProps) {
  return (
    <View
      accessibilityRole={alert ? 'alert' : undefined}
      accessibilityLiveRegion={alert ? 'polite' : undefined}
      style={styles.frame}>
      <ThemedText type="heading4" style={styles.centered}>{title}</ThemedText>
      {message ? <ThemedText themeColor="textSecondary" style={styles.centered}>{message}</ThemedText> : null}
      {children}
    </View>
  );
}

export function LoadingState({ label = '불러오는 중입니다.' }: { readonly label?: string }) {
  const theme = useTheme();
  return (
    <StateFrame title={label}>
      <ActivityIndicator accessibilityLabel={label} color={theme.primary} size="large" />
    </StateFrame>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  readonly title: string;
  readonly message?: string;
  readonly action?: ReactNode;
}) {
  return <StateFrame title={title} message={message}>{action}</StateFrame>;
}

export function ErrorState({
  title = '내용을 불러오지 못했습니다.',
  message,
  retryLabel = '다시 시도',
  onRetry,
}: {
  readonly title?: string;
  readonly message?: string;
  readonly retryLabel?: string;
  readonly onRetry?: () => void;
}) {
  const theme = useTheme();
  return (
    <StateFrame title={title} message={message} alert>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retry,
            { backgroundColor: theme.primary },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="bodyStrong" style={{ color: theme.onPrimary }}>{retryLabel}</ThemedText>
        </Pressable>
      ) : null}
    </StateFrame>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
  },
  centered: { textAlign: 'center' },
  retry: {
    minHeight: ControlSize.minimum,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.control,
  },
  pressed: { opacity: Opacity.pressed },
});
