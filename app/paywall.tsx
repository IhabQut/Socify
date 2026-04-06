import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, ZoomIn, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FloatingParticle } from '@/components/FloatingParticle';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const FEATURE_LIST = [
  { icon: 'infinite', title: 'Unlimited Generations' },
  { icon: 'speedometer', title: 'Super-Fast GPU Processing' },
  { icon: 'water', title: 'Zero Watermarks' },
  { icon: 'cloud-download', title: 'High-Res Native Exporting' },
];

export default function PaywallScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const router = useRouter();
  
  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'weekly'>('yearly');
  
  const handleSubscribe = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Future RevenueCat hooking goes here!
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: '#0B0D17' }]}>
      <Animated.View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <FloatingParticle color="#5E5CE6" size={800} delay={0} duration={12000} />
        <FloatingParticle color="#FF375F" size={600} delay={1000} duration={14000} />
      </Animated.View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={20} style={styles.closeBtn}>
             <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          <Text style={styles.restoreText}>Restore</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={ZoomIn.duration(800).springify()} style={styles.heroBox}>
             <Ionicons name="sparkles" size={64} color="#FF375F" />
          </Animated.View>

          <Animated.Text entering={FadeInUp.delay(200)} style={styles.title}>Socify <Text style={{ color: '#FF375F' }}>Pro</Text></Animated.Text>
          <Animated.Text entering={FadeInUp.delay(300)} style={styles.subtitle}>Unlock the full suite of AI marketing tools.</Animated.Text>

          <View style={styles.featuresList}>
            {FEATURE_LIST.map((feature, i) => (
              <Animated.View key={i} entering={FadeInUp.delay(400 + (i * 100))} style={styles.featureRow}>
                 <Ionicons name={feature.icon as any} size={24} color="#5E5CE6" />
                 <Text style={styles.featureText}>{feature.title}</Text>
              </Animated.View>
            ))}
          </View>

          <View style={styles.plansContainer}>
             <Pressable 
                onPress={() => { setSelectedPlan('yearly'); Haptics.selectionAsync(); }}
                style={[styles.planCard, selectedPlan === 'yearly' && styles.planCardActive]}
             >
                {selectedPlan === 'yearly' && <View style={styles.popularBadge}><Text style={styles.popularBadgeText}>BEST VALUE</Text></View>}
                <Text style={styles.planTitle}>Yearly</Text>
                <Text style={styles.planPrice}>$39.99<Text style={styles.planSub}>/yr</Text></Text>
                <Text style={styles.planBreakdown}>Only $3.33 / month</Text>
             </Pressable>

             <Pressable 
                onPress={() => { setSelectedPlan('weekly'); Haptics.selectionAsync(); }}
                style={[styles.planCard, selectedPlan === 'weekly' && styles.planCardActive]}
             >
                <Text style={styles.planTitle}>Weekly</Text>
                <Text style={styles.planPrice}>$4.99<Text style={styles.planSub}>/wk</Text></Text>
                <Text style={styles.planBreakdown}>Cancel anytime</Text>
             </Pressable>
          </View>

        </ScrollView>

        <View style={styles.footer}>
           <AnimatedPressable 
              onPress={handleSubscribe}
              style={[styles.subscribeBtn, { backgroundColor: '#fff' }]}
           >
              <Text style={styles.subscribeBtnText}>Unlock Pro</Text>
           </AnimatedPressable>
           <Text style={styles.termsText}>Recurring billing. Cancel anytime. Terms & Privacy.</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 12, alignItems: 'center' },
  closeBtn: { padding: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  restoreText: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '600' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 100, alignItems: 'center' },
  heroBox: { marginTop: 40, marginBottom: 24, width: 120, height: 120, borderRadius: 40, backgroundColor: 'rgba(255,55,95,0.1)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 40, fontWeight: '800', letterSpacing: -1, marginBottom: 12 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 17, fontWeight: '500', textAlign: 'center', marginBottom: 40 },
  featuresList: { width: '100%', gap: 16, marginBottom: 40 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  featureText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  plansContainer: { flexDirection: 'row', width: '100%', gap: 16 },
  planCard: { flex: 1, padding: 20, borderRadius: 24, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', position: 'relative' },
  planCardActive: { borderColor: '#5E5CE6', backgroundColor: 'rgba(94,92,230,0.15)' },
  popularBadge: { position: 'absolute', top: -12, alignSelf: 'center', backgroundColor: '#FF375F', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  popularBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  planTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600', marginBottom: 8 },
  planPrice: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  planSub: { fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.6)' },
  planBreakdown: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500' },
  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 24, backgroundColor: '#0B0D17', alignItems: 'center' },
  subscribeBtn: { width: '100%', height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  subscribeBtnText: { color: '#000', fontSize: 17, fontWeight: '700' },
  termsText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '500' },
});
