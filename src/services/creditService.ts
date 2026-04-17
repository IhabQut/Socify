import { supabase } from '@/lib/supabase';

export interface CreditResponse {
  success: boolean;
  remaining?: number;
  error?: string;
}

export class CreditService {
  /**
   * Safely deduct credits from the user balance using the Postgres RPC.
   * Handles Pro users automatically (server-side logic).
   */
  static async deductCredits(amount: number): Promise<CreditResponse> {
    try {
      const { data, error } = await supabase.rpc('deduct_credits', {
        amount_to_deduct: amount
      });

      if (error) {
        console.error('[CreditService] RPC Error:', error);
        return { success: false, error: error.message };
      }

      const response = data as CreditResponse;
      return response;
    } catch (e: any) {
      console.error('[CreditService] Unexpected Error:', e);
      return { success: false, error: 'Network error or service unavailable.' };
    }
  }

  /**
   * Use for checking if a user has enough credits without deducting.
   * Note: Always prefer deductCredits for atomic operations to prevent race conditions.
   */
  static async checkBalance(required: number): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    const { data, error } = await supabase
      .from('users')
      .select('credits, is_pro')
      .eq('id', userData.user.id)
      .single();

    if (error || !data) return false;
    return data.credits >= required;
  }

  /**
   * Grant credits to the user after completing a task or promotion.
   * Remote operation ensures cross-device consistency.
   */
  static async addCredits(amount: number): Promise<CreditResponse> {
    try {
      const { data, error } = await supabase.rpc('add_credits', {
        amount_to_add: amount
      });

      if (error) {
        console.error('[CreditService] Add RPC Error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, remaining: (data as any).new_balance };
    } catch (e: any) {
      console.error('[CreditService] Unexpected Add Error:', e);
      return { success: false, error: 'Database sync failed.' };
    }
  }
}
