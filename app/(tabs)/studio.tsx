import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, TextInput, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeIn, useSharedValue, useAnimatedStyle, withSpring, Layout } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import RevenueCatUI from 'react-native-purchases-ui';
import { supabase } from '@/lib/supabase';
import { usePurchases } from '@/hooks/use-purchases';
import { restorePurchases, ENTITLEMENT_ID } from '@/lib/purchases';
import { StorageService, UserProfile } from '@/services/storageService';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ExpandableSettingsRow = ({ icon, title, description, children, theme, isDanger = false }: any) => {
  const [expanded, setExpanded] = useState(false);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
  };
  
  return (
    <Animated.View layout={Layout.springify()} style={[styles.settingsRowContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <AnimatedPressable 
        style={[styles.settingsRow, animatedStyle]}
        onPressIn={() => { scale.value = withSpring(0.98); }}
        onPressOut={() => scale.value = withSpring(1)}
        onPress={handlePress}
      >
        <View style={[styles.iconCircle, { backgroundColor: isDanger ? '#FF3B3015' : theme.border }]}>
          <Ionicons name={icon} size={20} color={isDanger ? '#FF3B30' : theme.text} />
        </View>
        <View style={styles.settingsRowText}>
          <Text style={[styles.settingsRowTitle, { color: isDanger ? '#FF3B30' : theme.text }]}>{title}</Text>
          {description && !expanded && <Text style={[styles.settingsRowDesc, { color: theme.icon }]} numberOfLines={1}>{description}</Text>}
        </View>
        <Ionicons name={expanded ? "chevron-down" : "chevron-forward"} size={18} color={theme.icon} />
      </AnimatedPressable>

      {expanded && (
        <Animated.View entering={FadeInUp.duration(300)} style={styles.expandedContent}>
          {children}
        </Animated.View>
      )}
    </Animated.View>
  );
}

export default function StudioScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const { customerInfo, isPro, isLoading: subLoading, refresh: refreshSub } = usePurchases();

  const [alias, setAlias] = useState('Creative');
  const [interest, setInterest] = useState('Marketing Agency');
  const [restoring, setRestoring] = useState(false);
  const [avatarId, setAvatarId] = useState('person');

  // Load persistence
  useEffect(() => {
    StorageService.loadUserProfile().then(p => {
      if (p) {
        setAlias(p.alias);
        setInterest(p.primaryFocus);
        if (p.avatarId) setAvatarId(p.avatarId);
      }
    });
  }, []);

  const saveProfile = async (newAlias: string, newInterest: string) => {
    await StorageService.saveUserProfile({ alias: newAlias, primaryFocus: newInterest, avatarId });
  };

  const subScale = useSharedValue(1);
  const subAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: subScale.value }] }));

  // --- Get credits from customerInfo (placeholder until auth is wired up)
  const credits = isPro ? '∞' : '150';
  const planLabel = isPro ? 'Socify Pro ✦' : 'Free Plan';

  const handleOpenPaywall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/paywall');
  };

  const handlePresentPaywallIfNeeded = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await RevenueCatUI.presentPaywallIfNeeded({ requiredEntitlementIdentifier: ENTITLEMENT_ID });
    if (result !== 'NOT_PRESENTED') refreshSub();
  };

  const handleRestorePurchases = async () => {
    setRestoring(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const info = await restorePurchases();
    setRestoring(false);
    if (info?.entitlements.active[ENTITLEMENT_ID]) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Restored!', 'Your Socify Pro subscription has been restored.');
      refreshSub();
    } else {
      Alert.alert('No Previous Purchase', 'No active subscription was found for this account.');
    }
  };

  const handleCustomerCenter = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await RevenueCatUI.presentCustomerCenter();
    refreshSub();
  };

  const [previousWork, setPreviousWork] = useState<any[]>([
    { id: '1', title: 'Summer Promo', asset_type: 'Generated Ad' },
    { id: '2', title: 'CEO Intro', asset_type: 'Copywriting' },
    { id: '3', title: 'Q3 Flyer', asset_type: 'Design Asset' },
  ]);

  useEffect(() => {
    async function fetchAssets() {
      const { data, error } = await supabase
        .from('generated_assets')
        .select('id, title, asset_type, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      if (data && data.length > 0) setPreviousWork(data);
    }
    fetchAssets();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Header */}
        <Animated.View entering={FadeInUp.delay(100).duration(800)} style={styles.profileHeader}>
          <Pressable style={[styles.avatarPlaceholder, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 2 }]}>
            <Ionicons name={avatarId as any} size={42} color={theme.accent} />
            <View style={[styles.editAvatarBadge, { backgroundColor: theme.accent }]}>
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          </Pressable>
          <Text style={[styles.name, { color: theme.text }]}>{alias}</Text>
          <View style={[styles.planBadge, { backgroundColor: isPro ? theme.accent + '15' : 'transparent', borderColor: isPro ? theme.accent : theme.border }]}>
            <Text style={[styles.planBadgeText, { color: isPro ? theme.accent : theme.icon }]}>{planLabel}</Text>
          </View>
        </Animated.View>

        {/* Subscription & Credits */}
        <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.creditHeader}>
              <Ionicons name="flash" size={18} color="#FF9F0A" />
              <Text style={[styles.statLabel, { color: theme.icon }]}>Credits</Text>
            </View>
            {subLoading ? (
              <ActivityIndicator color={theme.primary} style={{ marginTop: 6 }} />
            ) : (
              <Text style={[styles.statValue, { color: theme.text }]}>{credits}</Text>
            )}
          </View>
          
          <AnimatedPressable 
            style={[styles.subBox, subAnimatedStyle, { backgroundColor: isPro ? '#FF9F0A' : theme.primary }]}
            onPressIn={() => { subScale.value = withSpring(0.95); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            onPressOut={() => subScale.value = withSpring(1)}
            onPress={isPro ? handleCustomerCenter : handleOpenPaywall}
          >
            <Ionicons name={isPro ? 'star' : 'rocket-outline'} size={20} color={theme.background} style={{ marginBottom: 4 }} />
            <Text style={[styles.subText, { color: theme.background }]}>{isPro ? 'Manage Plan' : 'Go Pro'}</Text>
            <Text style={[styles.subDesc, { color: theme.background + 'dd' }]}>{isPro ? 'Socify Pro active' : 'Yearly & Monthly'}</Text>
          </AnimatedPressable>
        </Animated.View>

        {/* Your Creations Section */}
        <Animated.View entering={FadeIn.delay(300).duration(600)} style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Creations</Text>
            {previousWork.length > 0 && (
              <Pressable onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                <Text style={[styles.seeAllText, { color: theme.accent }]}>View All</Text>
              </Pressable>
            )}
          </View>

          {previousWork.length === 0 ? (
            <View style={[styles.emptyStateContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.accent + '15' }]}>
                <Ionicons name="color-palette-outline" size={32} color={theme.accent} />
              </View>
              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No assets created yet</Text>
              <Text style={[styles.emptyStateDesc, { color: theme.icon }]}>Your generated ads, copy, and designs will appear here.</Text>
              <Pressable 
                style={[styles.ctaButton, { backgroundColor: theme.accent }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/(tabs)/');
                }}
              >
                <Text style={styles.ctaButtonText}>Start Creating</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <FlatList
               data={previousWork}
               keyExtractor={i => i.id}
               horizontal
               showsHorizontalScrollIndicator={false}
               contentContainerStyle={styles.historyList}
               renderItem={({ item }) => (
                 <View style={[styles.historyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                   <View style={[styles.historyImage, { backgroundColor: theme.border }]}>
                     <Ionicons name="image-outline" size={30} color={theme.icon} opacity={0.3} />
                   </View>
                   <Text style={[styles.historyTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                   <View style={styles.historyFooter}>
                     <Text style={[styles.historySubtitle, { color: theme.icon }]} numberOfLines={1}>{item.asset_type}</Text>
                     <Ionicons name="checkmark-circle" size={14} color={theme.accent} />
                   </View>
                 </View>
               )}
            />
          )}
        </Animated.View>

        {/* Scalable Expandable Settings List */}
        <Animated.View layout={Layout.springify()} entering={FadeIn.delay(400).duration(600)} style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Application Core</Text>
          
          <View style={styles.settingsBlock}>
              <ExpandableSettingsRow icon="person-outline" title="Creator Profile" description="Edit your Alias and preferences" theme={theme}>
                <View style={styles.editorContent}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.icon }]}>Alias</Text>
                    <TextInput 
                      style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
                      value={alias} 
                      onChangeText={(v) => { setAlias(v); saveProfile(v, interest); }} 
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.icon }]}>Focus / Industry</Text>
                    <TextInput 
                      style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
                      value={interest} 
                      onChangeText={(v) => { setInterest(v); saveProfile(alias, v); }} 
                    />
                  </View>
                </View>
              </ExpandableSettingsRow>

             <ExpandableSettingsRow icon="server-outline" title="Database Configuration" description="Environment connectivity & sync" theme={theme}>
               <Text style={[styles.mockEnvText, { color: theme.icon }]}>Syncing with SECURE_DB_URL via Expo dotenv. Subscriptions routed to RevenueCat identifiers.</Text>
             </ExpandableSettingsRow>

             <ExpandableSettingsRow icon="shield-checkmark-outline" title="Manage Permissions" description="Camera, Photos, Push Notifications" theme={theme}>
               <Text style={[styles.mockEnvText, { color: theme.text }]}>• Notifications: Enabled</Text>
               <Text style={[styles.mockEnvText, { color: theme.text }]}>• Photo Library: Off</Text>
             </ExpandableSettingsRow>
             
             <ExpandableSettingsRow icon="cart-outline" title="Restore Purchases" description="Sync your App Store subscriptions" theme={theme}>
                <Pressable
                  style={[styles.miniButton, { backgroundColor: theme.primary, opacity: restoring ? 0.6 : 1 }]}
                  onPress={handleRestorePurchases}
                  disabled={restoring}
                >
                  {restoring ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.miniBtnText}>Restore via RevenueCat SDK</Text>
                  )}
                </Pressable>
             </ExpandableSettingsRow>

             {isPro && (
               <ExpandableSettingsRow icon="people-circle-outline" title="Manage Subscription" description="Cancel, change plan, or get support" theme={theme}>
                 <Pressable
                   style={[styles.miniButton, { backgroundColor: '#FF9F0A' }]}
                   onPress={handleCustomerCenter}
                 >
                   <Text style={styles.miniBtnText}>Open Customer Center</Text>
                 </Pressable>
               </ExpandableSettingsRow>
             )}

             <ExpandableSettingsRow icon="trash-outline" title="Delete Account" description="Erase all generation data" isDanger theme={theme}>
               <Text style={[styles.mockEnvText, { color: '#FF3B30' }]}>This action is irreversible and drops your configuration from the DB securely.</Text>
             </ExpandableSettingsRow>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingVertical: 24, paddingBottom: 100 },
  profileHeader: { alignItems: 'center', marginTop: 20, marginBottom: 32 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  editAvatarBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  name: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  planBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  planBadgeText: { fontSize: 13, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 40, paddingHorizontal: 24 },
  statBox: { flex: 1, padding: 20, borderRadius: 24, alignItems: 'flex-start', borderWidth: 1 },
  creditHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statValue: { fontSize: 32, fontWeight: '800' },
  statLabel: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase' },
  subBox: { flex: 1.2, padding: 20, borderRadius: 24, justifyContent: 'center' },
  subText: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  subDesc: { fontSize: 13, fontWeight: '500' },

  historySection: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  seeAllText: { fontSize: 14, fontWeight: '600' },
  emptyStateContainer: { marginHorizontal: 24, padding: 32, borderRadius: 24, borderWidth: 1, alignItems: 'center', gap: 12 },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyStateTitle: { fontSize: 18, fontWeight: '700' },
  emptyStateDesc: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  ctaButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24, marginTop: 8 },
  ctaButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  historyList: { paddingHorizontal: 24, gap: 14 },
  historyCard: { width: 160, padding: 12, borderRadius: 20, borderWidth: 1 },
  historyImage: { width: '100%', height: 110, borderRadius: 12, marginBottom: 12, justifyContent: 'center', alignItems: 'center' },
  historyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  historyFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historySubtitle: { fontSize: 12, fontWeight: '500', flex: 1 },

  settingsSection: { marginBottom: 20 },
  settingsBlock: { gap: 12, paddingHorizontal: 24 },
  settingsRowContainer: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  settingsRowText: { flex: 1 },
  settingsRowTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  settingsRowDesc: { fontSize: 13, fontWeight: '500' },
  expandedContent: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.1)' },
  
  editorContent: { marginTop: 12 },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginLeft: 4, textTransform: 'uppercase' },
  input: { padding: 14, borderRadius: 16, borderWidth: 1, fontSize: 15, fontWeight: '500' },
  mockEnvText: { fontSize: 14, lineHeight: 22, marginTop: 8 },
  miniButton: { padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  miniBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
