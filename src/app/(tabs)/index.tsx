import { Link, Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, LoadingState } from '@/components/async-state';
import { PrimaryButton } from '@/components/form-controls';
import {
  CalorieSummary,
  Card,
  MACRO_COLORS,
  MACRO_LABELS,
  SectionHeading,
  TargetBar,
  ValueRow,
} from '@/components/nutrition-ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ControlSize, MaxContentWidth, Opacity, Radius, Spacing } from '@/constants/theme';
import { byMealType, MealCard } from '@/meal/meal-presentation';
import { useMealJournal } from '@/meal/use-meal-journal';
import { formatKoreanDate, localToday } from '@/nutrition/format';
import { useCurrentUser } from '@/profile/current-user-context';
import { targetValue } from '@/profile/targets';
import { useTheme } from '@/hooks/use-theme';

/** P-03 홈 */
export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, isLoading: userLoading, error: userError, reload: reloadUser } = useCurrentUser();
  const [today, setToday] = useState(localToday);
  const [reloadToken, setReloadToken] = useState(0);
  const { journal, isLoading, error, reload } = useMealJournal(today, reloadToken);

  // Returning from a save must show the new meal, and a day rollover must move the date.
  useFocusEffect(
    useCallback(() => {
      setToday(localToday());
      setReloadToken((token) => token + 1);
    }, []),
  );

  if (userLoading) {
    return (
      <Frame>
        <LoadingState label="프로필을 불러오는 중입니다." />
      </Frame>
    );
  }

  if (userError) {
    return (
      <Frame>
        <ErrorState title="프로필을 불러오지 못했습니다." message={userError} onRetry={reloadUser} />
      </Frame>
    );
  }

  // First run sends the user through profile setup before the journal is useful.
  if (user && !user.profileCompleted) return <Redirect href="/onboarding" />;

  const calorieTarget = targetValue(user, 'DAILY_CALORIES');
  const proteinTarget = targetValue(user, 'DAILY_PROTEIN');
  const meals = journal ? [...journal.meals].sort(byMealType) : [];

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

          {isLoading && !journal ? <LoadingState label="오늘 식단을 불러오는 중입니다." /> : null}

          {error && !journal ? (
            <ErrorState title="식단을 불러오지 못했습니다." message={error} onRetry={reload} />
          ) : null}

          {journal ? (
            <>
              <Card>
                <CalorieSummary consumed={journal.totalCaloriesKcal} target={calorieTarget} />

                <View style={styles.macros}>
                  {proteinTarget !== null ? (
                    <TargetBar
                      label={MACRO_LABELS.protein}
                      value={journal.totalProteinG}
                      target={proteinTarget}
                      unit="g"
                      color={MACRO_COLORS.protein}
                    />
                  ) : (
                    <ValueRow
                      label={MACRO_LABELS.protein}
                      value={journal.totalProteinG}
                      color={MACRO_COLORS.protein}
                    />
                  )}
                  {/* The API stores no carbohydrate or fat target, so these show intake only. */}
                  <ValueRow
                    label={MACRO_LABELS.carbohydrates}
                    value={journal.totalCarbohydratesG}
                    color={MACRO_COLORS.carbohydrates}
                  />
                  <ValueRow
                    label={MACRO_LABELS.fat}
                    value={journal.totalFatG}
                    color={MACRO_COLORS.fat}
                  />
                </View>
              </Card>

              <PrimaryButton
                label="식단 추가하기"
                pendingLabel="여는 중입니다"
                onPress={() => router.push('/meal-entry')}
              />

              <View style={styles.section}>
                <SectionHeading
                  title="오늘 등록한 식단"
                  action={
                    <Link href="/journal" style={styles.link}>
                      <ThemedText type="smallBold" themeColor="primary">
                        전체 보기
                      </ThemedText>
                    </Link>
                  }
                />
                {meals.length > 0 ? (
                  meals.map((meal) => <MealCard key={meal.id} meal={meal} />)
                ) : (
                  <EmptyState
                    title="아직 기록한 식단이 없어요"
                    message="식단 추가하기를 눌러 오늘 먹은 음식을 기록해 보세요."
                  />
                )}
              </View>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Frame({ children }: { readonly children: React.ReactNode }) {
  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.centered}>{children}</SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center' },
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
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  iconButton: {
    width: ControlSize.minimum,
    height: ControlSize.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  macros: { gap: Spacing.three, marginTop: Spacing.two },
  section: { gap: Spacing.three },
  link: { paddingVertical: Spacing.one },
  pressed: { opacity: Opacity.pressed },
});
