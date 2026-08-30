import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/api-error';
import { useApi } from '@/api/api-context';
import { requestMessage } from '@/api/error-message';
import { ChoiceGroup, FormField, PrimaryButton, SecondaryButton } from '@/components/form-controls';
import { Card, MacroChips, SectionHeading } from '@/components/nutrition-ui';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BorderWidth,
  ControlSize,
  MaxContentWidth,
  Opacity,
  Radius,
  Spacing,
} from '@/constants/theme';
import { listFoods, type Food } from '@/food/food-api';
import { createMeal, type MealInput, type MealType } from '@/meal/meal-api';
import { MEAL_TYPE_CHOICES } from '@/meal/meal-presentation';
import {
  formatAmount,
  formatCalories,
  formatKoreanDate,
  isPositiveDecimal,
  localToday,
  shiftDate,
} from '@/nutrition/format';
import { useTheme } from '@/hooks/use-theme';

type ItemDraft = { readonly food: Food; readonly amount: string };

function scale(food: Food, amount: number) {
  const ratio = food.servingAmount > 0 ? amount / food.servingAmount : 0;
  return {
    calories: food.caloriesKcal * ratio,
    carbohydrates: food.carbohydratesG * ratio,
    protein: food.proteinG * ratio,
    fat: food.fatG * ratio,
  };
}

