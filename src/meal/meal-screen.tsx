import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/api-error';
import { useApi } from '@/api/api-context';
import { EmptyState, ErrorState, LoadingState } from '@/components/async-state';
import { ChoiceGroup, FormField, FormSection, PrimaryButton, SecondaryButton } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderWidth, ControlSize, FormContentWidth, MaxContentWidth, Opacity, Radius, ResponsiveFieldWidth, Spacing } from '@/constants/theme';
import { createFood, listFoods, type Food, type FoodInput } from '@/food/food-api';
import { useTheme } from '@/hooks/use-theme';
import { createMeal, deleteMeal, listMeals, orderMeals, updateMeal, type Meal, type MealInput, type MealJournal, type MealType } from '@/meal/meal-api';

type ItemDraft = { readonly food: Food; readonly amount: string };
type MealDraft = { readonly mealType: MealType; readonly eatenAt: string; readonly items: readonly ItemDraft[] };
type FoodDraft = Record<keyof FoodInput, string>;
type FoodDraftField = keyof FoodDraft;
type FoodErrors = Partial<Record<FoodDraftField, string>>;

const MEAL_TYPES: readonly { value: MealType; label: string }[] = [
  { value: 'BREAKFAST', label: '아침' },
  { value: 'LUNCH', label: '점심' },
  { value: 'DINNER', label: '저녁' },
  { value: 'SNACK', label: '간식' },
  { value: 'UNSPECIFIED', label: '기타' },
];
const EMPTY_FOOD_DRAFT: FoodDraft = { name: '', servingAmount: '', servingUnit: '', caloriesKcal: '', carbohydratesG: '', proteinG: '', fatG: '' };
const NUTRIENT_FIELDS: readonly { key: Exclude<FoodDraftField, 'name' | 'servingAmount' | 'servingUnit'>; label: string; unit: string }[] = [
  { key: 'caloriesKcal', label: '열량', unit: 'kcal' },
  { key: 'carbohydratesG', label: '탄수화물', unit: 'g' },
  { key: 'proteinG', label: '단백질', unit: 'g' },
  { key: 'fatG', label: '지방', unit: 'g' },
];

function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function isDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function moveDate(date: string, direction: -1 | 1): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + direction);
  return value.toISOString().slice(0, 10);
}

function mealLabel(type: MealType): string {
  return MEAL_TYPES.find((candidate) => candidate.value === type)?.label ?? '기타';
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 3 }).format(value);
}

function decimal(value: string, positive = false): boolean {
  if (!/^(?:\d{1,7}(?:\.\d{1,3})?|\.\d{1,3})$/.test(value.trim())) return false;
  return positive ? Number(value) > 0 : Number(value) >= 0;
}

function requestMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 400) return '입력값을 다시 확인해주세요.';
  if (error instanceof ApiError) return error.message;
  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';
}

function mealToDraft(meal: Meal): MealDraft {
  return {
    mealType: meal.mealType,
    eatenAt: meal.eatenAt ?? '',
    items: meal.items.map((item) => ({
      food: {
        id: item.foodId,
        name: item.foodName,
        servingAmount: item.amount,
        servingUnit: item.unit,
        caloriesKcal: item.caloriesKcal,
        carbohydratesG: item.carbohydratesG,
        proteinG: item.proteinG,
        fatG: item.fatG,
      },
      amount: String(item.amount),
    })),
  };
}

function emptyMealDraft(): MealDraft {
  return { mealType: 'LUNCH', eatenAt: '', items: [] };
}

function journalWithMeal(journal: MealJournal, meal: Meal): MealJournal {
  const meals = orderMeals([...journal.meals.filter((candidate) => candidate.id !== meal.id), meal]);
  return { ...journal, meals, ...totalsFor(meals) };
}

function totalsFor(meals: readonly Meal[]) {
  return {
    totalCaloriesKcal: meals.reduce((sum, meal) => sum + meal.totalCaloriesKcal, 0),
    totalCarbohydratesG: meals.reduce((sum, meal) => sum + meal.totalCarbohydratesG, 0),
    totalProteinG: meals.reduce((sum, meal) => sum + meal.totalProteinG, 0),
    totalFatG: meals.reduce((sum, meal) => sum + meal.totalFatG, 0),
  };
}

