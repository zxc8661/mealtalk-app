import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState, LoadingState } from '@/components/async-state';
import { Card, SectionHeading } from '@/components/cards';
import { PrimaryButton, SecondaryButton } from '@/components/form-controls';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { activityLabel, formatMeasure, goalLabel } from '@/profile/labels';
import { useProfile } from '@/profile/profile-context';
import { ProfileForm } from '@/profile/profile-form';

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
  const { profile, isLoading, error, apply } = useProfile();
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ScreenHeader title="프로필" />
          <LoadingState label="프로필을 불러오는 중입니다." />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="프로필" />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {error ? <ErrorState title="프로필을 불러오지 못했습니다." message={error} /> : null}

          {isEditing ? (
            <>
              <ProfileForm
                profile={profile}
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
                <SectionHeading title="내 정보" />
                <Row label="이름" value={profile.displayName ?? '-'} />
                <Row label="키" value={formatMeasure(profile.heightCm, 'cm')} />
                <Row label="현재 체중" value={formatMeasure(profile.weightKg, 'kg')} />
                <Row label="활동량" value={activityLabel(profile.activityLevel)} />
                <Row label="목표 유형" value={goalLabel(profile.goalMode)} />
              </Card>

              <Card>
                <SectionHeading title="기록 보관" />
                <ThemedText type="small" themeColor="textSecondary">
                  모든 기록과 사진은 이 기기에만 저장됩니다. 계정이 없으므로 앱을 지우거나 기기를
                  바꾸면 기록은 복구할 수 없습니다.
                </ThemedText>
              </Card>

              <PrimaryButton
                label="프로필 수정"
                pendingLabel="여는 중입니다"
                onPress={() => setIsEditing(true)}
              />
            </>
          )}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
});