/** P-04 식단 추가 */
export default function MealEntryScreen() {
  const api = useApi();
  const router = useRouter();
  const theme = useTheme();

  const [mealType, setMealType] = useState<MealType>('LUNCH');
  const [date, setDate] = useState(localToday);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  // Show a starting list so the search box is never an empty dead end.
  useEffect(() => {
    const controller = new AbortController();
    void listFoods(api, '', controller.signal)
      .then((foods) => setResults(foods.slice(0, 8)))
      .catch((cause: unknown) => {
        if (controller.signal.aborted || (cause instanceof ApiError && cause.isUnauthorized)) return;
        setSearchError('식품 목록을 불러오지 못했습니다.');
      });
    return () => controller.abort();
  }, [api]);

  const totals = useMemo(
    () =>
      items.reduce(
        (sum, item) => {
          const amount = Number(item.amount);
          if (!Number.isFinite(amount) || amount <= 0) return sum;
          const scaled = scale(item.food, amount);
          return {
            calories: sum.calories + scaled.calories,
            carbohydrates: sum.carbohydrates + scaled.carbohydrates,
            protein: sum.protein + scaled.protein,
            fat: sum.fat + scaled.fat,
          };
        },
        { calories: 0, carbohydrates: 0, protein: 0, fat: 0 },
      ),
    [items],
  );

  const search = async () => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const foods = await listFoods(api, query.trim());
      setResults(foods.filter((food) => !items.some((item) => item.food.id === food.id)));
    } catch (cause: unknown) {
      if (!(cause instanceof ApiError && cause.isUnauthorized)) setSearchError(requestMessage(cause));
    } finally {
      setIsSearching(false);
    }
  };

  const addFood = (food: Food) => {
    setItems((previous) => [...previous, { food, amount: String(food.servingAmount) }]);
    setResults((previous) => previous.filter((candidate) => candidate.id !== food.id));
    setFormError(null);
  };

  const save = async () => {
    if (savingRef.current) return;
    if (items.length === 0) {
      setFormError('최소 한 가지 식품을 추가해주세요.');
      return;
    }
    if (items.some((item) => !isPositiveDecimal(item.amount))) {
      setFormError('각 식품의 섭취량을 0보다 큰 수로 입력해주세요.');
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    setFormError(null);
    const input: MealInput = {
      mealDate: date,
      mealType,
      eatenAt: null,
      items: items.map((item) => ({ foodId: item.food.id, amount: Number(item.amount) })),
    };
    try {
      const saved = await createMeal(api, input);
      router.replace({ pathname: '/meal-saved', params: { mealId: String(saved.id), date } });
    } catch (cause: unknown) {
      if (cause instanceof ApiError && cause.isUnauthorized) return;
      setFormError(requestMessage(cause));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="식단 추가" />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card>
            <ChoiceGroup
              label="식사 구분"
              value={mealType}
              choices={MEAL_TYPE_CHOICES}
              disabled={isSaving}
              onChange={setMealType}
            />
            <View style={styles.dateRow}>
              <SecondaryButton label="이전 날짜" disabled={isSaving} onPress={() => setDate(shiftDate(date, -1))} />
              <View style={styles.dateLabel}>
                <ThemedText type="caption" themeColor="textSecondary">
                  섭취 날짜
                </ThemedText>
                <ThemedText type="bodyStrong">{formatKoreanDate(date)}</ThemedText>
              </View>
              <SecondaryButton label="다음 날짜" disabled={isSaving} onPress={() => setDate(shiftDate(date, 1))} />
            </View>
          </Card>

          <Card>
            <SectionHeading title="식품 검색" />
            <FormField
              label="식품 이름"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => void search()}
              placeholder="예: 닭가슴살"
              editable={!isSaving}
              returnKeyType="search"
            />
            <PrimaryButton
              label="검색"
              pendingLabel="검색 중입니다"
              pending={isSearching}
              onPress={() => void search()}
            />
            {searchError ? (
              <ThemedText type="small" themeColor="error" accessibilityLiveRegion="polite">
                {searchError}
              </ThemedText>
            ) : null}

            {results.length > 0 ? (
              <View style={styles.results}>
                {results.map((food) => (
                  <Pressable
                    key={food.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${food.name} 추가`}
                    disabled={isSaving}
                    onPress={() => addFood(food)}
                    style={({ pressed }) => [
                      styles.resultRow,
                      { borderColor: theme.border, backgroundColor: theme.surfaceRaised },
                      pressed && styles.pressed,
                    ]}>
                    <View style={styles.resultCopy}>
                      <ThemedText type="bodyStrong">{food.name}</ThemedText>
                      <ThemedText type="caption" themeColor="textSecondary">
                        {`${formatAmount(food.servingAmount)}${food.servingUnit} 기준 · ${formatCalories(food.caloriesKcal)} kcal`}
                      </ThemedText>
                    </View>
                    <ThemedText type="bodyStrong" themeColor="primary">
                      추가
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                검색 결과가 없습니다. 다른 이름으로 찾아보세요.
              </ThemedText>
            )}
          </Card>

          <Card>
            <SectionHeading
              title="선택한 식품"
              action={
                <ThemedText type="small" themeColor="textSecondary">{`${items.length}개`}</ThemedText>
              }
            />
            {items.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                위에서 식품을 검색해 추가하면 섭취량을 입력할 수 있어요.
              </ThemedText>
            ) : (
              items.map((item) => {
                const amount = Number(item.amount);
                const scaled = scale(item.food, Number.isFinite(amount) && amount > 0 ? amount : 0);
                return (
                  <View
                    key={item.food.id}
                    style={[styles.itemBlock, { backgroundColor: theme.backgroundElement }]}>
                    <View style={styles.itemHeader}>
                      <ThemedText type="bodyStrong">{item.food.name}</ThemedText>
                      <ThemedText type="bodyStrong">
                        {`${formatCalories(scaled.calories)} kcal`}
                      </ThemedText>
                    </View>
                    <FormField
                      label={`${item.food.name} 섭취량`}
                      unit={item.food.servingUnit}
                      value={item.amount}
                      onChangeText={(value) => {
                        setItems((previous) =>
                          previous.map((candidate) =>
                            candidate.food.id === item.food.id
                              ? { ...candidate, amount: value }
                              : candidate,
                          ),
                        );
                        setFormError(null);
                      }}
                      keyboardType="decimal-pad"
                      inputMode="decimal"
                      editable={!isSaving}
                    />
                    <MacroChips
                      macros={{
                        carbohydrates: scaled.carbohydrates,
                        protein: scaled.protein,
                        fat: scaled.fat,
                      }}
                    />
                    <SecondaryButton
                      label={`${item.food.name} 삭제`}
                      disabled={isSaving}
                      onPress={() => {
                        setItems((previous) =>
                          previous.filter((candidate) => candidate.food.id !== item.food.id),
                        );
                        setFormError(null);
                      }}
                    />
                  </View>
                );
              })
            )}
          </Card>

          {formError ? (
            <ThemedText type="small" themeColor="error" accessibilityLiveRegion="polite">
              {formError}
            </ThemedText>
          ) : null}
        </ScrollView>

        <View style={[styles.saveBar, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
          <View style={styles.saveTotals}>
            <ThemedText type="small" themeColor="textSecondary">
              합계
            </ThemedText>
            <ThemedText type="heading4">{`${formatCalories(totals.calories)} kcal`}</ThemedText>
          </View>
          <PrimaryButton
            label="저장하기"
            pendingLabel="저장 중입니다"
            pending={isSaving}
            disabled={items.length === 0}
            onPress={() => void save()}
          />
        </View>
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
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dateLabel: { flex: 1, alignItems: 'center' },
  results: { gap: Spacing.two },
  resultRow: {
    minHeight: ControlSize.minimum,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: BorderWidth.thin,
    borderRadius: Radius.control,
  },
  resultCopy: { flexShrink: 1, gap: Spacing.half },
  itemBlock: { gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.control },
  itemHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.two },
  saveBar: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderTopWidth: BorderWidth.thin,
  },
  saveTotals: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  pressed: { opacity: Opacity.pressed },
});
