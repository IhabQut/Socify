import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@socify_onboarded';
const CHAT_HISTORY_KEY = '@socify_chat_history';

export class StorageService {
  static async setOnboarded() {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (e) {
      console.warn("Storage Error:", e);
    }
  }

  static async hasOnboarded(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      return value === 'true';
    } catch (e) {
      return false;
    }
  }

  static async saveChatHistory(messages: any[]) {
    try {
      await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn("Storage Error:", e);
    }
  }

  static async loadChatHistory(): Promise<any[] | null> {
    try {
      const value = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
      if (value !== null) {
        return JSON.parse(value);
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  static async clearChatHistory() {
    try {
      await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
    } catch (e) {
      console.warn("Storage Error:", e);
    }
  }
}
