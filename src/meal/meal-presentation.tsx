import { StyleSheet, View } from 'react-native';

import { Badge, Card, MacroChips } from '@/components/nutrition-ui';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatAmount, formatCalories } from '@/nutrition/format';
import type { Meal, MealType } from '@/meal/meal-api';

export const MEAL_TYPE_CHOICES: readonly { readonly value: MealType; readonly label: string }[] = [
  { value: 'BREAKFAST', label: '아침' },
  { value: 'LUNCH', label: '점심' },
  { value: 'DINNER', label: '저녁' },
  { value: 'SNACK', label: '간식' },
];

const ORDER: readonly MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'UNSPECIFIED'];

export function mealLabel(type: MealType): string {
  return MEAL_TYPE_CHOICES.find((choice) => choice.value === type)?.label ?? '기타';
}

/** Orders a day's meals by meal time rather than insertion order. */
export function byMealType(left: Meal, right: Meal): number {
  const compared = ORDER.indexOf(left.mealType) - ORDER.indexOf(right.mealType);
  return compared !== 0 ? compared : left.id - right.id;
}

/** Read-only meal card shared by home and the journal list. */
export function MealCard({ meal }: { readonly meal: Meal }) {
  return (
    <Card>
      <View style={styles.header}>
        <Badge label={mealLabel(meal.mealType)} />
        <ThemedText type="bodyStrong">{`${formatCalories(meal.totalCaloriesKcal)} kcal`}</ThemedText>
      </View>

      <View style={styles.items}>
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
      </View>

      <MacroChips
        macros={{
          carbohydrates: meal.totalCarbohydratesG,
          protein: meal.totalProteinG,
          fat: meal.totalFatG,
        }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  items: { gap: Spacing.two },
  itemRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.three },
  itemName: { flexShrink: 1 },
});
