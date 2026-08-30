import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthApiError, useAuth } from '@/auth/auth-context';
import {
  ControlSize,
  FormContentWidth,
  Opacity,
  Radius,
  Spacing,
} from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

WebBrowser.maybeCompleteAuthSession();

const UNCONFIGURED_CLIENT_ID = 'mealtalk-unconfigured';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const theme = useTheme();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [request, response, promptAsync] = useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? UNCONFIGURED_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? UNCONFIGURED_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? UNCONFIGURED_CLIENT_ID,
    selectAccount: true,
  });

  const hasClientId = useMemo(
    () =>
      Boolean(
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
          process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
          process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      ),
    [],
  );

  useEffect(() => {
    if (response?.type !== 'success') {
      return;
    }

    const idToken = response.params.id_token;
    if (!idToken) {
      return;
    }

    void Promise.resolve().then(() => {
      setIsSigningIn(true);
      setErrorMessage(null);
      return signIn(idToken)
        .catch((error: unknown) => {
          if (error instanceof AuthApiError && error.status === 401) {
            setErrorMessage('Google 설정을 확인해주세요.');
            return;
          }
          if (error instanceof Error) {
            setErrorMessage('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
            return;
          }
          throw error;
        })
        .finally(() => setIsSigningIn(false));
    });
  }, [response, signIn]);

  const signInDisabled = !request || isSigningIn || !hasClientId;
  const responseError =
    response?.type === 'error' || response?.type === 'dismiss'
      ? 'Google 로그인을 완료하지 못했습니다.'
      : null;
  const missingTokenError =
    response?.type === 'success' && !response.params.id_token
      ? 'Google에서 로그인 토큰을 받지 못했습니다.'
      : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <ThemedView style={styles.hero}>
          <ThemedText type="title">MealTalk</ThemedText>
          <ThemedText style={styles.subtitle} themeColor="textSecondary">
            나에게 맞는 식단을 가볍게 기록하세요.
          </ThemedText>
        </ThemedView>

        <ThemedView type="surface" style={styles.card}>
          <ThemedText type="subtitle">로그인하고 시작하기</ThemedText>
          <ThemedText themeColor="textSecondary">
            Google 계정으로 안전하게 로그인합니다. 서비스에 필요한 정보만 요청합니다.
          </ThemedText>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: signInDisabled }}
            disabled={signInDisabled}
            onPress={() => {
              setErrorMessage(null);
              void promptAsync();
            }}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.authProvider },
              pressed && styles.buttonPressed,
            ]}>
            {isSigningIn ? (
              <ActivityIndicator color={theme.onAuthProvider} />
            ) : (
              <ThemedText style={[styles.buttonText, { color: theme.onAuthProvider }]}>
                Google로 계속하기
              </ThemedText>
            )}
          </Pressable>

          {!hasClientId && (
            <ThemedText style={[styles.error, { color: theme.error }]}>
              Google Client ID가 설정되지 않았습니다. 환경변수를 확인해주세요.
            </ThemedText>
          )}
          {(errorMessage ?? responseError ?? missingTokenError) && (
            <ThemedText style={[styles.error, { color: theme.error }]}>
              {errorMessage ?? responseError ?? missingTokenError}
            </ThemedText>
          )}
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  content: {
    flex: 1,
    maxWidth: FormContentWidth,
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingVertical: Spacing.four,
    gap: Spacing.five,
  },
  hero: { gap: Spacing.two, alignItems: 'center' },
  subtitle: { textAlign: 'center' },
  card: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.card,
  },
  button: {
    minHeight: ControlSize.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
  },
  buttonPressed: { opacity: Opacity.pressed },
  buttonText: { fontWeight: '700' },
  error: { textAlign: 'center' },
});
