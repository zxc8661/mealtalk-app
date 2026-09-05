import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Card({
  children,
  style,
}: {
  readonly children: ReactNode;
  readonly style?: ViewStyle;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surfaceRaised, borderColor: theme.border },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Badge({ label }: { readonly label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText type="smallBold" themeColor="primary">
        {label}
      </ThemedText>
    </View>
  );
}

export function SectionHeading({
  title,
  action,
}: {
  readonly title: string;
  readonly action?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeading}>
      <ThemedText accessibilityRole="header" type="heading4">
        {title}
      </ThemedText>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderWidth: BorderWidth.thin,
    borderRadius: Radius.card,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
