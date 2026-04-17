/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#000000';
const tintColorDark = '#FFFFFF';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    card: '#F8F9FA',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    primary: '#000000',
    secondary: '#555555',
    accent: '#2866C9',
    border: '#EAEAEA',
    success: '#34C759',
    warning: '#FF9F0A',
    danger: '#FF3B30',
    overlay: 'rgba(0,0,0,0.4)',
    white: '#FFFFFF',
    black: '#000000',
    // Tool Identities
    indigo: '#5E5CE6',
    pink: '#FF375F',
    sky: '#32ADE6',
    orange: '#FF9F0A',
    green: '#34C759',
    rose: '#E1306C',
  },
  dark: {
    text: '#ECEDEE',
    background: '#0D0D0D',
    surface: '#121212',
    card: '#1A1A1A',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    primary: '#FFFFFF',
    secondary: '#A0A0A0',
    accent: '#2B8AE6', // Soft Indigo for creativity apps
    border: '#333333',
    success: '#34C759',
    warning: '#FF9F0A',
    danger: '#FF3B30',
    overlay: 'rgba(0,0,0,0.6)',
    white: '#FFFFFF',
    black: '#000000',
    // Tool Identities
    indigo: '#5E5CE6',
    pink: '#FF375F',
    sky: '#32ADE6',
    orange: '#FF9F0A',
    green: '#34C759',
    rose: '#E1306C',
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
