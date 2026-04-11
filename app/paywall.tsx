import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Purchases, { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import Animated, { Easing, FadeIn, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ENTITLEMENT_ID } from '@/lib/purchases';
import { StorageService } from '@/services/storageService';
import { NotificationService } from '@/services/notificationService';
import { usePurchases } from '@/hooks/use-purchases';

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
  const { isPro } = usePurchases();

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
      if (offerings.current !== null) {
        setOffering(offerings.current);
        const initial = offerings.current.annual || offerings.current.monthly || offerings.current.availablePackages[0];
        setSelectedPackage(initial);
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
      const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
      if (typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined') {
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

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
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
                source={require('@/assets/images/logo.png')} 
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

        {/* Offerings - Stacked but compact */}
        <View style={styles.offeringContainer}>
          {offering?.availablePackages.map((pkg, index) => {
            const isSelected = selectedPackage?.identifier === pkg.identifier;
            const isYearly = pkg.packageType === 'ANNUAL';
            const fullPrice = calculateFullPrice(pkg);

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
                      {isYearly ? "1,500" : "100"}
                    </Text>
                  </View>

                  <View style={styles.packageInfo}>
                    <Text style={[styles.packageTitle, { color: theme.text }]}>
                      {isYearly ? "Annual Plan" : "Monthly Plan"}
                    </Text>
                    {isYearly && (
                      <Text style={[styles.trialLabel, { color: theme.text, opacity: 0.8 }]}>
                        Includes 3-Day Free Trial
                      </Text>
                    )}
                    <Text style={[styles.packageSubtitle, { color: theme.icon }]}>
                      {isYearly ? "Best Value • Cancel anytime" : "Flexible • Cancel anytime"}
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
                <Text style={[styles.purchaseBtnText, { color: theme.background }]}>Start Subscription</Text>
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

          {__DEV__ && (
            <View style={styles.devRow}>
              <Pressable 
                onPress={async () => {
                  const current = await StorageService.getDevProBypass();
                  await StorageService.setDevProBypass(!current);
                  Alert.alert("Dev Mode", `Subscription bypass ${!current ? 'ENABLED' : 'DISABLED'}. Please restart the app.`);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                }}
                style={[styles.devBypassBtn, { borderColor: theme.accent }]}
              >
                <Text style={[styles.devBypassText, { color: theme.accent }]}>
                  {isPro ? 'Dev: Remove Pro' : 'Dev: Activate Pro'}
                </Text>
              </Pressable>

              <Pressable 
                onPress={async () => {
                  await NotificationService.sendTestNotification();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                style={[styles.devBypassBtn, { borderColor: theme.success }]}
              >
                <Text style={[styles.devBypassText, { color: theme.success }]}>Dev: Test Notif</Text>
              </Pressable>
            </View>
          )}
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: 24, paddingVertical: 12 },
  
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, alignSelf: 'flex-end', marginBottom: 8 },
  
  header: { alignItems: 'center', marginBottom: 12 },
  logo: { width: 60, height: 60, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 15, textAlign: 'center', fontWeight: '500' },

  featuresContainer: { gap: 12, marginBottom: 20, paddingHorizontal: 8 },
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
