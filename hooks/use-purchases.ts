import { useState, useEffect, useCallback } from 'react';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { getCustomerInfo, hasPro, ENTITLEMENT_ID } from '@/lib/purchases';
import { StorageService } from '@/services/storageService';

interface PurchasesState {
  customerInfo: CustomerInfo | null;
  isPro: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePurchases(): PurchasesState {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isDevPro, setIsDevPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const info = await getCustomerInfo();
    setCustomerInfo(info);
    if (__DEV__) {
      const devBypass = await StorageService.getDevProBypass();
      setIsDevPro(devBypass);
    }
    if (!info) setError('Could not load subscription status.');
    setIsLoading(false);
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

  return {
    customerInfo,
    isPro: hasPro(customerInfo, isDevPro),
    isLoading,
    error,
    refresh,
  };
}
