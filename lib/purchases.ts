import Purchases, { CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

// ─── API Keys ───────────────────────────────────────────────────────────────
const RC_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;


// ─── Entitlements & Products ─────────────────────────────────────────────────
export const ENTITLEMENT_ID = 'Socify Pro';
export const OFFERING_MONTHLY = 'monthly';
export const OFFERING_YEARLY = 'yearly';

// ─── Configure SDK ───────────────────────────────────────────────────────────
export function configurePurchases() {
  if (!RC_API_KEY) {
    console.error('[RevenueCat] No API key found in environment variables.');
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({
    apiKey: RC_API_KEY,
  });
}

// ─── Identify user (call after auth is established) ──────────────────────────
export async function identifyUser(userId: string) {
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    return customerInfo;
  } catch (e) {
    console.error('[RevenueCat] identifyUser error:', e);
    return null;
  }
}

// ─── Check if user has Pro entitlement ───────────────────────────────────────
export function hasPro(customerInfo: CustomerInfo | null, devBypass: boolean = false): boolean {
  if (__DEV__ && devBypass) return true;
  if (!customerInfo) return false;
  return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
}

// ─── Fetch current CustomerInfo ───────────────────────────────────────────────
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    console.error('[RevenueCat] getCustomerInfo error:', e);
    return null;
  }
}

// ─── Restore Purchases ────────────────────────────────────────────────────────
export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.restorePurchases();
  } catch (e) {
    console.error('[RevenueCat] restorePurchases error:', e);
    return null;
  }
}
