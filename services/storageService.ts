import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@socify_onboarded';
const CHAT_HISTORY_KEY = '@socify_chat_history';
const GEN_COUNT_KEY = '@socify_gen_count';
const USER_PROFILE_KEY = '@socify_user_profile';
const CREDITS_KEY = '@socify_credits';
const PLAN_START_KEY = '@socify_plan_start';
const COMPLETED_DAYS_KEY = '@socify_completed_days';
const WEEKLY_BONUS_CLAIMED_KEY = '@socify_weekly_bonus_claimed';
const DEV_PRO_BYPASS_KEY = '@socify_dev_pro_bypass';
const COMPLETED_TASKS_KEY = '@socify_completed_tasks';

export interface UserProfile {
  alias: string;
  primaryFocus: string;
  avatarId?: string;
}

export class StorageService {
  static async saveUserProfile(profile: UserProfile) {
    try {
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn("Storage Error:", e);
    }
  }

  static async loadUserProfile(): Promise<UserProfile | null> {
    try {
      const value = await AsyncStorage.getItem(USER_PROFILE_KEY);
      if (value !== null) {
        return JSON.parse(value);
      }
    } catch (e) {
      return null;
    }
    return null;
  }

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

  static async getGenerationCount(): Promise<number> {
    try {
      const val = await AsyncStorage.getItem(GEN_COUNT_KEY);
      return val ? parseInt(val) : 0;
    } catch { return 0; }
  }

  static async incrementGenerationCount(): Promise<number> {
    try {
      const current = await this.getGenerationCount();
      const next = current + 1;
      await AsyncStorage.setItem(GEN_COUNT_KEY, next.toString());
      return next;
    } catch { return 0; }
  }

  static async getUserCredits(): Promise<number> {
    try {
      const val = await AsyncStorage.getItem(CREDITS_KEY);
      return val ? parseInt(val) : 0;
    } catch { return 0; }
  }

  static async setUserCredits(credits: number) {
    try {
      await AsyncStorage.setItem(CREDITS_KEY, credits.toString());
    } catch (e) { console.warn("Storage Error:", e); }
  }

  static async grantCredits(amount: number) {
    const current = await this.getUserCredits();
    await this.setUserCredits(current + amount);
  }

  static async getPlanStartDate(): Promise<number | null> {
    try {
      const val = await AsyncStorage.getItem(PLAN_START_KEY);
      return val ? parseInt(val) : null;
    } catch { return null; }
  }

  static async setPlanStartDate(timestamp: number) {
    try {
      await AsyncStorage.setItem(PLAN_START_KEY, timestamp.toString());
    } catch (e) { console.warn("Storage Error:", e); }
  }

  static async getCompletedDays(): Promise<number[]> {
    try {
      const val = await AsyncStorage.getItem(COMPLETED_DAYS_KEY);
      return val ? JSON.parse(val) : [];
    } catch { return []; }
  }

  static async markDayComplete(day: number) {
    try {
      const days = await this.getCompletedDays();
      if (!days.includes(day)) {
        days.push(day);
        await AsyncStorage.setItem(COMPLETED_DAYS_KEY, JSON.stringify(days));
        return true;
      }
      return false;
    } catch (e) { return false; }
  }

  static async getCompletedTasks(): Promise<string[]> {
    try {
      const val = await AsyncStorage.getItem(COMPLETED_TASKS_KEY);
      return val ? JSON.parse(val) : [];
    } catch { return []; }
  }

  static async markTaskComplete(taskId: string): Promise<boolean> {
    try {
      const tasks = await this.getCompletedTasks();
      if (!tasks.includes(taskId)) {
        tasks.push(taskId);
        await AsyncStorage.setItem(COMPLETED_TASKS_KEY, JSON.stringify(tasks));
        return true;
      }
      return false;
    } catch (e) { return false; }
  }

  static async getWeeklyBonusClaimed(weekIndex: number): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(`${WEEKLY_BONUS_CLAIMED_KEY}_${weekIndex}`);
      return val === 'true';
    } catch { return false; }
  }

  static async setWeeklyBonusClaimed(weekIndex: number) {
    try {
      await AsyncStorage.setItem(`${WEEKLY_BONUS_CLAIMED_KEY}_${weekIndex}`, 'true');
    } catch (e) { console.warn("Storage Error:", e); }
  }

  static async getDevProBypass(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(DEV_PRO_BYPASS_KEY);
      return val === 'true';
    } catch { return false; }
  }

  static async setDevProBypass(enabled: boolean) {
    try {
      await AsyncStorage.setItem(DEV_PRO_BYPASS_KEY, enabled ? 'true' : 'false');
    } catch (e) { console.warn("Storage Error:", e); }
  }
}
