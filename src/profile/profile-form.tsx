import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, SectionHeading } from '@/components/cards';
import { ChoiceGroup, FormField, PrimaryButton } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useDatabase } from '@/db/database-context';
import { storeMessage } from '@/db/store-error';
import { ACTIVITY_CHOICES, GOAL_CHOICES, isPositiveMeasure } from '@/profile/labels';
import {
  writeProfile,
  type ActivityLevel,
  type GoalMode,
  type Profile,
} from '@/profile/profile-store';

type Errors = Partial<Record<'heightCm' | 'weightKg', string>>;

/** An optional measurement: blank means "not recorded", not zero. */
function optionalMeasure(value: string): number | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : Number(trimmed);
}

/**
 * The owner's own notes about themselves.
 *
 * Every field is optional: nothing in the journal is computed from them, so an
 * empty profile must stay a valid, saveable state rather than a form to clear.
 */
export function ProfileForm({
  profile,
  onSaved,
}: {
  readonly profile: Profile;
  readonly onSaved: (profile: Profile) => void;
}) {
  const database = useDatabase();

  const [displayName, setDisplayName] = useState(profile.displayName ?? '');
  const [heightCm, setHeightCm] = useState(profile.heightCm === null ? '' : String(profile.heightCm));
  const [weightKg, setWeightKg] = useState(profile.weightKg === null ? '' : String(profile.weightKg));
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activityLevel ?? 'MEDIUM');
  const [goalMode, setGoalMode] = useState<GoalMode>(profile.goalMode ?? 'MAINTAIN');

  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const save = async () => {
    if (savingRef.current) return;

    const nextErrors: Errors = {};
    if (heightCm.trim() && !isPositiveMeasure(heightCm)) {
      nextErrors.heightCm = '0보다 큰 키를 입력하거나 비워 두세요.';
    }
    if (weightKg.trim() && !isPositiveMeasure(weightKg)) {
      nextErrors.weightKg = '0보다 큰 체중을 입력하거나 비워 두세요.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError('입력값을 확인해주세요.');
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    setFormError(null);
    try {
      onSaved(
        await writeProfile(database, {
          displayName: displayName.trim() || null,
          heightCm: optionalMeasure(heightCm),
          weightKg: optionalMeasure(weightKg),
          activityLevel,
          goalMode,
        }),
      );
    } catch (cause: unknown) {
      setFormError(storeMessage(cause));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.form}>
      <Card>
        <SectionHeading title="내 정보" />
        <ThemedText type="small" themeColor="textSecondary">
          모두 선택 사항이고, 이 기기에만 저장됩니다.
        </ThemedText>
        <FormField
          label="이름"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="비워 두어도 됩니다"
          maxLength={30}
          editable={!isSaving}
        />
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

      {formError ? (
        <ThemedText type="small" themeColor="error" accessibilityLiveRegion="polite">
          {formError}
        </ThemedText>
      ) : null}

      <PrimaryButton
        label="변경 내용 저장"
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