export default function MealScreen() {
  const api = useApi();
  const theme = useTheme();
  const [selectedDate, setSelectedDate] = useState(localToday);
  const [dateError, setDateError] = useState<string | null>(null);
  const [journal, setJournal] = useState<MealJournal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [staleMessage, setStaleMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Meal | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const deletingRef = useRef(false);

  useEffect(() => {
    if (!isDate(selectedDate)) return;
    const controller = new AbortController();
    void listMeals(api, selectedDate, controller.signal)
      .then((nextJournal) => {
        setJournal({ ...nextJournal, meals: orderMeals(nextJournal.meals) });
        setLoadError(null);
        setStaleMessage(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || (error instanceof ApiError && error.isUnauthorized)) return;
        const message = requestMessage(error);
        if (journal) setStaleMessage(`${message} 이전 기록을 표시합니다.`);
        else setLoadError(message);
      })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  // The date change intentionally starts a new request; journal is only used for stale-state presentation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, selectedDate, reloadKey]);

  const selectDate = (value: string) => {
    if (!isDate(value)) {
      setDateError('YYYY-MM-DD 형식의 실제 날짜를 입력해주세요.');
      return;
    }
    setDateError(null);
    if (value === selectedDate) setReloadKey((key) => key + 1);
    setSelectedDate(value);
    setIsLoading(true);
    setLoadError(null);
    setStaleMessage(null);
    setFeedback(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deletingRef.current) return;
    deletingRef.current = true;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteMeal(api, deleteTarget.id);
      setJournal((previous) => previous ? { ...previous, meals: previous.meals.filter((meal) => meal.id !== deleteTarget.id), ...totalsFor(previous.meals.filter((meal) => meal.id !== deleteTarget.id)) } : previous);
      setFeedback(`${mealLabel(deleteTarget.mealType)} 기록을 삭제했습니다.`);
      setDeleteTarget(null);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.isUnauthorized) return;
      if (error instanceof ApiError && error.isNotFound) {
        setDeleteError('이 기록은 이미 삭제되었거나 더 이상 찾을 수 없습니다. 목록을 새로 확인해주세요.');
      } else setDeleteError(requestMessage(error));
    } finally {
      deletingRef.current = false;
      setIsDeleting(false);
    }
  };

  if (isLoading && !journal) return <ScreenFrame><LoadingState label="오늘의 식사 기록을 불러오는 중입니다." /></ScreenFrame>;
  if (loadError && !journal) return <ScreenFrame><ErrorState title="식사 기록을 불러오지 못했습니다." message={loadError} onRetry={() => { setIsLoading(true); setLoadError(null); setReloadKey((key) => key + 1); }} /></ScreenFrame>;

  const editorOpen = isCreating || editingMeal !== null;
  return (
    <ThemedView style={styles.screen} aria-hidden={deleteTarget !== null} accessibilityElementsHidden={deleteTarget !== null} importantForAccessibility={deleteTarget ? 'no-hide-descendants' : 'auto'}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <ThemedText type="smallBold" themeColor="primary">하루 식사 기록</ThemedText>
              <ThemedText accessibilityRole="header" type="heading1">오늘 먹은 것을 남겨보세요</ThemedText>
              <ThemedText themeColor="textSecondary">영양 합계는 저장 후 서버가 확정한 값으로 표시됩니다.</ThemedText>
            </View>
            {!editorOpen ? <PrimaryButton label="식사 추가" pendingLabel="여는 중입니다" onPress={() => { setEditingMeal(null); setIsCreating(true); setFeedback(null); }} /> : null}
          </View>

          <FormSection>
            <View style={styles.sectionHeading}>
              <ThemedText type="heading3">기록 날짜</ThemedText>
              <ThemedText themeColor="textSecondary">날짜별로 식사와 하루 합계를 확인할 수 있습니다.</ThemedText>
            </View>
            <FormField label="날짜" value={selectedDate} onChangeText={(value) => { setSelectedDate(value); setDateError(null); }} onSubmitEditing={() => selectDate(selectedDate)} placeholder="YYYY-MM-DD" error={dateError ?? undefined} editable={!editorOpen} />
            <View style={styles.actionRow}>
              <SecondaryButton label="이전 날짜" disabled={editorOpen} onPress={() => selectDate(moveDate(selectedDate, -1))} />
              <SecondaryButton label="오늘" disabled={editorOpen} onPress={() => selectDate(localToday())} />
              <SecondaryButton label="다음 날짜" disabled={editorOpen} onPress={() => selectDate(moveDate(selectedDate, 1))} />
              <SecondaryButton label="날짜 보기" disabled={editorOpen} onPress={() => selectDate(selectedDate)} />
            </View>
          </FormSection>

          {journal ? <DailyTotals journal={journal} /> : null}
          {staleMessage ? <StatusMessage title="최신 기록을 확인하지 못했습니다" message={staleMessage} color={theme.warning} /> : null}
          {feedback ? <StatusMessage title="처리 완료" message={feedback} color={theme.success} /> : null}

          {editorOpen ? <MealEditor meal={editingMeal} mealDate={selectedDate} onSaved={(saved) => { setJournal((previous) => previous ? journalWithMeal(previous, saved) : { mealDate: saved.mealDate, meals: [saved], ...totalsFor([saved]) }); setFeedback(editingMeal ? '식사 기록을 수정했습니다. 서버가 확정한 합계를 반영했습니다.' : '식사 기록을 추가했습니다. 서버가 확정한 합계를 반영했습니다.'); setEditingMeal(null); setIsCreating(false); }} onCancel={() => { setEditingMeal(null); setIsCreating(false); }} /> : null}

          <View style={styles.listSection}>
            <View style={styles.listHeading}>
              <ThemedText type="heading3">{selectedDate} 식사</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{journal?.meals.length ?? 0}건</ThemedText>
            </View>
            {journal && journal.meals.length === 0 ? <EmptyState title="아직 기록한 식사가 없습니다" message="먹은 식사를 추가하면 이 날짜의 영양 합계를 볼 수 있습니다." action={!editorOpen ? <SecondaryButton label="첫 식사 추가" onPress={() => setIsCreating(true)} /> : undefined} /> : null}
            {journal?.meals.map((meal) => <MealCard key={meal.id} meal={meal} disabled={editorOpen} onEdit={() => { setEditingMeal(meal); setIsCreating(false); setFeedback(null); }} onDelete={() => { setDeleteTarget(meal); setDeleteError(null); }} />)}
          </View>
        </ScrollView>
      </SafeAreaView>
      <DeleteDialog meal={deleteTarget} pending={isDeleting} error={deleteError} onCancel={() => { if (!isDeleting) setDeleteTarget(null); }} onConfirm={() => void confirmDelete()} />
    </ThemedView>
  );
}

function MealEditor({ meal, mealDate, onSaved, onCancel }: { readonly meal: Meal | null; readonly mealDate: string; readonly onSaved: (meal: Meal) => void; readonly onCancel: () => void }) {
  const api = useApi();
  const theme = useTheme();
  const [draft, setDraft] = useState<MealDraft>(() => meal ? mealToDraft(meal) : emptyMealDraft());
  const [foodQuery, setFoodQuery] = useState('');
  const [foodResults, setFoodResults] = useState<Food[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showFoodCreate, setShowFoodCreate] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [staleError, setStaleError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const preview = useMemo(() => draft.items.reduce((total, item) => {
    const amount = Number(item.amount);
    if (!Number.isFinite(amount) || amount <= 0 || item.food.servingAmount <= 0) return total;
    const ratio = amount / item.food.servingAmount;
    return {
      calories: total.calories + item.food.caloriesKcal * ratio,
      carbohydrates: total.carbohydrates + item.food.carbohydratesG * ratio,
      protein: total.protein + item.food.proteinG * ratio,
      fat: total.fat + item.food.fatG * ratio,
    };
  }, { calories: 0, carbohydrates: 0, protein: 0, fat: 0 }), [draft.items]);

  const searchFoods = async () => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const foods = await listFoods(api, foodQuery.trim());
      setFoodResults(foods.filter((food) => !draft.items.some((item) => item.food.id === food.id)));
    } catch (error: unknown) {
      if (!(error instanceof ApiError && error.isUnauthorized)) setSearchError(requestMessage(error));
    } finally { setIsSearching(false); }
  };

  const save = async () => {
    if (savingRef.current) return;
    const invalidItem = draft.items.some((item) => !decimal(item.amount, true));
    if (invalidItem || draft.items.length === 0) {
      setFormError(invalidItem ? '각 식품의 양을 0보다 큰 수로 소수점 셋째 자리까지 입력해주세요.' : '최소 한 가지 식품을 추가해주세요.');
      return;
    }
    savingRef.current = true;
    setIsSaving(true);
    setFormError(null);
    setStaleError(null);
    const input: MealInput = { mealDate, mealType: draft.mealType, eatenAt: draft.eatenAt || null, items: draft.items.map((item) => ({ foodId: item.food.id, amount: Number(item.amount) })) };
    try {
      const saved = meal ? await updateMeal(api, meal.id, input) : await createMeal(api, input);
      onSaved(saved);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.isUnauthorized) return;
      if (error instanceof ApiError && error.isNotFound) setStaleError('이 기록 또는 선택한 식품이 더 이상 활성 상태가 아닙니다. 목록을 새로 확인하고 다시 저장해주세요.');
      else setFormError(requestMessage(error));
    } finally { savingRef.current = false; setIsSaving(false); }
  };

  const addFood = (food: Food) => {
    setDraft((previous) => ({ ...previous, items: [...previous.items, { food, amount: String(food.servingAmount) }] }));
    setFoodResults((previous) => previous.filter((candidate) => candidate.id !== food.id));
    setFormError(null);
  };

  return (
    <FormSection>
      <View style={styles.sectionHeading}>
        <ThemedText accessibilityRole="header" type="heading3">{meal ? '식사 기록 수정' : '새 식사 기록'}</ThemedText>
        <ThemedText themeColor="textSecondary">식품과 양을 한 번에 저장합니다. 항목만 따로 수정할 수는 없습니다.</ThemedText>
      </View>
      <ChoiceGroup label="식사 종류" value={draft.mealType} choices={MEAL_TYPES} disabled={isSaving} onChange={(mealType) => { setDraft((previous) => ({ ...previous, mealType })); setFormError(null); }} />
      <FormField label="먹은 시간 (선택)" value={draft.eatenAt} onChangeText={(eatenAt) => { setDraft((previous) => ({ ...previous, eatenAt })); setFormError(null); }} placeholder="RFC 3339 예: 2026-08-29T12:30:00Z" hint="시간을 입력하지 않으면 같은 날 기록 중 마지막에 표시됩니다." editable={!isSaving} />

      <View style={styles.sectionHeading}>
        <ThemedText type="heading4">식품 찾기</ThemedText>
        <ThemedText themeColor="textSecondary">내 활성 식품만 검색됩니다. 보관한 식품은 새 기록에 추가할 수 없습니다.</ThemedText>
      </View>
      <FormField label="식품 검색어" value={foodQuery} onChangeText={setFoodQuery} onSubmitEditing={() => void searchFoods()} placeholder="예: 현미밥" editable={!isSaving && !isSearching} />
      <View style={styles.actionRow}>
        <PrimaryButton label="식품 검색" pendingLabel="검색 중입니다" pending={isSearching} onPress={() => void searchFoods()} />
        <SecondaryButton label="새 식품 바로 추가" disabled={isSaving} onPress={() => setShowFoodCreate((visible) => !visible)} />
      </View>
      {searchError ? <StatusMessage title="식품을 찾지 못했습니다" message={searchError} color={theme.error} /> : null}
      {showFoodCreate ? <InlineFoodCreator onCreated={(food) => { addFood(food); setShowFoodCreate(false); }} /> : null}
      {foodResults.length > 0 ? <View style={styles.resultList}>{foodResults.map((food) => <Pressable key={food.id} accessibilityRole="button" accessibilityLabel={`${food.name} 식사에 추가`} disabled={isSaving} onPress={() => addFood(food)} style={({ pressed }) => [styles.resultCard, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }, pressed && styles.pressed]}><View><ThemedText type="bodyStrong">{food.name}</ThemedText><ThemedText type="small" themeColor="textSecondary">{food.servingAmount} {food.servingUnit} 기준 · {formatNumber(food.caloriesKcal)} kcal</ThemedText></View><ThemedText type="bodyStrong" themeColor="primary">추가</ThemedText></Pressable>)}</View> : null}

      <View style={styles.sectionHeading}><ThemedText type="heading4">선택한 식품</ThemedText></View>
      {draft.items.length === 0 ? <ThemedText themeColor="textSecondary">아직 선택한 식품이 없습니다.</ThemedText> : <View style={styles.itemList}>{draft.items.map((item) => <View key={item.food.id} style={[styles.itemRow, { borderColor: theme.border }]}><View style={styles.itemTitle}><ThemedText type="bodyStrong">{item.food.name}</ThemedText><ThemedText type="small" themeColor="textSecondary">{item.food.servingAmount} {item.food.servingUnit} 기준</ThemedText></View><View style={styles.amountField}><FormField label={`${item.food.name} 양`} unit={item.food.servingUnit} value={item.amount} onChangeText={(amount) => { setDraft((previous) => ({ ...previous, items: previous.items.map((candidate) => candidate.food.id === item.food.id ? { ...candidate, amount } : candidate) })); setFormError(null); }} keyboardType="decimal-pad" inputMode="decimal" editable={!isSaving} /></View><SecondaryButton label={`${item.food.name} 제거`} disabled={isSaving} onPress={() => { setDraft((previous) => ({ ...previous, items: previous.items.filter((candidate) => candidate.food.id !== item.food.id) })); setFormError(null); }} /></View>)}</View>}

      <Preview preview={preview} />
      {staleError ? <StatusMessage title="최신 상태를 확인해주세요" message={staleError} color={theme.warning} /> : null}
      {formError ? <StatusMessage title="저장하지 못했습니다" message={formError} color={theme.error} /> : null}
      <View style={styles.actionRow}><PrimaryButton label={meal ? '변경 내용 저장' : '식사 저장'} pendingLabel="저장 중입니다" pending={isSaving} onPress={() => void save()} /><SecondaryButton label="취소" disabled={isSaving} onPress={onCancel} /></View>
      <ThemedText type="caption" themeColor="textSecondary">저장 중에는 한 번만 요청합니다. 네트워크 오류가 나도 입력한 내용은 유지됩니다.</ThemedText>
    </FormSection>
  );
}

