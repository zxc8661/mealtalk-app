import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'heading1'
    | 'heading2'
    | 'heading3'
    | 'heading4'
    | 'small'
    | 'caption'
    | 'smallBold'
    | 'bodyStrong'
    | 'subtitle'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'heading1' && styles.heading1,
        type === 'heading2' && styles.heading2,
        type === 'heading3' && styles.heading3,
        type === 'heading4' && styles.heading4,
        type === 'small' && styles.small,
        type === 'caption' && styles.caption,
        type === 'smallBold' && styles.smallBold,
        type === 'bodyStrong' && styles.bodyStrong,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: Typography.small,
  caption: Typography.caption,
  smallBold: { ...Typography.small, fontWeight: Typography.bodyStrong.fontWeight },
  default: Typography.body,
  bodyStrong: Typography.bodyStrong,
  title: Typography.display,
  heading1: Typography.heading1,
  heading2: Typography.heading2,
  heading3: Typography.heading3,
  heading4: Typography.heading4,
  subtitle: Typography.heading2,
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
