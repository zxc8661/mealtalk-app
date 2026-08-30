import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { type ColorSchemeName, useColorScheme } from 'react-native';

import { ApiProvider } from '@/api/api-context';
import { AuthProvider, useAuth } from '@/auth/auth-context';
import { E2ESessionProbe } from '@/auth/e2e-session-probe';
import LoginScreen from '@/auth/login-screen';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
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
        <>
          <E2ESessionProbe />
          <AnimatedSplashOverlay />
          <AppTabs />
        </>
      ) : (
        <LoginScreen />
      )}
    </ThemeProvider>
  );
}
