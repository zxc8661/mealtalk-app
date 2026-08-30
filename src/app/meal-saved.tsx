import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState, LoadingState } from '@/components/async-state';
import { PrimaryButton, SecondaryButton } from '@/components/form-controls';
import { Badge, Card, MacroChips, SectionHeading } from '@/components/nutrition-ui';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { mealLabel } from '@/meal/meal-presentation';
import { useMealJournal } from '@/meal/use-meal-journal';
import { formatAmount, formatCalories, formatKoreanDate, localToday } from '@/nutrition/format';
import { useCurrentUser } from '@/profile/current-user-context';
import { targetValue } from '@/profile/targets';

/** 식단 저장 결과: confirms the totals the server computed. */
export default function MealSavedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mealId?: string; date?: string }>();
  const { user } = useCurrentUser();

  const date = params.date ?? localToday();
  const mealId = Number(params.mealId);
  const { journal, isLoading, error, reload } = useMealJournal(date);

  const meal = journal?.meals.find((candidate) => candidate.id === mealId) ?? null;
  const calorieTarget = targetValue(user, 'DAILY_CALORIES');

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="저장 결과" showBack={false} />
        <ScrollView contentContainerStyle={styles.content}>
          {isLoading && !journal ? <LoadingState label="저장 결과를 불러오는 중입니다." /> : null}
          {error && !journal ? (
            <ErrorState title="저장 결과를 불러오지 못했습니다." message={error} onRetry={reload} />
          ) : null}

          {journal ? (
            <>
              <View style={styles.hero}>
                <ThemedText accessibilityRole="header" type="heading3">
                  식단을 저장했어요
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.centered}>
                  {`${formatKoreanDate(date)} 기록이 추가되었습니다.`}
                </ThemedText>
              </View>

              {meal ? (
                <Card>
                  <View style={styles.cardHeader}>
                    <Badge label={mealLabel(meal.mealType)} />
                    <ThemedText type="heading4">
                      {`${formatCalories(meal.totalCaloriesKcal)} kcal`}
                    </ThemedText>
                  </View>
                  {meal.items.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <ThemedText type="smallBold" style={styles.itemName}>
                        {item.foodName}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {`${formatAmount(item.amount)} ${item.unit} · ${formatCalories(item.caloriesKcal)} kcal`}
                      </ThemedText>
                    </View>
                  ))}
                  <MacroChips
                    macros={{
                      carbohydrates: meal.totalCarbohydratesG,
                      protein: meal.totalProteinG,
                      fat: meal.totalFatG,
                    }}
                  />
                </Card>
              ) : null}

              <Card>
                <SectionHeading title="오늘 누적" />
                <ThemedText type="heading4">
                  {calorieTarget !== null
                    ? `${formatCalories(journal.totalCaloriesKcal)} / ${formatCalories(calorieTarget)} kcal`
                    : `${formatCalories(journal.totalCaloriesKcal)} kcal`}
                </ThemedText>
                {calorieTarget !== null ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {journal.totalCaloriesKcal < calorieTarget
                      ? `목표까지 ${formatCalories(calorieTarget - journal.totalCaloriesKcal)} kcal 남았어요.`
                      : '오늘 목표 칼로리를 채웠어요.'}
                  </ThemedText>
                ) : null}
                <MacroChips
                  macros={{
                    carbohydrates: journal.totalCarbohydratesG,
                    protein: journal.totalProteinG,
                    fat: journal.totalFatG,
                  }}
                />
              </Card>

              <View style={styles.actions}>
                <PrimaryButton
                  label="홈에서 확인하기"
                  pendingLabel="이동 중입니다"
                  onPress={() => router.replace('/')}
                />
                <SecondaryButton label="식단 목록 보기" onPress={() => router.replace('/journal')} />
              </View>
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
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
  },
  hero: { alignItems: 'center', gap: Spacing.two },
  centered: { textAlign: 'center' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  itemRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.three },
  itemName: { flexShrink: 1 },
  actions: { gap: Spacing.two },
});
