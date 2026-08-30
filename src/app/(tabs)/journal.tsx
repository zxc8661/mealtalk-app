import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, LoadingState } from '@/components/async-state';
import { PrimaryButton, SecondaryButton } from '@/components/form-controls';
import { Card, MacroChips, SectionHeading } from '@/components/nutrition-ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { byMealType, MealCard } from '@/meal/meal-presentation';
import { useMealJournal } from '@/meal/use-meal-journal';
import { formatCalories, formatKoreanDate, localToday, shiftDate } from '@/nutrition/format';

/** P-05 식단 목록 */
export default function JournalScreen() {
  const router = useRouter();
  const [date, setDate] = useState(localToday);
  const [reloadToken, setReloadToken] = useState(0);
  const { journal, isLoading, error, reload } = useMealJournal(date, reloadToken);

  useFocusEffect(
    useCallback(() => {
      setReloadToken((token) => token + 1);
    }, []),
  );

  const meals = journal ? [...journal.meals].sort(byMealType) : [];

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText accessibilityRole="header" type="heading2">
            식단
          </ThemedText>

          <View style={styles.dateRow}>
            <SecondaryButton label="이전 날짜" onPress={() => setDate(shiftDate(date, -1))} />
            <View style={styles.dateLabel}>
              <ThemedText type="bodyStrong">{formatKoreanDate(date)}</ThemedText>
            </View>
            <SecondaryButton label="다음 날짜" onPress={() => setDate(shiftDate(date, 1))} />
          </View>
          <SecondaryButton label="오늘로 이동" onPress={() => setDate(localToday())} />

          {isLoading && !journal ? <LoadingState label="식단을 불러오는 중입니다." /> : null}
          {error && !journal ? (
            <ErrorState title="식단을 불러오지 못했습니다." message={error} onRetry={reload} />
          ) : null}

          {journal ? (
            <>
              <Card>
                <SectionHeading title="하루 합계" />
                <ThemedText type="heading3">
                  {`${formatCalories(journal.totalCaloriesKcal)} kcal`}
                </ThemedText>
                <MacroChips
                  macros={{
                    carbohydrates: journal.totalCarbohydratesG,
                    protein: journal.totalProteinG,
                    fat: journal.totalFatG,
                  }}
                />
              </Card>

              <View style={styles.section}>
                {meals.length > 0 ? (
                  meals.map((meal) => <MealCard key={meal.id} meal={meal} />)
                ) : (
                  <EmptyState
                    title="기록된 식단이 없어요"
                    message="이 날짜에 먹은 음식을 추가해 보세요."
                  />
                )}
              </View>

              <PrimaryButton
                label="식단 추가하기"
                pendingLabel="여는 중입니다"
                onPress={() => router.push('/meal-entry')}
              />
            </>
          ) : null}
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
    // Web renders the tab bar floating at the top; keep the title clear of it.
    paddingTop: Platform.OS === 'web' ? Spacing.six : Spacing.four,
    paddingBottom: Spacing.six,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dateLabel: { flex: 1, alignItems: 'center' },
  section: { gap: Spacing.three },
});
