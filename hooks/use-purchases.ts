import { useState, useEffect, useCallback } from 'react';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { getCustomerInfo, hasPro, ENTITLEMENT_ID } from '@/lib/purchases';

interface PurchasesState {
  customerInfo: CustomerInfo | null;
  isPro: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePurchases(): PurchasesState {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const info = await getCustomerInfo();
    setCustomerInfo(info);
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
    isPro: hasPro(customerInfo),
    isLoading,
    error,
    refresh,
  };
}
