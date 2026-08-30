import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderWidth, Radius, Spacing } from '@/constants/theme';
import { formatCalories, formatGrams, progressRatio } from '@/nutrition/format';
import { useTheme } from '@/hooks/use-theme';

/** Macro accent colors. Always paired with a text label, never color alone. */
export const MACRO_COLORS = {
  carbohydrates: '#8A5A12',
  protein: '#176B87',
  fat: '#7A4BAB',
} as const;

export const MACRO_LABELS = {
  carbohydrates: '탄수화물',
  protein: '단백질',
  fat: '지방',
} as const;

export type MacroKey = keyof typeof MACRO_LABELS;
export const MACRO_KEYS: readonly MacroKey[] = ['carbohydrates', 'protein', 'fat'];

export type Macros = Readonly<Record<MacroKey, number>>;

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
      style={[styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }, style]}>
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

/** Labelled progress bar with the value and its target. */
export function TargetBar({
  label,
  value,
  target,
  unit,
  color,
}: {
  readonly label: string;
  readonly value: number;
  readonly target: number;
  readonly unit: 'kcal' | 'g';
  readonly color: string;
}) {
  const theme = useTheme();
  const ratio = progressRatio(value, target);
  const percent = target > 0 ? Math.round((value / target) * 100) : 0;
  const format = unit === 'kcal' ? formatCalories : formatGrams;

  return (
    <View style={styles.barBlock}>
      <View style={styles.barHeader}>
        <ThemedText type="bodyStrong">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          <ThemedText type="smallBold">{format(value)}</ThemedText>
          {` / ${format(target)}`}
          {unit === 'kcal' ? ' kcal' : ''}
        </ThemedText>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: Math.round(target), now: Math.round(value), text: `${percent}퍼센트` }}
        style={[styles.barTrack, { backgroundColor: theme.backgroundSelected }]}>
        <View style={[styles.barFill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

/**
 * Consumed-only macro row. Used for carbohydrate and fat, which have no
 * server-side target, so no progress is implied.
 */
export function ValueRow({ label, value, color }: { readonly label: string; readonly value: number; readonly color: string }) {
  return (
    <View style={styles.valueRow}>
      <View style={styles.valueLabel}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <ThemedText type="bodyStrong">{label}</ThemedText>
      </View>
      <ThemedText type="bodyStrong">{formatGrams(value)}</ThemedText>
    </View>
  );
}

/** Compact macro chips for meal cards. */
export function MacroChips({ macros }: { readonly macros: Macros }) {
  const theme = useTheme();
  return (
    <View style={styles.chipRow}>
      {MACRO_KEYS.map((key) => (
        <View key={key} style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="caption" style={{ color: MACRO_COLORS[key], fontWeight: '700' }}>
            {MACRO_LABELS[key].slice(0, 2)}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {formatGrams(macros[key])}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

/**
 * Calorie hero. Uses a large number plus a thick bar rather than a ring, so the
 * app needs no SVG dependency while keeping the same information hierarchy.
 */
export function CalorieSummary({
  consumed,
  target,
}: {
  readonly consumed: number;
  readonly target: number | null;
}) {
  const theme = useTheme();

  if (target === null) {
    return (
      <View style={styles.calorieBlock}>
        <ThemedText type="heading1">{formatCalories(consumed)}</ThemedText>
        <ThemedText themeColor="textSecondary">kcal 섭취</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
          목표 칼로리를 설정하면 달성률을 함께 볼 수 있습니다.
        </ThemedText>
      </View>
    );
  }

  const remaining = Math.max(Math.round(target - consumed), 0);
  const percent = Math.round((consumed / target) * 100);

  return (
    <View style={styles.calorieBlock}>
      <View style={styles.calorieNumbers}>
        <ThemedText type="heading1">{formatCalories(consumed)}</ThemedText>
        <ThemedText themeColor="textSecondary">{` / ${formatCalories(target)} kcal`}</ThemedText>
      </View>
      <ThemedText type="smallBold" themeColor="primary">
        {remaining > 0 ? `${formatCalories(remaining)} kcal 남음` : '목표를 채웠어요'}
      </ThemedText>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="칼로리"
        accessibilityValue={{ min: 0, max: Math.round(target), now: Math.round(consumed), text: `${percent}퍼센트` }}
        style={[styles.calorieTrack, { backgroundColor: theme.backgroundSelected }]}>
        <View
          style={[
            styles.barFill,
            { width: `${progressRatio(consumed, target) * 100}%`, backgroundColor: theme.primary },
          ]}
        />
      </View>
    </View>
  );
}

export function SectionHeading({ title, action }: { readonly title: string; readonly action?: ReactNode }) {
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
  barBlock: { gap: Spacing.two },
  barHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.two },
  barTrack: { height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: Radius.pill },
  valueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  valueLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 10, height: 10, borderRadius: 5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  calorieBlock: { alignItems: 'center', gap: Spacing.two },
  calorieNumbers: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.one },
  calorieTrack: { alignSelf: 'stretch', height: 12, borderRadius: Radius.pill, overflow: 'hidden', marginTop: Spacing.two },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  centered: { textAlign: 'center' },
});
