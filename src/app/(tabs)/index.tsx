import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, LoadingState } from '@/components/async-state';
import { SectionHeading } from '@/components/cards';
import { PrimaryButton } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ControlSize, MaxContentWidth, Opacity, Radius, Spacing } from '@/constants/theme';
import { formatKoreanDate, localToday } from '@/format/date';
import { MealCard } from '@/meal/meal-presentation';
import { useMealJournal } from '@/meal/use-meal-journal';
import { useTheme } from '@/hooks/use-theme';

/** P-03 홈 */
export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [today, setToday] = useState(localToday);
  const [reloadToken, setReloadToken] = useState(0);
  const { meals, isLoading, error, reload } = useMealJournal(today, reloadToken);

  // Returning from a save must show the new record, and a day rollover must move the date.
  useFocusEffect(
    useCallback(() => {
      setToday(localToday());
      setReloadToken((token) => token + 1);
    }, []),
  );

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View>
              <ThemedText type="small" themeColor="textSecondary">
                오늘
              </ThemedText>
              <ThemedText accessibilityRole="header" type="heading2">
                {formatKoreanDate(today)}
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="프로필 및 설정"
              onPress={() => router.push('/profile')}
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="bodyStrong">⚙</ThemedText>
            </Pressable>
          </View>

          {error ? (
            <ErrorState title="기록을 불러오지 못했습니다." message={error} onRetry={reload} />
          ) : null}

          <PrimaryButton
            label="기록 추가하기"
            pendingLabel="여는 중입니다"
            onPress={() => router.push('/meal-entry')}
          />

          <View style={styles.section}>
            <SectionHeading
              title="오늘의 기록"
              action={
                <Link href="/journal" style={styles.link}>
                  <ThemedText type="smallBold" themeColor="primary">
                    전체 보기
                  </ThemedText>
                </Link>
              }
            />
            {isLoading ? <LoadingState label="오늘 기록을 불러오는 중입니다." /> : null}
            {!isLoading && meals.length > 0
              ? meals.map((meal) => <MealCard key={meal.id} meal={meal} />)
              : null}
            {!isLoading && meals.length === 0 && error === null ? (
              <EmptyState
                title="아직 오늘 기록이 없어요"
                message="기록 추가하기를 눌러 사진이나 메모를 남겨 보세요."
              />
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.three,
    // On web the tab bar floats over the top of the screen, so the first row
    // needs clearance; native draws it at the bottom instead.
    paddingTop: Platform.OS === 'web' ? Spacing.six : Spacing.four,
    paddingBottom: Spacing.six,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  iconButton: {
    width: ControlSize.minimum,
    height: ControlSize.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  section: { gap: Spacing.three },
  link: { paddingVertical: Spacing.one },
  pressed: { opacity: Opacity.pressed },
});
