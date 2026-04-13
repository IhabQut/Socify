import { useState, useEffect, useCallback } from 'react';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { getCustomerInfo, hasPro, getAppUserID, ENTITLEMENT_ID } from '@/lib/purchases';
import { StorageService } from '@/services/storageService';
import { supabase } from '@/lib/supabase';

interface PurchasesState {
  customerInfo: CustomerInfo | null;
  isPro: boolean;
  isLoading: boolean;
  error: string | null;
  isOverridden: boolean;
  refresh: () => Promise<void>;
}

export function usePurchases(): PurchasesState {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [override, setOverride] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [info, devOverride] = await Promise.all([
        getCustomerInfo(),
        StorageService.getDeveloperProOverride()
      ]);
      setCustomerInfo(info);
      setOverride(devOverride);
      if (!info && devOverride === null) setError('Could not load subscription status.');
    } catch (e) {
      setError('Unexpected error loading purchases.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Listen for real-time CustomerInfo updates (e.g. after purchase)
    const listener = Purchases.addCustomerInfoUpdateListener((info) => {
      setCustomerInfo(info);
    });

    return () => {
      if (listener?.remove) {
        listener.remove();
      }
    };
  }, [refresh]);

  // Priority: Developer Override > RevenueCat Detection
  const isPro = override !== null ? override : hasPro(customerInfo);
  const isOverridden = override !== null;

  // Sync IsPro status to Supabase for RLS/Security use
  useEffect(() => {
    async function syncProStatus() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        // --- Identity Verification Guard ---
        // We only sync if the RevenueCat user ID matches the Supabase user ID.
        // This prevents syncing "ghost" entitlements from an anonymous profile
        // that hasn't been identified yet.
        const rcId = await getAppUserID();
        if (rcId !== session.user.id) {
          console.warn('[Purchases] Identity mismatch during sync. RC:', rcId, 'Supabase:', session.user.id);
          // Potential fix: Identify again if they are out of sync
          return;
        }

        const { error: syncError } = await supabase
          .from('users')
          .update({ is_pro: isPro })
          .eq('id', session.user.id);

        if (syncError) {
          console.error('[Purchases] Pro status sync failed:', syncError);
        } else {
          console.log('[Purchases] Pro status synced successfully:', isPro);
        }
      } catch (e) {
        console.error('[Purchases] Unexpected sync error:', e);
      }
    }
    
    // Only sync if we have valid customer info already loaded
    if (customerInfo) {
      syncProStatus();
    }
  }, [isPro, customerInfo]);

  return {
    customerInfo,
    isPro,
    isLoading,
    error,
    isOverridden,
    refresh,
  };
}
