import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ErrorState, LoadingState } from '@/components/async-state';
import { ThemedView } from '@/components/themed-view';
import { DatabaseProvider } from '@/db/database-context';
import { ProfileProvider } from '@/profile/profile-context';

SplashScreen.preventAutoHideAsync();

/**
 * Everything the app records lives on this device: there is no account, no
 * server and no sign-in step, so the journal is the first screen.
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <DatabaseProvider loading={renderStorageOpening()} fallback={renderStorageFailure}>
        <ProfileProvider>
          <AnimatedSplashOverlay />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="meal-entry" options={{ presentation: 'modal' }} />
            <Stack.Screen name="meal-saved" />
            <Stack.Screen name="profile" />
          </Stack>
        </ProfileProvider>
      </DatabaseProvider>
    </ThemeProvider>
  );
}

function renderStorageOpening() {
  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.centered}>
        <LoadingState label="기록을 여는 중입니다." />
      </SafeAreaView>
    </ThemedView>
  );
}

/**
 * The database could not be opened, so no screen can read or write anything.
 * Retrying in-process would reuse the same failed handle, so the honest advice
 * is to restart the app.
 */
function renderStorageFailure(error: unknown) {
  console.warn('기기 저장소를 열지 못했습니다.', error);
  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.centered}>
        <ErrorState
          title="기록 저장소를 열지 못했습니다."
          message="앱을 완전히 종료한 뒤 다시 실행해주세요. 저장된 기록은 그대로 남아 있습니다."
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center' },
});
