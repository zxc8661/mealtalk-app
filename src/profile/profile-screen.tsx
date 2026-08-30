import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/api-error';
import { useApi } from '@/api/api-context';
import { useAuth } from '@/auth/auth-context';
import { ErrorState, LoadingState } from '@/components/async-state';
import {
  ChoiceGroup,
  FormField,
  FormSection,
  PrimaryButton,
  SecondaryButton,
} from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BorderWidth,
  ControlSize,
  FormContentWidth,
  MaxContentWidth,
  Opacity,
  Radius,
  Spacing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  getCurrentUser,
  replaceProfile,
  type ActivityLevel,
  type CurrentUser,
  type GoalMode,
  type ProfileUpdate,
  type TargetType,
} from '@/profile/profile-api';

type TargetDraft = { enabled: boolean; value: string; dueDate: string };
type TargetDrafts = Record<TargetType, TargetDraft>;
type FieldErrors = Partial<Record<'heightCm' | 'weightKg', string>>;
type TargetErrors = Partial<Record<TargetType, { readonly value?: string; readonly dueDate?: string }>>;

const ACTIVITY_CHOICES: readonly { value: ActivityLevel; label: string }[] = [
  { value: 'LOW', label: '가벼움' },
  { value: 'MEDIUM', label: '보통' },
  { value: 'HIGH', label: '활발함' },
];
const GOAL_CHOICES: readonly { value: GoalMode; label: string }[] = [
  { value: 'LOSS', label: '감량' },
  { value: 'MAINTAIN', label: '유지' },
  { value: 'GAIN', label: '증량' },
];
const TARGETS: readonly { type: TargetType; label: string; unit: string; placeholder: string }[] = [
  { type: 'TARGET_WEIGHT', label: '목표 체중', unit: 'kg', placeholder: '예: 65' },
  { type: 'DAILY_CALORIES', label: '하루 열량', unit: 'kcal', placeholder: '예: 2000' },
  { type: 'DAILY_PROTEIN', label: '하루 단백질', unit: 'g', placeholder: '예: 120' },
];

function emptyTargets(): TargetDrafts {
  return {
    TARGET_WEIGHT: { enabled: false, value: '', dueDate: '' },
    DAILY_CALORIES: { enabled: false, value: '', dueDate: '' },
    DAILY_PROTEIN: { enabled: false, value: '', dueDate: '' },
  };
}

function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function isPositiveNumber(value: string): boolean {
  return /^(?:\d+\.?\d*|\.\d+)$/.test(value.trim()) && Number(value) > 0;
}

function isValidFutureDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1] && value > localToday();
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 400) {
    return '저장하지 못했습니다. 표시된 값과 날짜를 다시 확인해주세요.';
  }
  if (error instanceof ApiError) return error.message;
  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';
}

