// RevenueCat Subscription Service Mock Skeleton
// Ready to be linked with `react-native-purchases` once native module compilation begins.

import { Platform } from 'react-native';

const API_KEYS = {
    apple: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY || "appl_placeholder",
    google: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY || "goog_placeholder"
};

export class RevenueCatService {
    static async initialize() {
        if (Platform.OS === 'ios') {
            console.log("RevenueCat: Initialized with Apple Key", API_KEYS.apple);
        } else if (Platform.OS === 'android') {
            console.log("RevenueCat: Initialized with Google Key", API_KEYS.google);
        }
    }

    static async fetchOfferings() {
        // Scaffolding for Purchases.getOfferings()
        return [
            { id: "pro_monthly", title: "Pro Monthly", price: "$9.99" },
            { id: "pro_yearly", title: "Pro Yearly", price: "$89.99" }
        ];
    }

    static async purchasePackage(packageId: string) {
        // Scaffolding for Purchases.purchasePackage(pkg)
        console.log(`Purchased package: ${packageId}`);
        return { success: true, entitlement: "pro_tier" };
    }
}
