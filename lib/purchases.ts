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
let identifyPromise: Promise<CustomerInfo | null> | null = null;
let pendingId: string | null = null;

export async function identifyUser(userId: string) {
  // If a request for this same ID is already in flight, return the existing promise
  if (identifyPromise && pendingId === userId) {
    return identifyPromise;
  }

  pendingId = userId;
  identifyPromise = (async () => {
    try {
      const currentId = await Purchases.getAppUserID();
      if (currentId === userId) return await Purchases.getCustomerInfo();
      
      const { customerInfo } = await Purchases.logIn(userId);
      return customerInfo;
    } catch (e) {
      console.error('[RevenueCat] identifyUser error:', e);
      return null;
    } finally {
      identifyPromise = null;
      pendingId = null;
    }
  })();

  return identifyPromise;
}

// ─── Check if user has Pro entitlement ───────────────────────────────────────
export function hasPro(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo) return false;
  return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
}

// ─── Fetch current CustomerInfo ───────────────────────────────────────────────
let customerInfoPromise: Promise<CustomerInfo | null> | null = null;

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (customerInfoPromise) return customerInfoPromise;

  customerInfoPromise = (async () => {
    try {
      return await Purchases.getCustomerInfo();
    } catch (e) {
      console.error('[RevenueCat] getCustomerInfo error:', e);
      return null;
    } finally {
      customerInfoPromise = null;
    }
  })();

  return customerInfoPromise;
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

// ─── Utility: Get current ID ──────────────────────────────────────────────────
export async function getAppUserID(): Promise<string> {
  return await Purchases.getAppUserID();
}
