import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingState } from '@/components/async-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/profile/current-user-context';
import { ProfileForm } from '@/profile/profile-form';

/** P-02 최초 프로필 설정 */
export default function OnboardingScreen() {
  const router = useRouter();
  const { user, isLoading, apply } = useCurrentUser();

  if (isLoading) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.centered}>
          <LoadingState label="프로필을 불러오는 중입니다." />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <ThemedText accessibilityRole="header" type="heading2">
              프로필 설정
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              목표 계산에 사용할 기본 정보를 입력해 주세요.
            </ThemedText>
          </View>

          <ProfileForm
            user={user}
            mode="setup"
            onSaved={(saved) => {
              apply(saved);
              router.replace('/');
            }}
          />
        </ScrollView>
      </SafeAreaView>
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
    paddingTop: Spacing.five,
    paddingBottom: Spacing.six,
  },
  header: { gap: Spacing.two },
});
