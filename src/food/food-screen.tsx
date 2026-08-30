import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/api-error';
import { useApi } from '@/api/api-context';
import { EmptyState, ErrorState, LoadingState } from '@/components/async-state';
import { FormField, FormSection, PrimaryButton, SecondaryButton } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BorderWidth,
  ControlSize,
  FormContentWidth,
  MaxContentWidth,
  ResponsiveFieldWidth,
  Opacity,
  Radius,
  Spacing,
} from '@/constants/theme';
import {
  archiveFood,
  createFood,
  listFoods,
  updateFood,
  type Food,
  type FoodInput,
} from '@/food/food-api';
import { useTheme } from '@/hooks/use-theme';

type Draft = Record<keyof FoodInput, string>;
type DraftField = keyof Draft;
type FieldErrors = Partial<Record<DraftField, string>>;

const EMPTY_DRAFT: Draft = {
  name: '',
  servingAmount: '',
  servingUnit: '',
  caloriesKcal: '',
  carbohydratesG: '',
  proteinG: '',
  fatG: '',
};

const NUTRIENT_FIELDS: readonly {
  key: Exclude<DraftField, 'name' | 'servingAmount' | 'servingUnit'>;
  label: string;
  unit: string;
}[] = [
  { key: 'caloriesKcal', label: '열량', unit: 'kcal' },
  { key: 'carbohydratesG', label: '탄수화물', unit: 'g' },
  { key: 'proteinG', label: '단백질', unit: 'g' },
  { key: 'fatG', label: '지방', unit: 'g' },
];

function draftFromFood(food: Food): Draft {
  return {
    name: food.name,
    servingAmount: String(food.servingAmount),
    servingUnit: food.servingUnit,
    caloriesKcal: String(food.caloriesKcal),
    carbohydratesG: String(food.carbohydratesG),
    proteinG: String(food.proteinG),
    fatG: String(food.fatG),
  };
}

function isDecimal(value: string, positive: boolean): boolean {
  if (!/^(?:\d{1,7}(?:\.\d{1,3})?|\.\d{1,3})$/.test(value.trim())) return false;
  return positive ? Number(value) > 0 : Number(value) >= 0;
}

function requestMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 400) {
    return '저장하지 못했습니다. 입력값을 다시 확인해주세요.';
  }
  if (error instanceof ApiError) return error.message;
  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';
}

