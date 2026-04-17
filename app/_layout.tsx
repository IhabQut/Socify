import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useAuth, AuthProvider } from '@/hooks/use-auth';
import { configurePurchases } from '@/lib/purchases';
import * as Notifications from 'expo-notifications';
import { NotificationService } from '@/services/notificationService';
import * as WebBrowser from 'expo-web-browser';

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_KEY) {
  throw new Error("Missing critical EXPO_PUBLIC_SUPABASE_URL or KEY. Halting Boot.");
}

WebBrowser.maybeCompleteAuthSession();

// Prevent splash screen from hiding automatically
SplashScreen.preventAutoHideAsync();

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const unstable_settings = {
  initialRouteName: 'index',
};

function RootLayoutInternal() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const { loading: authLoading } = useAuth();

  useEffect(() => {
    configurePurchases();
    // Request notification permissions on mount
    NotificationService.requestPermissions();
  }, []);

  useEffect(() => {
    if (!authLoading) {
      SplashScreen.hideAsync();
    }
  }, [authLoading]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack 
        screenOptions={{ 
          headerShown: false,
          contentStyle: { backgroundColor: theme.background } 
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Welcome' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="paywall" 
          options={{ 
            presentation: 'fullScreenModal', 
            headerShown: false,
            contentStyle: { backgroundColor: theme.background }
          }} 
        />
        <Stack.Screen 
          name="template/[id]" 
          options={{ 
            presentation: 'fullScreenModal', 
            headerShown: false,
            contentStyle: { backgroundColor: theme.background }
          }} 
        />
        <Stack.Screen name="category/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutInternal />
    </AuthProvider>
  );
}