export default function ProfileScreen() {
  const api = useApi();
  const { signOut } = useAuth();
  const theme = useTheme();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('MEDIUM');
  const [goalMode, setGoalMode] = useState<GoalMode>('MAINTAIN');
  const [targets, setTargets] = useState<TargetDrafts>(emptyTargets);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [targetErrors, setTargetErrors] = useState<TargetErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  const populateForm = useCallback((user: CurrentUser) => {
    if (user.profile) {
      setHeightCm(String(user.profile.heightCm));
      setWeightKg(String(user.profile.weightKg));
      setActivityLevel(user.profile.activityLevel);
      setGoalMode(user.profile.goalMode);
    }
    const nextTargets = emptyTargets();
    for (const target of user.targets) {
      nextTargets[target.targetType] = {
        enabled: true,
        value: String(target.targetValue),
        dueDate: target.dueDate ?? '',
      };
    }
    setTargets(nextTargets);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void getCurrentUser(api, controller.signal)
      .then((user) => {
        setCurrentUser(user);
        populateForm(user);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || (error instanceof ApiError && error.isUnauthorized)) return;
        setLoadError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [api, populateForm, reloadKey]);

  const enabledTargetCount = useMemo(
    () => TARGETS.filter(({ type }) => targets[type].enabled).length,
    [targets],
  );

  const clearEditFeedback = () => {
    setRequestError(null);
    setSuccessMessage(null);
  };

  const updateTarget = (type: TargetType, update: Partial<TargetDraft>) => {
    setTargets((previous) => ({ ...previous, [type]: { ...previous[type], ...update } }));
    setTargetErrors((previous) => ({
      ...previous,
      [type]: {
        value: 'enabled' in update || 'value' in update ? undefined : previous[type]?.value,
        dueDate: 'enabled' in update || 'dueDate' in update ? undefined : previous[type]?.dueDate,
      },
    }));
    clearEditFeedback();
  };

  const validate = (): ProfileUpdate | null => {
    const errors: FieldErrors = {};
    const nextTargetErrors: TargetErrors = {};
    if (!isPositiveNumber(heightCm)) errors.heightCm = '0보다 큰 키를 입력해주세요.';
    if (!isPositiveNumber(weightKg)) errors.weightKg = '0보다 큰 체중을 입력해주세요.';

    const submittedTargets: ProfileUpdate['targets'][number][] = [];
    for (const target of TARGETS) {
      const draft = targets[target.type];
      if (!draft.enabled) continue;
      const targetError: { value?: string; dueDate?: string } = {};
      if (!isPositiveNumber(draft.value)) {
        targetError.value = '0보다 큰 목표값을 입력해주세요.';
      }
      if (draft.dueDate && !isValidFutureDate(draft.dueDate)) {
        targetError.dueDate = '목표일은 실제 존재하는 미래 날짜여야 합니다.';
      }
      if (targetError.value || targetError.dueDate) {
        nextTargetErrors[target.type] = targetError;
        continue;
      }
      submittedTargets.push({
        targetType: target.type,
        targetValue: Number(draft.value),
        dueDate: draft.dueDate || null,
      });
    }
    setFieldErrors(errors);
    setTargetErrors(nextTargetErrors);
    if (Object.keys(errors).length > 0 || Object.keys(nextTargetErrors).length > 0) {
      setRequestError('입력한 내용을 확인해주세요. 오류가 있는 항목에 안내를 표시했습니다.');
      setSuccessMessage(null);
      return null;
    }
    return {
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      activityLevel,
      goalMode,
      targets: submittedTargets,
    };
  };

  const save = async () => {
    if (isSavingRef.current) return;
    const update = validate();
    if (!update) return;
    isSavingRef.current = true;
    setIsSaving(true);
    setRequestError(null);
    setSuccessMessage(null);
    try {
      const saved = await replaceProfile(api, update);
      setCurrentUser(saved);
      populateForm(saved);
      setSuccessMessage('프로필과 영양 목표를 저장했습니다.');
    } catch (error: unknown) {
      if (!(error instanceof ApiError && error.isUnauthorized)) setRequestError(errorMessage(error));
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  if (isLoading) return <ScreenFrame><LoadingState label="프로필을 불러오는 중입니다." /></ScreenFrame>;
  if (loadError) {
    return (
      <ScreenFrame>
        <ErrorState
          title="프로필을 불러오지 못했습니다."
          message={loadError}
          onRetry={() => {
            setIsLoading(true);
            setLoadError(null);
            setReloadKey((key) => key + 1);
          }}
        />
      </ScreenFrame>
    );
  }
  if (!currentUser) return null;

  const isSetup = !currentUser.profileCompleted;
  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.pageHeader}>
            <View style={styles.headerCopy}>
              <ThemedText type="smallBold" themeColor="primary">
                {isSetup ? '첫 설정' : '내 프로필'}
              </ThemedText>
              <ThemedText accessibilityRole="header" type="heading1">
                {isSetup ? `${currentUser.name}님의 기준을 알려주세요` : '나에게 맞는 기준 관리'}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {isSetup
                  ? '키와 체중만 먼저 저장해도 괜찮아요. 영양 목표는 언제든 바꿀 수 있습니다.'
                  : '몸 상태와 목표가 달라졌다면 지금 기준으로 가볍게 조정하세요.'}
              </ThemedText>
            </View>
            {!isSetup ? <SecondaryButton label="로그아웃" onPress={() => void signOut()} /> : null}
          </View>

          <FormSection>
            <View style={styles.sectionHeading}>
              <ThemedText type="heading3">기본 정보</ThemedText>
              <ThemedText themeColor="textSecondary">계산과 기록에 사용할 현재 기준입니다.</ThemedText>
            </View>
            <View style={styles.fieldGroup}>
              <FormField
                label="키"
                unit="cm"
                value={heightCm}
                onChangeText={(value) => {
                  setHeightCm(value);
                  setFieldErrors((errors) => ({ ...errors, heightCm: undefined }));
                  clearEditFeedback();
                }}
                keyboardType="decimal-pad"
                inputMode="decimal"
                placeholder="예: 170"
                error={fieldErrors.heightCm}
                editable={!isSaving}
              />
              <FormField
                label="현재 체중"
                unit="kg"
                value={weightKg}
                onChangeText={(value) => {
                  setWeightKg(value);
                  setFieldErrors((errors) => ({ ...errors, weightKg: undefined }));
                  clearEditFeedback();
                }}
                keyboardType="decimal-pad"
                inputMode="decimal"
                placeholder="예: 65"
                error={fieldErrors.weightKg}
                editable={!isSaving}
              />
            </View>
            <ChoiceGroup
              label="평소 활동량"
              value={activityLevel}
              choices={ACTIVITY_CHOICES}
              onChange={(value) => {
                setActivityLevel(value);
                clearEditFeedback();
              }}
              disabled={isSaving}
            />
            <ChoiceGroup
              label="현재 방향"
              value={goalMode}
              choices={GOAL_CHOICES}
              onChange={(value) => {
                setGoalMode(value);
                clearEditFeedback();
              }}
              disabled={isSaving}
            />
          </FormSection>

          <FormSection>
            <View style={styles.sectionHeading}>
              <ThemedText type="heading3">영양 목표</ThemedText>
              <ThemedText themeColor="textSecondary">
                선택 사항입니다. 켜진 목표만 저장되며, 모두 끄면 기존 목표가 전부 삭제됩니다.
              </ThemedText>
              {enabledTargetCount === 0 ? (
                <View style={[styles.emptyTargets, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="bodyStrong">설정한 목표가 없습니다</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">필요한 항목만 아래에서 켜주세요.</ThemedText>
                </View>
              ) : null}
            </View>

            {TARGETS.map((target) => {
              const draft = targets[target.type];
              return (
                <View
                  key={target.type}
                  style={[
                    styles.targetCard,
                    { backgroundColor: theme.surfaceRaised, borderColor: draft.enabled ? theme.primary : theme.border },
                  ]}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={`${target.label} 목표 사용`}
                    accessibilityState={{ checked: draft.enabled, disabled: isSaving }}
                    disabled={isSaving}
                    onPress={() => updateTarget(target.type, { enabled: !draft.enabled })}
                    style={({ pressed }) => [styles.targetToggle, pressed && styles.pressed]}>
                    <View
                      style={[
                        styles.checkbox,
                        { borderColor: draft.enabled ? theme.primary : theme.border, backgroundColor: draft.enabled ? theme.primary : theme.surfaceRaised },
                      ]}>
                      {draft.enabled ? <ThemedText style={{ color: theme.onPrimary }}>✓</ThemedText> : null}
                    </View>
                    <View style={styles.targetTitle}>
                      <ThemedText type="bodyStrong">{target.label}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">{draft.enabled ? '저장할 목표' : '사용 안 함'}</ThemedText>
                    </View>
                  </Pressable>
                  {draft.enabled ? (
                    <View style={styles.targetFields}>
                      <FormField
                        label="목표값"
                        unit={target.unit}
                        value={draft.value}
                        onChangeText={(value) => updateTarget(target.type, { value })}
                        keyboardType="decimal-pad"
                        inputMode="decimal"
                        placeholder={target.placeholder}
                        error={targetErrors[target.type]?.value}
                        editable={!isSaving}
                      />
                      <FormField
                        label="목표일"
                        accessibilityLabel={`${target.label} 목표일`}
                        value={draft.dueDate}
                        onChangeText={(dueDate) => updateTarget(target.type, { dueDate })}
                        inputMode="text"
                        placeholder="YYYY-MM-DD"
                        hint="선택 사항 · 오늘보다 이후 날짜"
                        error={targetErrors[target.type]?.dueDate}
                        editable={!isSaving}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </FormSection>

          {requestError ? (
            <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[styles.message, { borderColor: theme.error }]}>
              <ThemedText type="bodyStrong" themeColor="error">저장 내용을 확인해주세요</ThemedText>
              <ThemedText themeColor="error">{requestError}</ThemedText>
            </View>
          ) : null}
          {successMessage ? (
            <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.message, { borderColor: theme.success }]}>
              <ThemedText type="bodyStrong" themeColor="success">저장 완료</ThemedText>
              <ThemedText>{successMessage}</ThemedText>
            </View>
          ) : null}

          <PrimaryButton
            label={isSetup ? '프로필 저장하고 시작하기' : '변경 내용 저장'}
            pendingLabel="저장 중입니다"
            pending={isSaving}
            onPress={() => void save()}
          />
          <ThemedText type="caption" themeColor="textSecondary" style={styles.footerNote}>
            저장 버튼을 여러 번 눌러도 요청은 한 번만 전송됩니다.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function ScreenFrame({ children }: { readonly children: ReactNode }) {
  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.stateContent}>{children}</SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  stateContent: { flex: 1, justifyContent: 'center' },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.six,
  },
  pageHeader: { gap: Spacing.four, maxWidth: FormContentWidth },
  headerCopy: { gap: Spacing.two },
  sectionHeading: { gap: Spacing.two },
  fieldGroup: { gap: Spacing.three },
  emptyTargets: { gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.control },
  targetCard: { gap: Spacing.three, padding: Spacing.three, borderWidth: BorderWidth.thin, borderRadius: Radius.card },
  targetToggle: { minHeight: ControlSize.minimum, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  checkbox: {
    width: Spacing.four,
    height: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BorderWidth.emphasis,
    borderRadius: Radius.control,
  },
  targetTitle: { flex: 1 },
  targetFields: { gap: Spacing.three },
  message: { gap: Spacing.one, padding: Spacing.three, borderLeftWidth: BorderWidth.emphasis },
  footerNote: { textAlign: 'center' },
  pressed: { opacity: Opacity.pressed },
});
