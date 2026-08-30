/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#18201B',
    background: '#F8FAF5',
    backgroundElement: '#EEF2EA',
    backgroundSelected: '#DFE8D9',
    textSecondary: '#5C675F',
    surface: '#EEF2EA',
    surfaceRaised: '#FFFFFF',
    border: '#CBD5C7',
    primary: '#246B45',
    onPrimary: '#FFFFFF',
    success: '#26734D',
    warning: '#8A5A12',
    error: '#B42318',
    info: '#176B87',
    focus: '#147D64',
    authProvider: '#1A73E8',
    onAuthProvider: '#FFFFFF',
  },
  dark: {
    text: '#F4F7F1',
    background: '#111613',
    backgroundElement: '#202822',
    backgroundSelected: '#2D3A30',
    textSecondary: '#B4BFB6',
    surface: '#202822',
    surfaceRaised: '#28312A',
    border: '#465249',
    primary: '#7DD3A5',
    onPrimary: '#0D2B1C',
    success: '#7DD3A5',
    warning: '#F0C36A',
    error: '#FFB4AB',
    info: '#7DD5ED',
    focus: '#8DE7CB',
    authProvider: '#8AB4F8',
    onAuthProvider: '#10233F',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  control: Spacing.two,
  card: Spacing.three,
  pill: Spacing.five,
  dialog: Spacing.four,
} as const;

export const Typography = {
  display: { fontSize: 48, lineHeight: 52, fontWeight: '600' },
  heading1: { fontSize: 36, lineHeight: 44, fontWeight: '600' },
  heading2: { fontSize: 32, lineHeight: 40, fontWeight: '600' },
  heading3: { fontSize: 24, lineHeight: 32, fontWeight: '600' },
  heading4: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '500' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '700' },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
} as const;

export const ControlSize = { minimum: 44, primary: 52 } as const;
export const BorderWidth = { thin: 1, emphasis: 2 } as const;
export const Opacity = { pressed: 0.8, subtle: 0.7 } as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
export const FormContentWidth = 520;
export const ResponsiveFieldWidth = 240;
