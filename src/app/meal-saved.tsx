import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState, LoadingState } from '@/components/async-state';
import { PrimaryButton, SecondaryButton } from '@/components/form-controls';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { formatKoreanDate, localToday } from '@/format/date';
import { MealCard } from '@/meal/meal-presentation';
import { useEditableMeal } from '@/meal/use-editable-meal';

/** Confirms the record exactly as it was stored on the device. */
export default function MealSavedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mealId?: string; date?: string }>();

  const date = params.date ?? localToday();
  const mealId = params.mealId && Number.isFinite(Number(params.mealId)) ? Number(params.mealId) : null;
  const { meal, isLoading, error } = useEditableMeal(mealId);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="저장 결과" showBack={false} />
        <ScrollView contentContainerStyle={styles.content}>
          {isLoading ? <LoadingState label="저장 결과를 불러오는 중입니다." /> : null}

          {!isLoading && (error || meal === null) ? (
            <ErrorState
              title="저장 결과를 불러오지 못했습니다."
              message={error ?? '기록을 찾을 수 없습니다.'}
            />
          ) : null}

          {!isLoading && meal !== null ? (
            <>
              <View style={styles.hero}>
                <ThemedText accessibilityRole="header" type="heading3">
                  기록을 저장했어요
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.centered}>
                  {`${formatKoreanDate(meal.mealDate)} 기록이 이 기기에 저장되었습니다.`}
                </ThemedText>
              </View>

              <MealCard meal={meal} />
            </>
          ) : null}

          <View style={styles.actions}>
            <PrimaryButton
              label="홈에서 확인하기"
              pendingLabel="이동 중입니다"
              onPress={() => router.replace('/')}
            />
            <SecondaryButton
              label="기록 목록 보기"
              onPress={() => router.replace({ pathname: '/journal', params: { date } })}
            />
          </View>
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
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
  },
  hero: { alignItems: 'center', gap: Spacing.two },
  centered: { textAlign: 'center' },
  actions: { gap: Spacing.two },
});
