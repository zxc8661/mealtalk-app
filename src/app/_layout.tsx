import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { type ColorSchemeName, useColorScheme } from 'react-native';

import { ApiProvider } from '@/api/api-context';
import { AuthProvider, useAuth } from '@/auth/auth-context';
import { E2ESessionProbe } from '@/auth/e2e-session-probe';
import LoginScreen from '@/auth/login-screen';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { CurrentUserProvider } from '@/profile/current-user-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <AuthProvider>
      <ApiProvider>
        <AuthenticatedApp colorScheme={colorScheme} />
      </ApiProvider>
    </AuthProvider>
  );
}

function AuthenticatedApp({ colorScheme }: { readonly colorScheme: ColorSchemeName }) {
  const { isLoading, accessToken } = useAuth();
  if (isLoading) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {accessToken ? (
        <CurrentUserProvider>
          <E2ESessionProbe />
          <AnimatedSplashOverlay />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="meal-entry" options={{ presentation: 'modal' }} />
            <Stack.Screen name="meal-saved" />
            <Stack.Screen name="profile" />
          </Stack>
        </CurrentUserProvider>
      ) : (
        <LoginScreen />
      )}
    </ThemeProvider>
  );
}
