import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState, LoadingState } from '@/components/async-state';
import { Card, SectionHeading } from '@/components/cards';
import { ChoiceGroup, FormField, PrimaryButton, SecondaryButton } from '@/components/form-controls';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useDatabase } from '@/db/database-context';
import { storeMessage } from '@/db/store-error';
import { formatKoreanDate, localToday, shiftDate } from '@/format/date';
import { MEMO_MAX_LENGTH, normalizeMemo, type MealPhotoRef, type MealType } from '@/meal/meal-record';
import { MEAL_TYPE_CHOICES } from '@/meal/meal-presentation';
import { createRecord, updateRecord, type PhotoIntent } from '@/meal/meal-write';
import { useEditableMeal } from '@/meal/use-editable-meal';
import { MealPhoto } from '@/photo/meal-photo';
import { permissionMessage, pickImage, type PickSource } from '@/photo/photo-picker';
import type { PickedImage } from '@/photo/photo-store';

/**
 * The photo slot while the record is being written.
 *
 * `stored` and `picked` are kept apart because they mean different things at save
 * time: one is bytes already on disk that must survive untouched, the other is
 * bytes that still have to be normalized and written.
 */
type PhotoDraft =
  | { readonly kind: 'none' }
  | { readonly kind: 'stored'; readonly photo: MealPhotoRef }
  | { readonly kind: 'picked'; readonly picked: PickedImage };

function intentOf(draft: PhotoDraft): PhotoIntent {
  switch (draft.kind) {
    case 'picked':
      return { kind: 'replace', picked: draft.picked };
    case 'stored':
      return { kind: 'keep' };
    case 'none':
      return { kind: 'remove' };
  }
}

