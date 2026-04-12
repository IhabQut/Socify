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
    if (data.is_pro) return true;
    return data.credits >= required;
  }
}
