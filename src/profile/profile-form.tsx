import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/api-error';
import { useApi } from '@/api/api-context';
import { requestMessage } from '@/api/error-message';
import { ChoiceGroup, FormField, PrimaryButton } from '@/components/form-controls';
import { Card, SectionHeading } from '@/components/nutrition-ui';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { isPositiveDecimal } from '@/nutrition/format';
import {
  replaceProfile,
  type ActivityLevel,
  type CurrentUser,
  type GoalMode,
  type NutritionTarget,
  type ProfileUpdate,
} from '@/profile/profile-api';
import { ACTIVITY_CHOICES, findTarget, GOAL_CHOICES } from '@/profile/targets';

type Errors = Partial<Record<'heightCm' | 'weightKg' | 'targetWeight' | 'calories' | 'protein', string>>;

function initialValue(user: CurrentUser | null, type: NutritionTarget['targetType']): string {
  const target = user ? findTarget(user.targets, type) : null;
  return target ? String(target.targetValue) : '';
}

/**
 * Shared editor for the profile and its targets. Used both for first-run setup
 * and for later edits; only the copy and the submit label differ.
 */
export function ProfileForm({
  user,
  mode,
  onSaved,
}: {
  readonly user: CurrentUser | null;
  readonly mode: 'setup' | 'edit';
  readonly onSaved: (user: CurrentUser) => void;
}) {
  const api = useApi();

  const [heightCm, setHeightCm] = useState(() => (user?.profile ? String(user.profile.heightCm) : ''));
  const [weightKg, setWeightKg] = useState(() => (user?.profile ? String(user.profile.weightKg) : ''));
  const [targetWeight, setTargetWeight] = useState(() => initialValue(user, 'TARGET_WEIGHT'));
  const [calories, setCalories] = useState(() => initialValue(user, 'DAILY_CALORIES'));
  const [protein, setProtein] = useState(() => initialValue(user, 'DAILY_PROTEIN'));
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    () => user?.profile?.activityLevel ?? 'MEDIUM',
  );
  const [goalMode, setGoalMode] = useState<GoalMode>(() => user?.profile?.goalMode ?? 'MAINTAIN');

  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const save = async () => {
    if (savingRef.current) return;

    const nextErrors: Errors = {};
    if (!isPositiveDecimal(heightCm)) nextErrors.heightCm = '0보다 큰 키를 입력해주세요.';
    if (!isPositiveDecimal(weightKg)) nextErrors.weightKg = '0보다 큰 체중을 입력해주세요.';
    if (targetWeight && !isPositiveDecimal(targetWeight)) nextErrors.targetWeight = '0보다 큰 수를 입력해주세요.';
    if (calories && !isPositiveDecimal(calories)) nextErrors.calories = '0보다 큰 수를 입력해주세요.';
    if (protein && !isPositiveDecimal(protein)) nextErrors.protein = '0보다 큰 수를 입력해주세요.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError('입력값을 확인해주세요.');
      return;
    }

    const targets: NutritionTarget[] = [];
    if (targetWeight) targets.push({ targetType: 'TARGET_WEIGHT', targetValue: Number(targetWeight), dueDate: null });
    if (calories) targets.push({ targetType: 'DAILY_CALORIES', targetValue: Number(calories), dueDate: null });
    if (protein) targets.push({ targetType: 'DAILY_PROTEIN', targetValue: Number(protein), dueDate: null });

    const update: ProfileUpdate = {
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      activityLevel,
      goalMode,
      targets,
    };

    savingRef.current = true;
    setIsSaving(true);
    setFormError(null);
    try {
      onSaved(await replaceProfile(api, update));
    } catch (cause: unknown) {
      if (cause instanceof ApiError && cause.isUnauthorized) return;
      setFormError(requestMessage(cause));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.form}>
      <Card>
        <SectionHeading title="신체 정보" />
        <FormField
          label="키"
          unit="cm"
          value={heightCm}
          onChangeText={(value) => {
            setHeightCm(value);
            setErrors((previous) => ({ ...previous, heightCm: undefined }));
          }}
          error={errors.heightCm}
          keyboardType="decimal-pad"
          inputMode="decimal"
          editable={!isSaving}
        />
        <FormField
          label="현재 체중"
          unit="kg"
          value={weightKg}
          onChangeText={(value) => {
            setWeightKg(value);
            setErrors((previous) => ({ ...previous, weightKg: undefined }));
          }}
          error={errors.weightKg}
          keyboardType="decimal-pad"
          inputMode="decimal"
          editable={!isSaving}
        />
        <FormField
          label="목표 체중 (선택)"
          unit="kg"
          value={targetWeight}
          onChangeText={(value) => {
            setTargetWeight(value);
            setErrors((previous) => ({ ...previous, targetWeight: undefined }));
          }}
          error={errors.targetWeight}
          keyboardType="decimal-pad"
          inputMode="decimal"
          editable={!isSaving}
        />
      </Card>

      <Card>
        <SectionHeading title="활동량과 목표" />
        <ChoiceGroup
          label="활동량"
          value={activityLevel}
          choices={ACTIVITY_CHOICES}
          disabled={isSaving}
          onChange={setActivityLevel}
        />
        <ChoiceGroup
          label="목표 유형"
          value={goalMode}
          choices={GOAL_CHOICES}
          disabled={isSaving}
          onChange={setGoalMode}
        />
      </Card>

      <Card>
        <SectionHeading title="목표 영양" />
        <ThemedText type="small" themeColor="textSecondary">
          입력한 목표는 홈에서 달성률로 표시됩니다.
        </ThemedText>
        <FormField
          label="목표 칼로리 (선택)"
          unit="kcal"
          value={calories}
          onChangeText={(value) => {
            setCalories(value);
            setErrors((previous) => ({ ...previous, calories: undefined }));
          }}
          error={errors.calories}
          keyboardType="decimal-pad"
          inputMode="decimal"
          editable={!isSaving}
        />
        <FormField
          label="목표 단백질 (선택)"
          unit="g"
          value={protein}
          onChangeText={(value) => {
            setProtein(value);
            setErrors((previous) => ({ ...previous, protein: undefined }));
          }}
          error={errors.protein}
          keyboardType="decimal-pad"
          inputMode="decimal"
          editable={!isSaving}
        />
      </Card>

      {formError ? (
        <ThemedText type="small" themeColor="error" accessibilityLiveRegion="polite">
          {formError}
        </ThemedText>
      ) : null}

      <PrimaryButton
        label={mode === 'setup' ? '시작하기' : '변경 내용 저장'}
        pendingLabel="저장 중입니다"
        pending={isSaving}
        onPress={() => void save()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.four },
});
