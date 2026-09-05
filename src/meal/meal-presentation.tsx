import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Card } from '@/components/cards';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatEatenTime } from '@/format/date';
import type { MealRecord, MealType } from '@/meal/meal-record';
import { MealPhoto } from '@/photo/meal-photo';

export const MEAL_TYPE_CHOICES: readonly { readonly value: MealType; readonly label: string }[] = [
  { value: 'BREAKFAST', label: '아침' },
  { value: 'LUNCH', label: '점심' },
  { value: 'DINNER', label: '저녁' },
  { value: 'SNACK', label: '간식' },
];

export function mealLabel(type: MealType): string {
  return MEAL_TYPE_CHOICES.find((choice) => choice.value === type)?.label ?? '기타';
}

/**
 * One record: what was eaten, shown as the user left it.
 *
 * Nothing is derived here. A record carries a photo, a memo, or both, so the card
 * renders exactly those and never a number the app did not measure.
 */
export function MealCard({
  meal,
  actions,
}: {
  readonly meal: MealRecord;
  readonly actions?: ReactNode;
}) {
  const eatenTime = formatEatenTime(meal.eatenAt);
  const label = mealLabel(meal.mealType);

  return (
    <Card>
      <View style={styles.header}>
        <Badge label={label} />
        {eatenTime ? (
          <ThemedText type="small" themeColor="textSecondary">
            {eatenTime}
          </ThemedText>
        ) : null}
      </View>

      {meal.photo ? <MealPhoto photo={meal.photo} accessibilityLabel={`${label} 사진`} /> : null}

      {meal.memo ? <ThemedText>{meal.memo}</ThemedText> : null}

      {actions}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