export default function FoodScreen() {
  const api = useApi();
  const theme = useTheme();
  const [foods, setFoods] = useState<Food[]>([]);
  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [staleListMessage, setStaleListMessage] = useState<string | null>(null);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Food | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const savingRef = useRef(false);
  const archivingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    void listFoods(api, query, controller.signal)
      .then((nextFoods) => {
        setLoadError(null);
        setStaleListMessage(null);
        setFoods(nextFoods);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || (error instanceof ApiError && error.isUnauthorized)) return;
        const message = requestMessage(error);
        setFoods((previous) => {
          if (previous.length > 0) setStaleListMessage(message);
          else setLoadError(message);
          return previous;
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [api, query, reloadKey]);

  const search = (nextQuery: string) => {
    const trimmedQuery = nextQuery.trim();
    setIsLoading(true);
    setLoadError(null);
    setStaleListMessage(null);
    if (trimmedQuery === query) setReloadKey((key) => key + 1);
    else setQuery(trimmedQuery);
  };

  const openCreate = () => {
    if (savingRef.current) return;
    setEditingFood(null);
    setIsCreating(true);
    setDraft(EMPTY_DRAFT);
    setFieldErrors({});
    setSaveError(null);
    setFeedback(null);
  };

  const openEdit = (food: Food) => {
    if (savingRef.current) return;
    setEditingFood(food);
    setIsCreating(false);
    setDraft(draftFromFood(food));
    setFieldErrors({});
    setSaveError(null);
    setFeedback(null);
  };

  const closeEditor = () => {
    setEditingFood(null);
    setIsCreating(false);
    setSaveError(null);
  };

  const updateDraft = (field: DraftField, value: string) => {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
    setSaveError(null);
    setFeedback(null);
  };

  const validate = (): FoodInput | null => {
    const errors: FieldErrors = {};
    const name = draft.name.trim();
    const servingUnit = draft.servingUnit.trim();
    if (!name) errors.name = '식품 이름을 입력해주세요.';
    else if (name.length > 200) errors.name = '식품 이름은 200자 이하여야 합니다.';
    if (!servingUnit) errors.servingUnit = '제공 단위를 입력해주세요.';
    else if (servingUnit.length > 20) errors.servingUnit = '제공 단위는 20자 이하여야 합니다.';
    if (!isDecimal(draft.servingAmount, true)) {
      errors.servingAmount = '0보다 큰 수를 소수점 셋째 자리까지 입력해주세요.';
    }
    for (const field of NUTRIENT_FIELDS) {
      if (!isDecimal(draft[field.key], false)) {
        errors[field.key] = '0 이상의 수를 소수점 셋째 자리까지 입력해주세요.';
      }
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSaveError('오류가 있는 항목을 확인해주세요. 입력한 내용은 그대로 유지됩니다.');
      return null;
    }
    return {
      name,
      servingAmount: Number(draft.servingAmount),
      servingUnit,
      caloriesKcal: Number(draft.caloriesKcal),
      carbohydratesG: Number(draft.carbohydratesG),
      proteinG: Number(draft.proteinG),
      fatG: Number(draft.fatG),
    };
  };

  const save = async () => {
    if (savingRef.current) return;
    const input = validate();
    if (!input) return;
    savingRef.current = true;
    setIsSaving(true);
    setSaveError(null);
    try {
      const saved = editingFood
        ? await updateFood(api, editingFood.id, input)
        : await createFood(api, input);
      setFoods((previous) => {
        const withoutSaved = previous.filter((food) => food.id !== saved.id);
        return [...withoutSaved, saved].sort((left, right) => left.name.localeCompare(right.name));
      });
      closeEditor();
      setFeedback(editingFood ? '식품 정보를 수정했습니다.' : '새 식품을 추가했습니다.');
    } catch (error: unknown) {
      if (error instanceof ApiError && error.isUnauthorized) return;
      if (error instanceof ApiError && error.isNotFound) {
        setSaveError('이 식품은 이미 보관되었거나 더 이상 찾을 수 없습니다. 목록을 새로 확인해주세요.');
      } else {
        setSaveError(requestMessage(error));
      }
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const confirmArchive = async () => {
    if (!archiveTarget || archivingRef.current) return;
    archivingRef.current = true;
    setIsArchiving(true);
    setArchiveError(null);
    try {
      await archiveFood(api, archiveTarget.id);
      setFoods((previous) => previous.filter((food) => food.id !== archiveTarget.id));
      if (editingFood?.id === archiveTarget.id) closeEditor();
      setFeedback(`‘${archiveTarget.name}’을 보관했습니다. 활성 식품 목록과 검색에서 제외됩니다.`);
      setArchiveTarget(null);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.isUnauthorized) return;
      if (error instanceof ApiError && error.isNotFound) {
        setArchiveError('이 식품은 이미 보관되었거나 더 이상 찾을 수 없습니다.');
      } else {
        setArchiveError(requestMessage(error));
      }
    } finally {
      archivingRef.current = false;
      setIsArchiving(false);
    }
  };

  if (isLoading && foods.length === 0) {
    return <ScreenFrame><LoadingState label="내 식품을 불러오는 중입니다." /></ScreenFrame>;
  }
  if (loadError && foods.length === 0) {
    return (
      <ScreenFrame>
        <ErrorState
          title="내 식품을 불러오지 못했습니다."
          message={loadError}
          onRetry={() => {
            setIsLoading(true);
            setLoadError(null);
            setStaleListMessage(null);
            setReloadKey((key) => key + 1);
          }}
        />
      </ScreenFrame>
    );
  }

  const editorOpen = isCreating || editingFood !== null;
  return (
    <ThemedView
      aria-hidden={archiveTarget !== null}
      accessibilityElementsHidden={archiveTarget !== null}
      importantForAccessibility={archiveTarget ? 'no-hide-descendants' : 'auto'}
      style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <ThemedText type="smallBold" themeColor="primary">나만의 식품</ThemedText>
              <ThemedText accessibilityRole="header" type="heading1">자주 먹는 기준을 담아두세요</ThemedText>
              <ThemedText themeColor="textSecondary">
                이 목록은 나에게만 보입니다. 영양값은 한 번 제공량을 기준으로 입력해주세요.
              </ThemedText>
            </View>
            {!editorOpen ? <PrimaryButton label="새 식품 추가" pendingLabel="여는 중" onPress={openCreate} /> : null}
          </View>

          <FormSection>
            <View style={styles.sectionHeading}>
              <ThemedText type="heading3">식품 찾기</ThemedText>
              <ThemedText themeColor="textSecondary">이름의 일부로 활성 식품을 검색할 수 있습니다.</ThemedText>
            </View>
            <FormField
              label="검색어"
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={() => search(searchText)}
              returnKeyType="search"
              placeholder="예: 닭가슴살"
              editable={!isLoading}
            />
            <View style={styles.actionRow}>
              <PrimaryButton
                label="검색"
                pendingLabel="검색 중입니다"
                pending={isLoading}
                onPress={() => search(searchText)}
              />
              {query ? (
                <SecondaryButton
                  label="전체 보기"
                  onPress={() => {
                    setSearchText('');
                    search('');
                  }}
                />
              ) : null}
            </View>
          </FormSection>

          {staleListMessage ? (
            <StatusMessage title="목록을 새로 확인하지 못했습니다" message={`${staleListMessage} 이전 목록을 표시합니다.`} color={theme.warning} />
          ) : null}
          {feedback ? <StatusMessage title="처리 완료" message={feedback} color={theme.success} /> : null}

          {editorOpen ? (
            <FoodEditor
              draft={draft}
              errors={fieldErrors}
              requestError={saveError}
              editing={editingFood !== null}
              pending={isSaving}
              onChange={updateDraft}
              onSave={() => void save()}
              onCancel={() => {
                if (!savingRef.current) closeEditor();
              }}
            />
          ) : null}

          <View style={styles.listSection}>
            <View style={styles.listHeading}>
              <ThemedText type="heading3">{query ? '검색 결과' : '내 식품'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{foods.length}개</ThemedText>
            </View>
            {foods.length === 0 ? (
              <EmptyState
                title={query ? '검색 결과가 없습니다' : '아직 등록한 식품이 없습니다'}
                message={query ? '다른 이름으로 검색하거나 전체 목록을 확인해보세요.' : '자주 먹는 식품을 직접 추가해보세요.'}
                action={!query ? <SecondaryButton label="첫 식품 추가" onPress={openCreate} /> : undefined}
              />
            ) : (
              <View style={styles.foodList}>
                {foods.map((food) => (
                  <FoodCard
                    key={food.id}
                    food={food}
                    disabled={isSaving}
                    onEdit={() => openEdit(food)}
                    onArchive={() => {
                      if (savingRef.current) return;
                      setArchiveTarget(food);
                      setArchiveError(null);
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <ArchiveDialog
        food={archiveTarget}
        error={archiveError}
        pending={isArchiving}
        onCancel={() => {
          if (!isArchiving) setArchiveTarget(null);
        }}
        onConfirm={() => void confirmArchive()}
      />
    </ThemedView>
  );
}

function FoodEditor({
  draft,
  errors,
  requestError,
  editing,
  pending,
  onChange,
  onSave,
  onCancel,
}: {
  readonly draft: Draft;
  readonly errors: FieldErrors;
  readonly requestError: string | null;
  readonly editing: boolean;
  readonly pending: boolean;
  readonly onChange: (field: DraftField, value: string) => void;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}) {
  const theme = useTheme();
  return (
    <FormSection>
      <View style={styles.sectionHeading}>
        <ThemedText accessibilityRole="header" type="heading3">{editing ? '식품 정보 수정' : '새 식품 추가'}</ThemedText>
        <ThemedText themeColor="textSecondary">이름, 제공 기준, 그 기준의 영양값만 저장합니다.</ThemedText>
      </View>
      <FormField label="식품 이름" value={draft.name} onChangeText={(value) => onChange('name', value)} error={errors.name} placeholder="예: 닭가슴살" editable={!pending} />
      <View style={styles.fieldPair}>
        <View style={styles.flexField}>
          <FormField label="한 번 제공량" value={draft.servingAmount} onChangeText={(value) => onChange('servingAmount', value)} error={errors.servingAmount} placeholder="예: 100" keyboardType="decimal-pad" inputMode="decimal" editable={!pending} />
        </View>
        <View style={styles.flexField}>
          <FormField label="제공 단위" value={draft.servingUnit} onChangeText={(value) => onChange('servingUnit', value)} error={errors.servingUnit} placeholder="예: g, 개, 컵" editable={!pending} />
        </View>
      </View>
      <View style={styles.nutrientGrid}>
        {NUTRIENT_FIELDS.map((field) => (
          <View key={field.key} style={styles.nutrientField}>
            <FormField
              label={field.label}
              unit={field.unit}
              value={draft[field.key]}
              onChangeText={(value) => onChange(field.key, value)}
              error={errors[field.key]}
              placeholder="0"
              keyboardType="decimal-pad"
              inputMode="decimal"
              editable={!pending}
            />
          </View>
        ))}
      </View>
      {requestError ? <StatusMessage title={requestError.includes('찾을 수 없습니다') ? '최신 상태를 확인해주세요' : '저장하지 못했습니다'} message={requestError} color={theme.error} /> : null}
      <View style={styles.actionRow}>
        <PrimaryButton label={editing ? '변경 내용 저장' : '식품 저장'} pendingLabel="저장 중입니다" pending={pending} onPress={onSave} />
        <SecondaryButton label="취소" disabled={pending} onPress={onCancel} />
      </View>
      <ThemedText type="caption" themeColor="textSecondary">네트워크 오류가 발생해도 입력한 내용은 이 화면에 유지됩니다.</ThemedText>
    </FormSection>
  );
}

function FoodCard({ food, disabled, onEdit, onArchive }: { readonly food: Food; readonly disabled: boolean; readonly onEdit: () => void; readonly onArchive: () => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.foodCard, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
      <View style={styles.foodIdentity}>
        <ThemedText type="heading4">{food.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{food.servingAmount} {food.servingUnit} 기준</ThemedText>
      </View>
      <View style={styles.macroRow}>
        <Macro label="열량" value={`${food.caloriesKcal} kcal`} />
        <Macro label="탄수화물" value={`${food.carbohydratesG} g`} />
        <Macro label="단백질" value={`${food.proteinG} g`} />
        <Macro label="지방" value={`${food.fatG} g`} />
      </View>
      <View style={styles.actionRow}>
        <SecondaryButton label={`${food.name} 수정`} disabled={disabled} onPress={onEdit} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${food.name} 보관`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onArchive}
          style={({ pressed }) => [
            styles.archiveButton,
            { borderColor: theme.error },
            disabled && styles.disabled,
            pressed && styles.pressed,
          ]}>
          <ThemedText type="bodyStrong" themeColor="error">보관</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function Macro({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <View style={styles.macro}>
      <ThemedText type="caption" themeColor="textSecondary">{label}</ThemedText>
      <ThemedText type="bodyStrong">{value}</ThemedText>
    </View>
  );
}

function StatusMessage({ title, message, color }: { readonly title: string; readonly message: string; readonly color: string }) {
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.message, { borderColor: color }]}>
      <ThemedText type="bodyStrong">{title}</ThemedText>
      <ThemedText>{message}</ThemedText>
    </View>
  );
}

function ArchiveDialog({ food, error, pending, onCancel, onConfirm }: { readonly food: Food | null; readonly error: string | null; readonly pending: boolean; readonly onCancel: () => void; readonly onConfirm: () => void }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  return (
    <Modal
      visible={food !== null}
      transparent={false}
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onCancel}>
      <ThemedView style={styles.dialogScreen}>
        <SafeAreaView style={styles.dialogSafeArea}>
          <View accessibilityViewIsModal style={[styles.dialog, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
            <View style={styles.sectionHeading}>
              <ThemedText accessibilityRole="header" type="heading3">식품을 보관할까요?</ThemedText>
              <ThemedText themeColor="textSecondary">
                ‘{food?.name}’은 활성 목록과 검색에서 사라집니다. 과거 기록은 그대로 유지됩니다.
              </ThemedText>
            </View>
            {error ? <StatusMessage title="보관하지 못했습니다" message={error} color={theme.error} /> : null}
            <SecondaryButton label="취소하고 돌아가기" onPress={onCancel} />
            <PrimaryButton label={`${food?.name ?? '식품'} 보관`} pendingLabel="보관 중입니다" pending={pending} onPress={onConfirm} />
          </View>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

function ScreenFrame({ children }: { readonly children: ReactNode }) {
  return <ThemedView style={styles.screen}><SafeAreaView style={styles.stateContent}>{children}</SafeAreaView></ThemedView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  stateContent: { flex: 1, justifyContent: 'center' },
  scrollContent: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.five, paddingHorizontal: Spacing.three, paddingTop: Spacing.five, paddingBottom: Spacing.six },
  header: { gap: Spacing.four, maxWidth: FormContentWidth },
  headerCopy: { gap: Spacing.two },
  sectionHeading: { gap: Spacing.two },
  listSection: { gap: Spacing.three },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  foodList: { gap: Spacing.three },
  foodCard: { gap: Spacing.three, padding: Spacing.four, borderWidth: BorderWidth.thin, borderRadius: Radius.card },
  foodIdentity: { gap: Spacing.one },
  macroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  macro: { minWidth: ControlSize.primary, flexGrow: 1, gap: Spacing.half },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  fieldPair: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  flexField: { flexGrow: 1, flexBasis: ResponsiveFieldWidth },
  nutrientGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  nutrientField: { flexGrow: 1, flexBasis: ResponsiveFieldWidth },
  archiveButton: { minHeight: ControlSize.minimum, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.three, borderWidth: BorderWidth.thin, borderRadius: Radius.control },
  message: { gap: Spacing.one, padding: Spacing.three, borderLeftWidth: BorderWidth.emphasis },
  pressed: { opacity: Opacity.pressed },
  disabled: { opacity: Opacity.subtle },
  dialogScreen: { flex: 1 },
  dialogSafeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.three },
  dialog: { width: '100%', maxWidth: FormContentWidth, gap: Spacing.four, padding: Spacing.five, borderWidth: BorderWidth.thin, borderRadius: Radius.dialog },
});
