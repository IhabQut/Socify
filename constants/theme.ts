/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    surface: '#F5F5F5',
    card: 'rgba(0, 0, 0, 0.05)',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    primary: '#6200EE',
    secondary: '#03DAC6',
    accent: '#FF0266',
  },
  dark: {
    text: '#FFFFFF',
    background: '#080808', // Ultra Dark Obsidian
    surface: '#121212',
    card: 'rgba(255, 255, 255, 0.08)',
    tint: '#00F0FF', // Cyan Neon
    icon: '#8E8E93',
    tabIconDefault: '#8E8E93',
    tabIconSelected: '#00F0FF',
    primary: '#BC00FF', // Electric Purple
    secondary: '#00F0FF', // Electric Cyan
    accent: '#FF0055', // Neon Pink
    success: '#00FF95', // Matrix Green
    warning: '#FFCC00', // Warning Yellow
    error: '#FF3B30',
  },
};

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
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
