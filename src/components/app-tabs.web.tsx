import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BorderWidth,
  MaxContentWidth,
  Opacity,
  Radius,
  Spacing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <NavigationBar>
          <TabTrigger name="journal" href="/" asChild>
            <TabButton>식사 기록</TabButton>
          </TabTrigger>
          <TabTrigger name="foods" href="/explore" asChild>
            <TabButton>내 식품</TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton>프로필</TabButton>
          </TabTrigger>
        </NavigationBar>
      </TabList>
    </Tabs>
  );
}

function NavigationBar({ children, ...props }: TabListProps) {
  const theme = useTheme();
  return (
    <View {...props} style={styles.navigationFrame}>
      <ThemedView
        accessibilityRole="tablist"
        type="surfaceRaised"
        style={[styles.navigation, { borderColor: theme.border }]}>
        {children}
      </ThemedView>
    </View>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const theme = useTheme();
  return (
    <Pressable
      {...props}
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [
        styles.tabButton,
        { backgroundColor: isFocused ? theme.backgroundSelected : theme.surfaceRaised },
        pressed && styles.pressed,
      ]}>
      <ThemedText type={isFocused ? 'bodyStrong' : 'small'} themeColor={isFocused ? 'text' : 'textSecondary'}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { height: '100%' },
  navigationFrame: {
    position: 'absolute',
    bottom: Spacing.three,
    width: '100%',
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
  navigation: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.two,
    borderWidth: BorderWidth.thin,
    borderRadius: Radius.pill,
  },
  tabButton: {
    flex: 1,
    minHeight: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  pressed: { opacity: Opacity.pressed },
});
