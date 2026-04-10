import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Image, ActivityIndicator, Alert, Dimensions, Platform } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp, ZoomIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Purchases, { PurchasesPackage, PurchasesOffering } from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ENTITLEMENT_ID } from '@/lib/purchases';

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

  // Animation assets
  const pulse = useSharedValue(1);

  useEffect(() => {
    fetchOfferings();
    
    // Pulse animation for the primary CTA
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
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
      transform: [{ scale: pulse.value }],
    };
  });

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
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
            <Image 
              source={require('@/assets/images/logo.png')} 
              style={styles.logo} 
              resizeMode="contain" 
            />
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
              <Ionicons name="checkmark-circle" size={18} color={theme.accent} />
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
                      borderColor: isSelected ? theme.accent : theme.border,
                      borderWidth: isSelected ? 2 : 1
                    }
                  ]}
                >
                  <View style={styles.packageInfo}>
                    <Text style={[styles.packageTitle, { color: theme.text }]}>
                      {isYearly ? "Annual Plan" : "Monthly Plan"}
                    </Text>
                    {isYearly && (
                      <Text style={[styles.trialLabel, { color: theme.accent }]}>
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
                    <View style={[styles.checkIndicator, { backgroundColor: theme.accent }]}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
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
            <Pressable 
              onPress={handlePurchase}
              disabled={!selectedPackage || isPurchasing}
              style={[
                styles.purchaseBtn,
                { backgroundColor: theme.accent, opacity: isPurchasing ? 0.7 : 1 }
              ]}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.purchaseBtnText}>Start Subscription</Text>
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

  actionSection: { marginTop: 'auto', gap: 16 },
  purchaseBtn: { width: '100%', height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  purchaseBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  footerLink: { fontSize: 12, fontWeight: '500' },
});