/** P-04 기록 추가 / 기록 수정 */
export default function MealEntryScreen() {
  const router = useRouter();
  const database = useDatabase();
  const params = useLocalSearchParams<{ mealId?: string; date?: string }>();

  const editingMealId =
    params.mealId && Number.isFinite(Number(params.mealId)) ? Number(params.mealId) : null;
  const isEditing = editingMealId !== null;
  const { meal: loadedMeal, isLoading: isLoadingMeal, error: loadError } = useEditableMeal(editingMealId);

  const [mealType, setMealType] = useState<MealType>('LUNCH');
  const [date, setDate] = useState(() => params.date ?? localToday());
  const [memo, setMemo] = useState('');
  const [photo, setPhoto] = useState<PhotoDraft>({ kind: 'none' });
  const [formError, setFormError] = useState<string | null>(null);
  const [pickerNotice, setPickerNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  // Adopt the stored record once, then leave the user's edits alone. Adjusting
  // during render is React's documented way to seed state from loaded data.
  const [adoptedMealId, setAdoptedMealId] = useState<number | null>(null);
  if (loadedMeal && adoptedMealId !== editingMealId) {
    setAdoptedMealId(editingMealId);
    setMealType(loadedMeal.mealType);
    setDate(loadedMeal.mealDate);
    setMemo(loadedMeal.memo ?? '');
    setPhoto(loadedMeal.photo ? { kind: 'stored', photo: loadedMeal.photo } : { kind: 'none' });
  }

  const hasPhoto = photo.kind !== 'none';
  const canSave = normalizeMemo(memo) !== null || hasPhoto;

  const choosePhoto = async (source: PickSource) => {
    setPickerNotice(null);
    const result = await pickImage(source);
    if (result.status === 'cancelled') return;
    if (result.status === 'denied') {
      setPickerNotice(permissionMessage(result.source));
      return;
    }
    setPhoto({ kind: 'picked', picked: result.image });
    setFormError(null);
  };

  const save = async () => {
    if (savingRef.current) return;
    if (!canSave) {
      setFormError('메모를 입력하거나 사진을 추가해주세요.');
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    setFormError(null);
    try {
      // A record dated in the past has no trustworthy time of day, so only
      // today's new records carry one rather than inventing "now" for a past day.
      const draft = {
        mealDate: date,
        mealType,
        eatenAt: loadedMeal
          ? loadedMeal.eatenAt
          : date === localToday()
            ? new Date().toISOString()
            : null,
        memo,
      };

      const saved =
        loadedMeal && editingMealId !== null
          ? await updateRecord(database, editingMealId, draft, loadedMeal, intentOf(photo))
          : await createRecord(database, draft, intentOf(photo));

      router.replace({ pathname: '/meal-saved', params: { mealId: String(saved.id), date } });
    } catch (cause: unknown) {
      setFormError(storeMessage(cause));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  if (isEditing && isLoadingMeal) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ScreenHeader title="기록 수정" />
          <LoadingState label="기록을 불러오는 중입니다." />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (isEditing && loadError) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ScreenHeader title="기록 수정" />
          <ErrorState title="기록을 불러오지 못했습니다." message={loadError} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title={isEditing ? '기록 수정' : '기록 추가'} />
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
              <SecondaryButton
                label="이전 날짜"
                disabled={isSaving}
                onPress={() => setDate(shiftDate(date, -1))}
              />
              <View style={styles.dateLabel}>
                <ThemedText type="caption" themeColor="textSecondary">
                  먹은 날짜
                </ThemedText>
                <ThemedText type="bodyStrong">{formatKoreanDate(date)}</ThemedText>
              </View>
              <SecondaryButton
                label="다음 날짜"
                disabled={isSaving}
                onPress={() => setDate(shiftDate(date, 1))}
              />
            </View>
          </Card>

          <Card>
            <SectionHeading title="사진" />
            {photo.kind === 'stored' ? (
              <MealPhoto photo={photo.photo} accessibilityLabel="선택한 사진" />
            ) : null}
            {photo.kind === 'picked' ? (
              <Image
                alt="선택한 사진"
                accessibilityLabel="선택한 사진"
                source={{ uri: photo.picked.uri }}
                contentFit="cover"
                style={[
                  styles.preview,
                  { aspectRatio: photo.picked.width / Math.max(photo.picked.height, 1) },
                ]}
              />
            ) : null}

            <View style={styles.photoActions}>
              <View style={styles.photoButton}>
                <SecondaryButton
                  label={hasPhoto ? '사진 다시 찍기' : '사진 찍기'}
                  disabled={isSaving}
                  onPress={() => void choosePhoto('camera')}
                />
              </View>
              <View style={styles.photoButton}>
                <SecondaryButton
                  label={hasPhoto ? '앨범에서 바꾸기' : '앨범에서 고르기'}
                  disabled={isSaving}
                  onPress={() => void choosePhoto('library')}
                />
              </View>
            </View>
            {hasPhoto ? (
              <SecondaryButton
                label="사진 빼기"
                disabled={isSaving}
                onPress={() => setPhoto({ kind: 'none' })}
              />
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                사진 없이 메모만 남겨도 기록됩니다.
              </ThemedText>
            )}
            {pickerNotice ? (
              <ThemedText type="small" themeColor="error" accessibilityLiveRegion="polite">
                {pickerNotice}
              </ThemedText>
            ) : null}
          </Card>

          <Card>
            <SectionHeading title="메모" />
            <FormField
              label="먹은 음식이나 기분"
              value={memo}
              onChangeText={(value) => {
                setMemo(value);
                setFormError(null);
              }}
              placeholder="예: 점심에 김치찌개랑 계란말이"
              hint={`${normalizeMemo(memo)?.length ?? 0} / ${MEMO_MAX_LENGTH}자`}
              multiline
              numberOfLines={4}
              maxLength={MEMO_MAX_LENGTH}
              editable={!isSaving}
              style={styles.memoInput}
            />
          </Card>

          {formError ? (
            <ThemedText type="small" themeColor="error" accessibilityLiveRegion="polite">
              {formError}
            </ThemedText>
          ) : null}
        </ScrollView>

        <View style={styles.saveBar}>
          <PrimaryButton
            label={isEditing ? '수정 저장하기' : '저장하기'}
            pendingLabel="저장 중입니다"
            pending={isSaving}
            disabled={!canSave}
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
  preview: { width: '100%', borderRadius: Radius.control },
  photoActions: { flexDirection: 'row', gap: Spacing.two },
  photoButton: { flex: 1 },
  memoInput: { minHeight: 96, paddingTop: Spacing.three, textAlignVertical: 'top' },
  saveBar: { padding: Spacing.three },
});
