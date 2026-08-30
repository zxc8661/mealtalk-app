import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-context';
import { ErrorState, LoadingState } from '@/components/async-state';
import { PrimaryButton, SecondaryButton } from '@/components/form-controls';
import { Card, SectionHeading } from '@/components/nutrition-ui';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { formatAmount, formatCalories, formatGrams } from '@/nutrition/format';
import { useCurrentUser } from '@/profile/current-user-context';
import { ProfileForm } from '@/profile/profile-form';
import { activityLabel, goalLabel, targetValue } from '@/profile/targets';

function Row({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="bodyStrong">{value}</ThemedText>
    </View>
  );
}

/** P-06 프로필 / 설정 */
export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user, isLoading, error, reload, apply } = useCurrentUser();
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) {
    return (
      <Frame>
        <LoadingState label="프로필을 불러오는 중입니다." />
      </Frame>
    );
  }

  if (error || !user) {
    return (
      <Frame>
        <ErrorState
          title="프로필을 불러오지 못했습니다."
          message={error ?? undefined}
          onRetry={reload}
        />
      </Frame>
    );
  }

  const targetWeight = targetValue(user, 'TARGET_WEIGHT');
  const calories = targetValue(user, 'DAILY_CALORIES');
  const protein = targetValue(user, 'DAILY_PROTEIN');

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="프로필" />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {isEditing ? (
            <>
              <ProfileForm
                user={user}
                mode="edit"
                onSaved={(saved) => {
                  apply(saved);
                  setIsEditing(false);
                }}
              />
              <SecondaryButton label="취소" onPress={() => setIsEditing(false)} />
            </>
          ) : (
            <>
              <Card>
                <SectionHeading title="신체 정보" />
                <Row label="키" value={user.profile ? `${formatAmount(user.profile.heightCm)} cm` : '-'} />
                <Row
                  label="현재 체중"
                  value={user.profile ? `${formatAmount(user.profile.weightKg)} kg` : '-'}
                />
                <Row label="목표 체중" value={targetWeight !== null ? `${formatAmount(targetWeight)} kg` : '-'} />
                <Row label="활동량" value={user.profile ? activityLabel(user.profile.activityLevel) : '-'} />
                <Row label="목표 유형" value={user.profile ? goalLabel(user.profile.goalMode) : '-'} />
              </Card>

              <Card>
                <SectionHeading title="목표 영양" />
                <Row
                  label="목표 칼로리"
                  value={calories !== null ? `${formatCalories(calories)} kcal` : '-'}
                />
                <Row label="목표 단백질" value={protein !== null ? formatGrams(protein) : '-'} />
                <ThemedText type="caption" themeColor="textSecondary">
                  탄수화물과 지방은 목표 없이 섭취량만 표시됩니다.
                </ThemedText>
              </Card>

              <PrimaryButton
                label="프로필 수정"
                pendingLabel="여는 중입니다"
                onPress={() => setIsEditing(true)}
              />
              <SecondaryButton
                label="로그아웃"
                onPress={() => {
                  void signOut().then(() => router.replace('/'));
                }}
              />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Frame({ children }: { readonly children: React.ReactNode }) {
  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.centered}>{children}</SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center' },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
});
