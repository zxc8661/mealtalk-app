import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  BorderWidth,
  ControlSize,
  Opacity,
  Radius,
  Spacing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FieldProps = TextInputProps & {
  readonly label: string;
  readonly unit?: string;
  readonly error?: string;
  readonly hint?: string;
};

export function FormField({ label, unit, error, hint, style, ...inputProps }: FieldProps) {
  const theme = useTheme();
  const description = error ?? hint;

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <ThemedText type="bodyStrong">{label}</ThemedText>
        {unit ? <ThemedText type="small" themeColor="textSecondary">{unit}</ThemedText> : null}
      </View>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={description}
        accessibilityState={{ disabled: inputProps.editable === false }}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.surfaceRaised, borderColor: error ? theme.error : theme.border },
          style,
        ]}
        {...inputProps}
      />
      {description ? (
        <ThemedText
          accessibilityLiveRegion={error ? 'polite' : undefined}
          type="small"
          themeColor={error ? 'error' : 'textSecondary'}>
          {description}
        </ThemedText>
      ) : null}
    </View>
  );
}

type Choice<T extends string> = { readonly value: T; readonly label: string };

export function ChoiceGroup<T extends string>({
  label,
  value,
  choices,
  onChange,
  disabled = false,
}: {
  readonly label: string;
  readonly value: T;
  readonly choices: readonly Choice<T>[];
  readonly onChange: (value: T) => void;
  readonly disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.field}>
      <ThemedText type="bodyStrong">{label}</ThemedText>
      <View style={styles.choiceRow}>
        {choices.map((choice) => {
          const selected = value === choice.value;
          return (
            <Pressable
              key={choice.value}
              accessibilityRole="radio"
              accessibilityLabel={choice.label}
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(choice.value)}
              style={({ pressed }) => [
                styles.choice,
                {
                  backgroundColor: selected ? theme.backgroundSelected : theme.surfaceRaised,
                  borderColor: selected ? theme.primary : theme.border,
                },
                pressed && styles.pressed,
              ]}>
              <ThemedText type={selected ? 'bodyStrong' : 'default'}>{choice.label}</ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function PrimaryButton({
  label,
  pendingLabel,
  onPress,
  disabled = false,
  pending = false,
}: {
  readonly label: string;
  readonly pendingLabel: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly pending?: boolean;
}) {
  const theme = useTheme();
  const isDisabled = disabled || pending;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={pending ? pendingLabel : label}
      accessibilityHint={pending ? '요청이 끝날 때까지 기다려주세요.' : undefined}
      accessibilityState={{ disabled: isDisabled, busy: pending }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: theme.primary },
        isDisabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      {pending ? <ActivityIndicator color={theme.onPrimary} /> : null}
      <ThemedText type="bodyStrong" style={{ color: theme.onPrimary }}>
        {pending ? pendingLabel : label}
      </ThemedText>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled = false,
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        { borderColor: theme.border, backgroundColor: theme.surfaceRaised },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      <ThemedText type="bodyStrong">{label}</ThemedText>
    </Pressable>
  );
}

export function FormSection({ children }: { readonly children: ReactNode }) {
  const theme = useTheme();
  return <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>{children}</View>;
}

const styles = StyleSheet.create({
  field: { gap: Spacing.two },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  input: {
    minHeight: ControlSize.primary,
    borderWidth: BorderWidth.thin,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
  },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  choice: {
    minHeight: ControlSize.minimum,
    minWidth: ControlSize.minimum,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderWidth: BorderWidth.thin,
    borderRadius: Radius.pill,
  },
  primaryButton: {
    minHeight: ControlSize.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.control,
  },
  secondaryButton: {
    minHeight: ControlSize.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderWidth: BorderWidth.thin,
    borderRadius: Radius.control,
  },
  section: {
    gap: Spacing.four,
    padding: Spacing.four,
    borderWidth: BorderWidth.thin,
    borderRadius: Radius.card,
  },
  pressed: { opacity: Opacity.pressed },
  disabled: { opacity: Opacity.subtle },
});
