import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const ONBOARDING_KEY = '@socify_onboarded';
const CHAT_HISTORY_KEY = '@socify_chat_history';
const GEN_COUNT_KEY = '@socify_gen_count';
const USER_PROFILE_KEY = '@socify_user_profile';
const CREDITS_KEY = '@socify_credits';
const PLAN_START_KEY = '@socify_plan_start';
const COMPLETED_DAYS_KEY = '@socify_completed_days';
const WEEKLY_BONUS_CLAIMED_KEY = '@socify_weekly_bonus_claimed';
const COMPLETED_TASKS_KEY = '@socify_completed_tasks';
const DEV_PRO_OVERRIDE_KEY = '@socify_dev_pro_override';
const SUPABASE_PROFILE_KEY = '@socify_supabase_profile';
const BRANDS_CACHE_KEY = '@socify_brands_cache';
const DEVICE_ID_KEY = '@socify_device_id';
const RECOVERY_SESSION_KEY = '@socify_recovery_session';

export interface UserProfile {
  alias: string;
  primaryFocus: string;
  avatarId?: string;
}

export class StorageService {
  static async saveUserProfile(profile: UserProfile) {
    try {
      await SecureStore.setItemAsync(USER_PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn("Storage Error:", e);
    }
  }

  static async loadUserProfile(): Promise<UserProfile | null> {
    try {
      const value = await SecureStore.getItemAsync(USER_PROFILE_KEY);
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

  static async saveChatHistory(messages: Record<string, unknown>[]) {
    try {
      await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn("Storage Error:", e);
    }
  }

  static async loadChatHistory(): Promise<Record<string, unknown>[] | null> {
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
      const val = await SecureStore.getItemAsync(GEN_COUNT_KEY);
      return val ? parseInt(val) : 0;
    } catch { return 0; }
  }

  static async incrementGenerationCount(): Promise<number> {
    try {
      const current = await this.getGenerationCount();
      const next = current + 1;
      await SecureStore.setItemAsync(GEN_COUNT_KEY, next.toString());
      return next;
    } catch { return 0; }
  }

  static async getUserCredits(): Promise<number> {
    try {
      const val = await SecureStore.getItemAsync(CREDITS_KEY);
      return val ? parseInt(val) : 0;
    } catch { return 0; }
  }

  static async setUserCredits(credits: number) {
    try {
      await SecureStore.setItemAsync(CREDITS_KEY, credits.toString());
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

  static async getDeveloperProOverride(): Promise<boolean | null> {
    try {
      const val = await SecureStore.getItemAsync(DEV_PRO_OVERRIDE_KEY);
      if (val === null) return null;
      return val === 'true';
    } catch { return null; }
  }

  static async setDeveloperProOverride(isPro: boolean | null) {
    try {
      if (isPro === null) {
        await SecureStore.deleteItemAsync(DEV_PRO_OVERRIDE_KEY);
      } else {
        await SecureStore.setItemAsync(DEV_PRO_OVERRIDE_KEY, isPro.toString());
      }
    } catch (e) { console.warn("Storage Error:", e); }
  }

  static async saveSupabaseProfile(profile: any) {
    try {
      await AsyncStorage.setItem(SUPABASE_PROFILE_KEY, JSON.stringify(profile));
    } catch (e) { console.warn("Storage Error:", e); }
  }

  static async loadSupabaseProfile(): Promise<any | null> {
    try {
      const val = await AsyncStorage.getItem(SUPABASE_PROFILE_KEY);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  }

  static async saveBrandsCache(brands: any[]) {
    try {
      await AsyncStorage.setItem(BRANDS_CACHE_KEY, JSON.stringify(brands));
    } catch (e) { console.warn("Storage Error:", e); }
  }

  static async loadBrandsCache(): Promise<any[] | null> {
    try {
      const val = await AsyncStorage.getItem(BRANDS_CACHE_KEY);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  }

  static async clearAllAuth() {
    try {
      await AsyncStorage.removeItem(SUPABASE_PROFILE_KEY);
      await AsyncStorage.removeItem(BRANDS_CACHE_KEY);
      await AsyncStorage.removeItem(ONBOARDING_KEY);
      await SecureStore.deleteItemAsync(RECOVERY_SESSION_KEY);
    } catch (e) { console.warn("Storage Error:", e); }
  }

  static async getDeviceId(): Promise<string> {
    try {
      let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
      if (!id) {
        id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
      }
      return id;
    } catch {
      return 'unknown_device';
    }
  }

  static async saveRecoverySession(session: any) {
    try {
      await SecureStore.setItemAsync(RECOVERY_SESSION_KEY, JSON.stringify(session));
    } catch (e) { console.warn("Storage Error:", e); }
  }

  static async loadRecoverySession(): Promise<any | null> {
    try {
      const val = await SecureStore.getItemAsync(RECOVERY_SESSION_KEY);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  }
}