function InlineFoodCreator({ onCreated }: { readonly onCreated: (food: Food) => void }) {
  const api = useApi();
  const theme = useTheme();
  const [draft, setDraft] = useState<FoodDraft>(EMPTY_FOOD_DRAFT);
  const [errors, setErrors] = useState<FoodErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const change = (field: FoodDraftField, value: string) => { setDraft((previous) => ({ ...previous, [field]: value })); setErrors((previous) => ({ ...previous, [field]: undefined })); setError(null); };
  const save = async () => {
    if (savingRef.current) return;
    const nextErrors: FoodErrors = {};
    if (!draft.name.trim() || draft.name.trim().length > 200) nextErrors.name = '1~200자의 식품 이름을 입력해주세요.';
    if (!draft.servingUnit.trim() || draft.servingUnit.trim().length > 20) nextErrors.servingUnit = '1~20자의 제공 단위를 입력해주세요.';
    if (!decimal(draft.servingAmount, true)) nextErrors.servingAmount = '0보다 큰 수를 소수점 셋째 자리까지 입력해주세요.';
    for (const field of NUTRIENT_FIELDS) if (!decimal(draft[field.key])) nextErrors[field.key] = '0 이상의 수를 소수점 셋째 자리까지 입력해주세요.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) { setError('새 식품의 입력값을 확인해주세요.'); return; }
    savingRef.current = true; setIsSaving(true); setError(null);
    try {
      const food = await createFood(api, { name: draft.name.trim(), servingAmount: Number(draft.servingAmount), servingUnit: draft.servingUnit.trim(), caloriesKcal: Number(draft.caloriesKcal), carbohydratesG: Number(draft.carbohydratesG), proteinG: Number(draft.proteinG), fatG: Number(draft.fatG) });
      onCreated(food);
    } catch (cause: unknown) { if (!(cause instanceof ApiError && cause.isUnauthorized)) setError(requestMessage(cause)); }
    finally { savingRef.current = false; setIsSaving(false); }
  };
  return <View style={[styles.inlineCreator, { borderColor: theme.border }]}><View style={styles.sectionHeading}><ThemedText type="heading4">새 개인 식품</ThemedText><ThemedText themeColor="textSecondary">저장하면 바로 이 식사에 추가됩니다.</ThemedText></View><FormField label="식품 이름" value={draft.name} onChangeText={(value) => change('name', value)} error={errors.name} editable={!isSaving} /><View style={styles.fieldPair}><View style={styles.flexField}><FormField label="한 번 제공량" value={draft.servingAmount} onChangeText={(value) => change('servingAmount', value)} error={errors.servingAmount} keyboardType="decimal-pad" inputMode="decimal" editable={!isSaving} /></View><View style={styles.flexField}><FormField label="제공 단위" value={draft.servingUnit} onChangeText={(value) => change('servingUnit', value)} error={errors.servingUnit} editable={!isSaving} /></View></View><View style={styles.fieldPair}>{NUTRIENT_FIELDS.map((field) => <View key={field.key} style={styles.flexField}><FormField label={field.label} unit={field.unit} value={draft[field.key]} onChangeText={(value) => change(field.key, value)} error={errors[field.key]} keyboardType="decimal-pad" inputMode="decimal" editable={!isSaving} /></View>)}</View>{error ? <StatusMessage title="식품을 저장하지 못했습니다" message={error} color={theme.error} /> : null}<PrimaryButton label="새 식품 저장하고 추가" pendingLabel="식품 저장 중입니다" pending={isSaving} onPress={() => void save()} /></View>;
}

