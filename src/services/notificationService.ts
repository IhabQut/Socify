import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export class NotificationService {
  /**
   * Request permissions and handle setup
   */
  static async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.warn('[NotificationService] Not a physical device. Notifications may not work as expected.');
      // Still return true in dev to allow testing simulators if supported, but note the warning
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return true;
  }

  /**
   * Trigger an immediate test notification with a minor delay
   */
  static async sendTestNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Socify Test 🚀",
        body: "noor tamimiiiiiiiiiiiii ",
        data: { screen: 'paywall' },
        sound: true,
      },
      trigger: { seconds: 2 },
    });
  }

  /**
   * Schedule a daily reminder for the 30-day Roadmap
   */
  static async scheduleDailyReminder(hour: number = 10, minute: number = 0) {
    // Cancel existing reminders first to avoid duplicates
    await this.cancelAllNotifications();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time for your Growth Task! 📈",
        body: "Open Socify to complete today's activities and earn your daily credits.",
        data: { screen: 'calendar' },
        sound: true,
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });
  }

  /**
   * Utility to clear all scheduled notifications
   */
  static async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}
