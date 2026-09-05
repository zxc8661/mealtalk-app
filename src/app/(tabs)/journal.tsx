import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, LoadingState } from '@/components/async-state';
import { PrimaryButton, SecondaryButton } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useDatabase } from '@/db/database-context';
import { storeMessage } from '@/db/store-error';
import { formatKoreanDate, isIsoDate, localToday, shiftDate } from '@/format/date';
import { MealCard } from '@/meal/meal-presentation';
import { removeRecord } from '@/meal/meal-write';
import { useMealJournal } from '@/meal/use-meal-journal';

/** P-05 기록 목록 */
export default function JournalScreen() {
  const router = useRouter();
  const database = useDatabase();
  const params = useLocalSearchParams<{ date?: string }>();
  const requestedDate = params.date && isIsoDate(params.date) ? params.date : null;

  // Saving a record on another day hands that day over, so the list opens where
  // the record actually is rather than on an empty today.
  const [date, setDate] = useState(() => requestedDate ?? localToday());
  const [reloadToken, setReloadToken] = useState(0);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { meals, isLoading, error, reload } = useMealJournal(date, reloadToken);

  // The tab stays mounted, so a later save has to be honoured on focus rather
  // than at first render. The date is consumed once: without that, coming back
  // to this tab would keep snapping to the saved record's day instead of the
  // day the user had browsed to.
  useFocusEffect(
    useCallback(() => {
      if (requestedDate !== null) {
        setDate(requestedDate);
        router.setParams({ date: undefined });
      }
      setReloadToken((token) => token + 1);
    }, [requestedDate, router]),
  );

  const isToday = date === localToday();

  const confirmDelete = async (mealId: number) => {
    setDeleteError(null);
    setDeletingId(mealId);
    try {
      await removeRecord(database, mealId);
      setPendingDeleteId(null);
      reload();
    } catch (cause: unknown) {
      setDeleteError(storeMessage(cause));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText accessibilityRole="header" type="heading2">
            기록
          </ThemedText>

          <View style={styles.dateRow}>
            <SecondaryButton label="이전 날짜" onPress={() => setDate(shiftDate(date, -1))} />
            <View style={styles.dateLabel}>
              <ThemedText type="bodyStrong">{formatKoreanDate(date)}</ThemedText>
            </View>
            <SecondaryButton label="다음 날짜" onPress={() => setDate(shiftDate(date, 1))} />
          </View>
          {isToday ? null : (
            <SecondaryButton label="오늘로 이동" onPress={() => setDate(localToday())} />
          )}

          {error ? (
            <ErrorState title="기록을 불러오지 못했습니다." message={error} onRetry={reload} />
          ) : null}

          {deleteError ? (
            <ThemedText type="small" themeColor="error" accessibilityLiveRegion="polite">
              {deleteError}
            </ThemedText>
          ) : null}

          <View style={styles.section}>
            {isLoading ? <LoadingState label="기록을 불러오는 중입니다." /> : null}
            {!isLoading && meals.length > 0
              ? meals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  actions={
                    pendingDeleteId === meal.id ? (
                      <View style={styles.actions}>
                        <ThemedText type="small" themeColor="error">
                          이 기록을 삭제할까요? 사진도 함께 지워집니다.
                        </ThemedText>
                        <View style={styles.actionRow}>
                          <View style={styles.actionButton}>
                            <SecondaryButton
                              label={deletingId === meal.id ? '삭제 중' : '삭제 확인'}
                              disabled={deletingId === meal.id}
                              onPress={() => void confirmDelete(meal.id)}
                            />
                          </View>
                          <View style={styles.actionButton}>
                            <SecondaryButton
                              label="취소"
                              disabled={deletingId === meal.id}
                              onPress={() => setPendingDeleteId(null)}
                            />
                          </View>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.actionRow}>
                        <View style={styles.actionButton}>
                          <SecondaryButton
                            label="수정"
                            onPress={() =>
                              router.push({
                                pathname: '/meal-entry',
                                params: { mealId: String(meal.id), date },
                              })
                            }
                          />
                        </View>
                        <View style={styles.actionButton}>
                          <SecondaryButton
                            label="삭제"
                            onPress={() => {
                              setDeleteError(null);
                              setPendingDeleteId(meal.id);
                            }}
                          />
                        </View>
                      </View>
                    )
                  }
                />
                ))
              : null}
            {!isLoading && meals.length === 0 && error === null ? (
              <EmptyState
                title="이 날짜에는 기록이 없어요"
                message="먹은 음식을 사진이나 메모로 남겨 보세요."
              />
            ) : null}
          </View>

          <PrimaryButton
            label="기록 추가하기"
            pendingLabel="여는 중입니다"
            onPress={() => router.push({ pathname: '/meal-entry', params: { date } })}
          />
        </ScrollView>
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
    // Web renders the tab bar floating at the top; keep the title clear of it.
    paddingTop: Platform.OS === 'web' ? Spacing.six : Spacing.four,
    paddingBottom: Spacing.six,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dateLabel: { flex: 1, alignItems: 'center' },
  section: { gap: Spacing.three },
  actions: { gap: Spacing.two },
  actionRow: { flexDirection: 'row', gap: Spacing.two },
  actionButton: { flex: 1 },
});
