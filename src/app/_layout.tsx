import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { type ColorSchemeName, useColorScheme } from 'react-native';

import { AuthProvider, useAuth } from '@/auth/auth-context';
import LoginScreen from '@/auth/login-screen';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return <AuthProvider><AuthenticatedApp colorScheme={colorScheme} /></AuthProvider>;
}

function AuthenticatedApp({ colorScheme }: { readonly colorScheme: ColorSchemeName }) {
  const { isLoading, accessToken } = useAuth();
  if (isLoading) return null;
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {accessToken ? <><AnimatedSplashOverlay /><AppTabs /></> : <LoginScreen />}
    </ThemeProvider>
  );
}
