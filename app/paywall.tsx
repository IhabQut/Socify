import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Purchases, { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import Animated, { Easing, FadeIn, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ENTITLEMENT_ID } from '@/lib/purchases';
import { StorageService } from '@/services/storageService';
import { Skeleton } from '@/components/ui/Skeleton';
import { NotificationService } from '@/services/notificationService';
import { usePurchases } from '@/hooks/use-purchases';
import { supabase } from '@/lib/supabase';
import { CreditService } from '@/services/creditService';

const { width, height } = Dimensions.get('window');

const PRO_FEATURES = [
  { id: '1', text: 'Unlimited AI Chat generations', icon: 'chatbubbles' },
  { id: '2', text: 'Access all Premium market templates', icon: 'diamond' },
  { id: '3', text: 'Advanced Qwen3 80B Power model', icon: 'flash' },
  { id: '4', text: 'Priority customer support', icon: 'headset' },
];

export default function PaywallScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [paywallType, setPaywallType] = useState<'plans' | 'credits'>('plans');
  const { isPro, customerInfo } = usePurchases();

  // Animation assets
  const scale = useSharedValue(1);
  const borderPulse = useSharedValue(0);
  const packageBorderPulse = useSharedValue(0);
  const logoFloat = useSharedValue(0);

  useEffect(() => {
    fetchOfferings();
    
    // Scale pulse for the primary CTA
    scale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Border glow pulse
    borderPulse.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Package card border pulse
    packageBorderPulse.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Continuous logo floating animation
    logoFloat.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const fetchOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      console.log('[Paywall] All Offerings:', Object.keys(offerings.all));
      
      // 1. Try to find the best offering to display
      // Prefer 'current', but if empty/null, try to find any that has packages
      let bestOffering = offerings.current;
      
      if (!bestOffering || bestOffering.availablePackages.length === 0) {
        const allOfferings = Object.values(offerings.all);
        bestOffering = allOfferings.find(o => o.availablePackages.length > 0) || null;
      }
      
      if (bestOffering) {
        setOffering(bestOffering);
        
        // 2. Default selection logic
        // If we're starting on 'plans', prefer annual/monthly
        const pkg = bestOffering.annual || bestOffering.monthly || bestOffering.availablePackages[0];
        setSelectedPackage(pkg);
        
        // If the default package is NOT a recurring one, set tab to 'credits'
        const isRecur = pkg.packageType === 'ANNUAL' || pkg.packageType === 'MONTHLY' || pkg.packageType === 'WEEKLY' || pkg.packageType === 'SIX_MONTH' || pkg.packageType === 'THREE_MONTH' || pkg.packageType === 'TWO_MONTH';
        if (!isRecur && paywallType === 'plans') {
          setPaywallType('credits');
        }
      } else {
        console.warn('[Paywall] No offerings with packages found.');
      }
    } catch (e) {
      console.error('[Paywall] Fetch offerings failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage || isPurchasing) return;
    setIsPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { customerInfo: updatedInfo } = await Purchases.purchasePackage(selectedPackage);
      
      // ── Credit Grant Logic ──
      const getCreditsForPackage = (pkg: PurchasesPackage) => {
        // TODO(Security): Move this credit addition logic into a Supabase Edge Function triggered by RevenueCat Webhooks.
        // Granting credits directly from the client via RPC is highly insecure.
        
        // RevenueCat Payloads allow injecting metadata per package.
        // If meta exists and has credits, trust it over hardcoded maps.
        if (pkg.product.currencyCode && pkg.product.title.toLowerCase().includes('credits')) {
           // Fallback dictionary
           const CREDIT_PACKAGES: Record<string, number> = {
             'socify_50_credits': 50,
             'socify_100_credits': 100,
             'socify_200_credits': 200,
             'socify_250_credits': 250,
             'socify_500_credits': 500,
             'socify_1000_credits': 1000,
             'socify_1500_credits': 1500,
             'socify_2500_credits': 2500,
             'socify_5000_credits': 5000,
             'socify_10000_credits': 10000,
           };
           return CREDIT_PACKAGES[pkg.identifier.toLowerCase()] || 0;
        }

        if (pkg.packageType === 'MONTHLY') return 100;
        if (pkg.packageType === 'ANNUAL') return 1500;
        return 0;
      };

      const creditsToGrant = getCreditsForPackage(selectedPackage);

      if (creditsToGrant > 0) {
        // TODO(Security): Discard this exact client-side RPC call in favor of a Supabase Edge Function Webhook validator.
        await supabase.rpc('add_credits', { amount_to_add: creditsToGrant });
      }

      if (updatedInfo.entitlements.active[ENTITLEMENT_ID] !== undefined || creditsToGrant > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert("Purchase Error", "Could not complete your purchase.");
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } else {
        Alert.alert("No Subscription Found", "No active subscription found for your account.");
      }
    } catch (e) {
      Alert.alert("Restore Error", "Could not restore purchases.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const calculateFullPrice = (pkg: PurchasesPackage) => {
    if (pkg.packageType === 'ANNUAL' && offering?.monthly) {
      const monthlyAmount = offering.monthly.product.price;
      const calculatedAnnual = monthlyAmount * 12;
      return `${offering.monthly.product.currencyCode} ${calculatedAnnual.toFixed(2)}`;
    }
    return null;
  };

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const animatedPackageBorderStyle = useAnimatedStyle(() => {
    return {
      opacity: packageBorderPulse.value,
      borderWidth: 2,
      borderColor: theme.accent,
      borderRadius: 16,
    };
  });

  const animatedOuterBorderStyle = useAnimatedStyle(() => {
    return {
      opacity: borderPulse.value,
      transform: [{ scale: 1 + borderPulse.value * 0.05 }],
      borderColor: theme.accent,
      borderWidth: 2,
    };
  });
  
  const animatedLogoStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: -8 * logoFloat.value },
        { rotate: `${-3 + logoFloat.value * 6}deg` },
        { scale: 1 + logoFloat.value * 0.05 }
      ],
    };
  });

  const PaywallSkeleton = ({ theme }: any) => (
    <View style={{ flex: 1, padding: 30, paddingTop: 60 }}>
      <View style={{ alignSelf: 'center', marginBottom: 40, alignItems: 'center' }}>
        <Skeleton width={80} height={80} borderRadius={20} style={{ marginBottom: 20 }} />
        <Skeleton width={200} height={28} style={{ marginBottom: 12 }} />
        <Skeleton width={160} height={16} />
      </View>

      <View style={{ gap: 16, marginBottom: 40 }}>
        {[1, 2, 3].map(i => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Skeleton width={24} height={24} borderRadius={12} />
            <View style={{ gap: 6, flex: 1 }}>
              <Skeleton width="80%" height={14} />
              <Skeleton width="40%" height={10} />
            </View>
          </View>
        ))}
      </View>

      <View style={{ gap: 16 }}>
        <Skeleton width="100%" height={80} borderRadius={16} />
        <Skeleton width="100%" height={80} borderRadius={16} />
      </View>

      <View style={{ position: 'absolute', bottom: 40, left: 30, right: 30 }}>
        <Skeleton width="100%" height={60} borderRadius={30} />
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <PaywallSkeleton theme={theme} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.content}>
        
        {/* Close Button - Delayed entrance to drive conversion */}
        <Animated.View entering={FadeIn.delay(2500).duration(800)}>
          <Pressable 
            onPress={() => router.back()} 
            style={[styles.closeBtn, { borderColor: theme.border }]}
          >
            <Ionicons name="close" size={20} color={theme.icon} />
          </Pressable>
        </Animated.View>

        {/* Header - Compact */}
        <View style={styles.header}>
          <Animated.View entering={ZoomIn.duration(600)}>
            <Animated.View style={animatedLogoStyle}>
              <Image 
                source={require('../assets/images/logo.png')} 
                style={styles.logo} 
                resizeMode="contain" 
              />
            </Animated.View>
          </Animated.View>
          <Text style={[styles.title, { color: theme.text }]}>Socify Pro</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>
            Unlimited AI-driven marketing power.
          </Text>
        </View>

        {/* Features - Grid/Compact */}
        <View style={styles.featuresContainer}>
          {PRO_FEATURES.map((feature, index) => (
            <Animated.View 
              key={feature.id} 
              entering={FadeInUp.delay(300 + index * 100).duration(400)}
              style={styles.featureRow}
            >
              <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
              <Text style={[styles.featureText, { color: theme.text }]}>{feature.text}</Text>
            </Animated.View>
          ))}
        </View>

        {/* Paywall Type Toggle */}
        <View style={[styles.toggleContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Pressable 
            style={[styles.toggleBtn, paywallType === 'plans' && { backgroundColor: theme.primary }]}
            onPress={() => { 
              setPaywallType('plans'); 
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // Auto-select first plan if current selection is a credit pack
              const firstPlan = offering?.availablePackages.find(p => ['ANNUAL', 'MONTHLY', 'WEEKLY', 'SIX_MONTH', 'THREE_MONTH', 'TWO_MONTH'].includes(p.packageType));
              if (firstPlan) setSelectedPackage(firstPlan);
            }}
          >
            <Text style={[styles.toggleBtnText, { color: paywallType === 'plans' ? theme.background : theme.text }]}>Plans</Text>
          </Pressable>
          <Pressable 
            style={[styles.toggleBtn, paywallType === 'credits' && { backgroundColor: theme.primary }]}
            onPress={() => { 
              setPaywallType('credits'); 
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // Auto-select first credit pack if current selection is a recurring plan
              const firstCredit = offering?.availablePackages.find(p => !['ANNUAL', 'MONTHLY', 'WEEKLY', 'SIX_MONTH', 'THREE_MONTH', 'TWO_MONTH'].includes(p.packageType));
              if (firstCredit) setSelectedPackage(firstCredit);
            }}
          >
            <Text style={[styles.toggleBtnText, { color: paywallType === 'credits' ? theme.background : theme.text }]}>Credit Packs</Text>
          </Pressable>
        </View>

        {/* Offerings - Stacked but compact */}
        <View style={styles.offeringContainer}>
          {offering?.availablePackages
            .filter(pkg => {
              const isRecur = ['ANNUAL', 'MONTHLY', 'WEEKLY', 'SIX_MONTH', 'THREE_MONTH', 'TWO_MONTH'].includes(pkg.packageType);
              return paywallType === 'plans' ? isRecur : !isRecur;
            })
            .map((pkg, index) => {
            const isSelected = selectedPackage?.identifier === pkg.identifier;
            const isYearly = pkg.packageType === 'ANNUAL';
            const isMonthly = pkg.packageType === 'MONTHLY';
            const fullPrice = calculateFullPrice(pkg);
            
            // Credit amount for label/badge
            const getCreditsLabel = (pkg: PurchasesPackage) => {
              if (pkg.packageType === 'ANNUAL') return "1,500";
              if (pkg.packageType === 'MONTHLY') return "100";
              
              const id = pkg.identifier.toLowerCase();
              
              // Extract number from identifier for custom patterns (like Agency_1000)
              const match = id.match(/(\d+)/);
              if (match) {
                const num = parseInt(match[0]);
                if (num >= 1000) return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + "k";
                return num.toString();
              }

              if (id.includes('5000')) return "5.0k";
              if (id.includes('1500')) return "1.5k";
              if (id.includes('500')) return "500";
              if (id.includes('200')) return "200";
              if (id.includes('50')) return "50";
              return "Pack";
            };

            const credits = getCreditsLabel(pkg);

            return (
              <Animated.View key={pkg.identifier} entering={FadeInUp.delay(600 + index * 100).duration(400)}>
                <Pressable
                  onPress={() => {
                    setSelectedPackage(pkg);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.packageCard,
                    { 
                      backgroundColor: theme.card, 
                      borderColor: isSelected ? theme.primary : theme.border,
                      borderWidth: isSelected ? 2 : 1
                    }
                  ]}
                >
                  {/* Animated Border for Selection */}
                  {isSelected && (
                    <Animated.View 
                      style={[
                        StyleSheet.absoluteFill, 
                        animatedPackageBorderStyle,
                        { margin: -2 } // Offset the border to overlap
                      ]} 
                    />
                  )}

                  {/* Credit Badge on the border */}
                  <View style={[styles.creditBadge, { backgroundColor: theme.warning, borderColor: theme.background }]}>
                    <Ionicons name="flash" size={10} color={theme.background} />
                    <Text style={[styles.creditBadgeText, { color: theme.background }]}>
                      {credits}
                    </Text>
                  </View>

                  <View style={styles.packageInfo}>
                    <Text style={[styles.packageTitle, { color: theme.text }]}>
                      {isYearly ? "Annual Plan" : (isMonthly ? "Monthly Plan" : `${credits} Credits`)}
                    </Text>
                    {isYearly && (
                      <Text style={[styles.trialLabel, { color: theme.text, opacity: 0.8 }]}>
                        Includes 3-Day Free Trial
                      </Text>
                    )}
                    <Text style={[styles.packageSubtitle, { color: theme.icon }]}>
                      {isYearly ? "Best Value • Unlimited potential" : 
                       (isMonthly ? "Flexible • Start creating" : 
                       (parseInt(credits.replace(/,/g, '')) >= 5000 ? "Agency Gear • Bulk discount" : 
                        parseInt(credits.replace(/,/g, '')) >= 1000 ? "Pro Bundle • Professional choice" :
                        "One-time purchase • Quick start"))}
                    </Text>
                  </View>
                  
                  <View style={styles.packagePricing}>
                    {isYearly && fullPrice && (
                      <Text style={[styles.strikeText, { color: theme.icon }]}>{fullPrice}</Text>
                    )}
                    <Text style={[styles.priceText, { color: theme.text }]}>{pkg.product.priceString}</Text>
                  </View>

                  {isSelected && (
                    <View style={[styles.checkIndicator, { backgroundColor: theme.primary }]}>
                      <Ionicons name="checkmark" size={10} color={theme.background} />
                    </View>
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {/* Action Button */}
        <View style={styles.actionSection}>
          <Animated.View style={animatedButtonStyle}>
            {/* Animated Glow/Border Background */}
            <Animated.View 
              style={[
                styles.buttonGlow, 
                animatedOuterBorderStyle
              ]} 
            />
            
            <Pressable 
              onPress={handlePurchase}
              disabled={!selectedPackage || isPurchasing}
              style={[
                styles.purchaseBtn,
                { backgroundColor: theme.primary, opacity: isPurchasing ? 0.7 : 1 }
              ]}
            >
              {isPurchasing ? (
                <ActivityIndicator color={theme.background} />
              ) : (
                <Text style={[styles.purchaseBtnText, { color: theme.background }]}>
                  {paywallType === 'plans' ? 'Start Subscription' : 'Buy Credits Pack'}
                </Text>
              )}
            </Pressable>
          </Animated.View>
          
          <View style={styles.footer}>
            <Pressable onPress={handleRestore}>
              <Text style={[styles.footerLink, { color: theme.icon }]}>Restore Purchases</Text>
            </Pressable>
            <Text style={[styles.footerLink, { color: theme.icon }]}> • </Text>
            <Pressable onPress={() => Alert.alert("Terms", "Standard terms apply.")}>
              <Text style={[styles.footerLink, { color: theme.icon }]}>Terms & Privacy</Text>
            </Pressable>
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: 24, paddingVertical: 12 },
  
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, alignSelf: 'flex-end', marginTop: 32, marginBottom: 8 },
  
  header: { alignItems: 'center', marginBottom: 16 },
  logo: { width: 60, height: 60, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 15, textAlign: 'center', fontWeight: '500' },

  toggleContainer: { flexDirection: 'row', padding: 4, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  toggleBtnText: { fontSize: 13, fontWeight: '700' },

  featuresContainer: { gap: 12, marginBottom: 16, paddingHorizontal: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, fontWeight: '500' },

  offeringContainer: { gap: 10, marginBottom: 20 },
  packageCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16 },
  packageInfo: { flex: 1 },
  packageTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  trialLabel: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  packageSubtitle: { fontSize: 11, fontWeight: '500' },
  packagePricing: { alignItems: 'flex-end' },
  strikeText: { fontSize: 12, textDecorationLine: 'line-through', marginBottom: 2 },
  priceText: { fontSize: 17, fontWeight: '800' },
  
  checkIndicator: { position: 'absolute', top: -8, left: 12, width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  actionSection: { marginTop: 'auto', gap: 16, paddingBottom: 20 },
  purchaseBtn: { width: '100%', height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  buttonGlow: { position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderRadius: 32, borderWidth: 2 },
  purchaseBtnText: { fontSize: 16, fontWeight: '700' },

  creditBadge: { position: 'absolute', top: -10, right: 16, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 2, zIndex: 10 },
  creditBadgeText: { fontSize: 11, fontWeight: '900' },

  devBypassBtn: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed' },
  devBypassText: { fontSize: 12, fontWeight: '700' },
  devRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 12 },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  footerLink: { fontSize: 12, fontWeight: '500' },
});