function Preview({ preview }: { readonly preview: { readonly calories: number; readonly carbohydrates: number; readonly protein: number; readonly fat: number } }) {
  const theme = useTheme();
  return <View style={[styles.preview, { backgroundColor: theme.backgroundElement }]} accessibilityLiveRegion="polite"><ThemedText type="heading4">예상 영양</ThemedText><ThemedText themeColor="textSecondary">식품의 제공 기준으로 계산한 예상값입니다. 저장 후 서버가 최종 합계를 확정합니다.</ThemedText><View style={styles.macroRow}><Macro label="열량" value={`${formatNumber(preview.calories)} kcal`} /><Macro label="탄수화물" value={`${formatNumber(preview.carbohydrates)} g`} /><Macro label="단백질" value={`${formatNumber(preview.protein)} g`} /><Macro label="지방" value={`${formatNumber(preview.fat)} g`} /></View></View>;
}

function DailyTotals({ journal }: { readonly journal: MealJournal }) {
  const theme = useTheme();
  return <View style={[styles.totals, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><View style={styles.sectionHeading}><ThemedText type="heading3">하루 합계</ThemedText><ThemedText themeColor="textSecondary">서버가 확정한 {journal.mealDate}의 영양 합계입니다.</ThemedText></View><View style={styles.macroRow}><Macro label="열량" value={`${formatNumber(journal.totalCaloriesKcal)} kcal`} /><Macro label="탄수화물" value={`${formatNumber(journal.totalCarbohydratesG)} g`} /><Macro label="단백질" value={`${formatNumber(journal.totalProteinG)} g`} /><Macro label="지방" value={`${formatNumber(journal.totalFatG)} g`} /></View></View>;
}

function MealCard({ meal, disabled, onEdit, onDelete }: { readonly meal: Meal; readonly disabled: boolean; readonly onEdit: () => void; readonly onDelete: () => void }) {
  const theme = useTheme();
  return <View style={[styles.mealCard, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><View style={styles.listHeading}><View><ThemedText type="heading4">{mealLabel(meal.mealType)}</ThemedText><ThemedText type="small" themeColor="textSecondary">{meal.eatenAt ? meal.eatenAt : '시간 미입력'}</ThemedText></View><ThemedText type="bodyStrong">{formatNumber(meal.totalCaloriesKcal)} kcal</ThemedText></View><View style={styles.itemNames}>{meal.items.map((item) => <ThemedText key={item.id} type="small" themeColor="textSecondary">{item.foodName} · {formatNumber(item.amount)} {item.unit}</ThemedText>)}</View><View style={styles.actionRow}><SecondaryButton label={`${mealLabel(meal.mealType)} 수정`} disabled={disabled} onPress={onEdit} /><Pressable accessibilityRole="button" accessibilityLabel={`${mealLabel(meal.mealType)} 기록 삭제`} accessibilityState={{ disabled }} disabled={disabled} onPress={onDelete} style={({ pressed }) => [styles.deleteButton, { borderColor: theme.error }, disabled && styles.disabled, pressed && styles.pressed]}><ThemedText type="bodyStrong" themeColor="error">삭제</ThemedText></Pressable></View></View>;
}

function Macro({ label, value }: { readonly label: string; readonly value: string }) { return <View style={styles.macro}><ThemedText type="caption" themeColor="textSecondary">{label}</ThemedText><ThemedText type="bodyStrong">{value}</ThemedText></View>; }
function StatusMessage({ title, message, color }: { readonly title: string; readonly message: string; readonly color: string }) { return <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.message, { borderColor: color }]}><ThemedText type="bodyStrong">{title}</ThemedText><ThemedText>{message}</ThemedText></View>; }
function ScreenFrame({ children }: { readonly children: ReactNode }) { return <ThemedView style={styles.screen}><SafeAreaView style={styles.stateContent}>{children}</SafeAreaView></ThemedView>; }

function DeleteDialog({ meal, pending, error, onCancel, onConfirm }: { readonly meal: Meal | null; readonly pending: boolean; readonly error: string | null; readonly onCancel: () => void; readonly onConfirm: () => void }) {
  const theme = useTheme(); const reduceMotion = useReducedMotion();
  return <Modal visible={meal !== null} transparent={false} animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={onCancel}><ThemedView style={styles.dialogScreen}><SafeAreaView style={styles.dialogSafeArea}><View accessibilityViewIsModal style={[styles.dialog, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><View style={styles.sectionHeading}><ThemedText accessibilityRole="header" type="heading3">식사 기록을 삭제할까요?</ThemedText><ThemedText themeColor="textSecondary">{meal ? `${mealLabel(meal.mealType)} 기록과 식품 ${meal.items.length}개가 이 날짜의 합계에서 제거됩니다.` : ''}</ThemedText></View>{error ? <StatusMessage title="삭제하지 못했습니다" message={error} color={theme.error} /> : null}<SecondaryButton label="취소하고 돌아가기" disabled={pending} onPress={onCancel} /><PrimaryButton label={`${meal ? mealLabel(meal.mealType) : '식사'} 기록 삭제`} pendingLabel="삭제 중입니다" pending={pending} onPress={onConfirm} /></View></SafeAreaView></ThemedView></Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, safeArea: { flex: 1 }, stateContent: { flex: 1, justifyContent: 'center' },
  scrollContent: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.five, paddingHorizontal: Spacing.three, paddingTop: Spacing.five, paddingBottom: Spacing.six },
  header: { gap: Spacing.four, maxWidth: FormContentWidth }, headerCopy: { gap: Spacing.two }, sectionHeading: { gap: Spacing.two }, actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }, listSection: { gap: Spacing.three }, listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  totals: { gap: Spacing.three, padding: Spacing.four, borderWidth: BorderWidth.thin, borderRadius: Radius.card }, macroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three }, macro: { minWidth: ControlSize.primary, flexGrow: 1, gap: Spacing.half },
  mealCard: { gap: Spacing.three, padding: Spacing.four, borderWidth: BorderWidth.thin, borderRadius: Radius.card }, itemNames: { gap: Spacing.one }, message: { gap: Spacing.one, padding: Spacing.three, borderLeftWidth: BorderWidth.emphasis }, deleteButton: { minHeight: ControlSize.minimum, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.three, borderWidth: BorderWidth.thin, borderRadius: Radius.control },
  resultList: { gap: Spacing.two }, resultCard: { minHeight: ControlSize.minimum, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three, padding: Spacing.three, borderWidth: BorderWidth.thin, borderRadius: Radius.control }, itemList: { gap: Spacing.three }, itemRow: { gap: Spacing.three, paddingBottom: Spacing.three, borderBottomWidth: BorderWidth.thin }, itemTitle: { gap: Spacing.half }, amountField: { maxWidth: FormContentWidth },
  preview: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.control }, inlineCreator: { gap: Spacing.three, padding: Spacing.three, borderWidth: BorderWidth.thin, borderRadius: Radius.card }, fieldPair: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three }, flexField: { flexGrow: 1, flexBasis: ResponsiveFieldWidth }, pressed: { opacity: Opacity.pressed }, disabled: { opacity: Opacity.subtle },
  dialogScreen: { flex: 1 }, dialogSafeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.three }, dialog: { width: '100%', maxWidth: FormContentWidth, gap: Spacing.four, padding: Spacing.five, borderWidth: BorderWidth.thin, borderRadius: Radius.dialog },
});
