import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, TextInput, FlatList, ActivityIndicator, Alert, Image, Modal, Share, Linking, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeIn, useSharedValue, useAnimatedStyle, withSpring, Layout, FadeOut, Extrapolation, FadeInDown, FadeOutDown, useAnimatedScrollHandler } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import RevenueCatUI from 'react-native-purchases-ui';
import { StorageService } from '@/services/storageService';
import { useAuth, Profile } from '@/hooks/use-auth';
import { usePurchases } from '@/hooks/use-purchases';
import { restorePurchases, ENTITLEMENT_ID } from '@/lib/purchases';
import { supabase } from '@/lib/supabase';
import { AssetCacheService, CachedAsset } from '@/services/assetCacheService';

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
        <View style={[styles.iconCircle, { backgroundColor: isDanger ? theme.danger + '15' : theme.border }]}>
          <Ionicons name={icon} size={20} color={isDanger ? theme.danger : theme.text} />
        </View>
        <View style={styles.settingsRowText}>
          <Text style={[styles.settingsRowTitle, { color: isDanger ? theme.danger : theme.text }]}>{title}</Text>
          {description && !expanded && <Text style={[styles.settingsRowDesc, { color: theme.icon }]} numberOfLines={1}>{description}</Text>}
        </View>
        <Ionicons name={expanded ? "chevron-down" : "chevron-forward"} size={18} color={theme.icon} />
      </AnimatedPressable>

      {expanded && (
        <Animated.View entering={FadeInUp.duration(300)} style={[styles.expandedContent, { borderTopColor: theme.border }]}>
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
  const { profile, brands, defaultBrand, loading: authLoading, isGuest, signOut, updateProfile, updateDefaultBrand, updateBrandPlatforms } = useAuth();
 
  const [isEditing, setIsEditing] = useState(false);
  const [alias, setAlias] = useState('Creative');
  const [interest, setInterest] = useState('');
  const [goal, setGoal] = useState('');
  const [tone, setTone] = useState('');
  const [discovery, setDiscovery] = useState('');
  const [shopName, setShopName] = useState('');
  const [industry, setIndustry] = useState('');
  const [brandIdentity, setBrandIdentity] = useState('');
  const [frequency, setFrequency] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [avatarId, setAvatarId] = useState('person');
  const [showSettings, setShowSettings] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync with Supabase Profile & Brand
  useEffect(() => {
    if (profile) {
      setAlias(profile.full_name || '');
      setDiscovery(profile.discovery_source || '');
      if (profile.avatar_url) setAvatarId(profile.avatar_url);
    }
    if (defaultBrand) {
      setShopName(defaultBrand.shop_name || '');
      setIndustry(defaultBrand.industry || '');
      setBrandIdentity(defaultBrand.brand_identity || '');
      setGoal(defaultBrand.primary_goal || '');
      setTone(defaultBrand.preferred_tone || '');
      setFrequency(defaultBrand.marketing_frequency || '');
    }
  }, [profile, defaultBrand, isEditing]); // Re-sync when entering/exiting edit mode for 'Cancel' effect

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // 1. Update Core User (users table)
      await updateProfile({
        full_name: alias,
        discovery_source: discovery,
      });

      // 2. Update Default Brand (brands table)
      await updateDefaultBrand({
        shop_name: shopName,
        industry: industry,
        brand_identity: brandIdentity,
        primary_goal: goal,
        preferred_tone: tone,
        marketing_frequency: frequency
      });

      // 3. Update Platforms (brand_platforms table)
      if (selectedPlatforms.length > 0) {
        await updateBrandPlatforms(selectedPlatforms);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditing(false);
    } catch (e) {
      Alert.alert("Error", "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  const subScale = useSharedValue(1);
  const subAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: subScale.value }] }));

  // --- Get credits from profile
  const creditsDisplay = profile?.credits ?? '0';
  const planLabel = isPro ? 'Socify Pro ✦' : 'Free Plan';

  const handleOpenPaywall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/paywall');
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

  const [previousWork, setPreviousWork] = useState<any[]>([]);

  const fetchAssets = async () => {
    const cached = await AssetCacheService.getCachedAssets();
    if (cached.length > 0) {
      setPreviousWork(cached);
    }

    const { data, error } = await supabase
      .from('generated_assets')
      .select('id, title, asset_type, created_at')
      .order('created_at', { ascending: false })
      .limit(30);
    
    if (data) {
      setPreviousWork(data);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleShare = async (item: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        message: `Check out my ${item.asset_type} "${item.title}" I created with Socify!`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from('generated_assets').delete().eq('id', id);
    if (!error) {
      setPreviousWork(prev => prev.filter(item => item.id !== id));
    }
    setDeletingId(null);
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "This will permanently erase all your creations, profile data, and credits. This action cannot be undone.\n\nNote: Active subscriptions must be cancelled separately in the App Store.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Everything", 
          style: "destructive", 
          onPress: async () => {
            if (!profile) return;
            setDeletingId('account');
            
            await supabase.from('generated_assets').delete().eq('user_id', profile.id);
            const { error } = await supabase.from('users').delete().eq('id', profile.id);
            
            if (!error) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              signOut();
              router.replace('/');
            } else {
              Alert.alert("Error", "Could not delete account. Please try again.");
            }
            setDeletingId(null);
          }
        }
      ]
    );
  };

  const handleResetPro = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_pro: false, credits: 0 })
        .eq('id', profile.id);
      
      if (error) throw error;
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Reset Success", "Your account has been reset to Free plan with 0 credits.");
      await refreshSub();
      await fetchAssets();
    } catch (e) {
      Alert.alert("Error", "Could not reset profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleRateApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL('https://apps.apple.com/app/socify');
  };

  const handleShareApp = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        message: "Check out Socify - the ultimate AI creative studio for creators! https://socify.ai",
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.fixedHeader, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Studio</Text>
          <Text style={[styles.headerSubtitle, { color: theme.icon }]}>Your Creative Engine</Text>
        </View>
        
        <View style={styles.headerActions}>
          <Pressable 
            onPress={() => router.push('/paywall')}
            style={[styles.creditsPill, { backgroundColor: theme.card, borderColor: isPro ? theme.accent : (isGuest ? theme.warning : theme.border) }]}
          >
            <Ionicons name={isPro ? "star" : "flash"} size={14} color={isPro ? theme.accent : theme.warning} />
            <Text style={[styles.creditsText, { color: theme.text }]}>{creditsDisplay}</Text>
          </Pressable>
          <Pressable 
            style={[styles.settingsButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => { setShowSettings(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Ionicons name="settings-outline" size={20} color={theme.text} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={previousWork}
        keyExtractor={i => i.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.gridContainer, { paddingBottom: 100 }]}
        columnWrapperStyle={styles.gridRow}
        ListHeaderComponent={
          <Animated.View entering={FadeIn.duration(600)} style={styles.gridHeader}>
            <View style={styles.sectionHeader}>
               <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Work</Text>
               <Text style={[styles.assetCount, { color: theme.icon }]}>{previousWork.length} Assets</Text>
            </View>

            <View style={styles.subContainer}>
              <AnimatedPressable 
                style={[styles.subBox, subAnimatedStyle, { backgroundColor: isPro ? theme.warning : theme.accent }]}
                onPressIn={() => { subScale.value = withSpring(0.95); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                onPressOut={() => subScale.value = withSpring(1)}
                onPress={isPro ? handleCustomerCenter : handleOpenPaywall}
              >
                <View style={styles.subIconRow}>
                   <Ionicons name={isPro ? 'star' : 'rocket-outline'} size={24} color={theme.background} />
                </View>
                <View style={styles.subTextContent}>
                  <Text style={[styles.subText, { color: theme.background }]}>{isPro ? 'Socify Pro Active' : 'Upgrade to Pro'}</Text>
                  <Text style={[styles.subDesc, { color: theme.background + 'cc' }]}>
                    {isPro ? 'Unlimited Credits • Premium Tools' : 'Get unlimited credits and features'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.background} opacity={0.6} />
              </AnimatedPressable>
            </View>

            {previousWork.length === 0 && (
              <View style={[styles.emptyStateContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.emptyIconCircle, { backgroundColor: theme.accent + '15' }]}>
                  <Ionicons name="color-palette-outline" size={32} color={theme.accent} />
                </View>
                <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No assets created yet</Text>
                <Text style={[styles.emptyStateDesc, { color: theme.icon }]}>Your generated ads, copy, and designs will appear here.</Text>
                <Pressable 
                  style={[styles.ctaButton, { backgroundColor: theme.accent }]}
                  onPress={() => router.push('/(tabs)/')}
                >
                  <Text style={[styles.ctaButtonText, { color: theme.background }]}>Start Creating</Text>
                  <Ionicons name="arrow-forward" size={18} color={theme.background} />
                </Pressable>
              </View>
            )}
          </Animated.View>
        }
        renderItem={({ item }) => (
          <Animated.View entering={FadeIn} layout={Layout.springify()} style={[styles.historyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.historyImage, { backgroundColor: theme.border }]}>
              <Ionicons name={item.asset_type.toLowerCase().includes('copy') ? "document-text-outline" : "image-outline"} size={36} color={theme.icon} opacity={0.3} />
              
              <View style={styles.cardActions}>
                 <Pressable style={[styles.actionBtn, { backgroundColor: theme.background + 'cc' }]} onPress={() => handleShare(item)}>
                    <Ionicons name="share-outline" size={14} color={theme.text} />
                 </Pressable>
                 <Pressable 
                   style={[styles.actionBtn, { backgroundColor: theme.background + 'cc' }]} 
                   onPress={() => handleDelete(item.id)}
                   disabled={deletingId === item.id}
                 >
                    {deletingId === item.id ? (
                      <ActivityIndicator size="small" color={theme.danger} />
                    ) : (
                      <Ionicons name="trash-outline" size={14} color={theme.danger} />
                    )}
                 </Pressable>
              </View>
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.historyTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
              <View style={styles.historyFooter}>
                <Text style={[styles.historySubtitle, { color: theme.icon }]} numberOfLines={1}>{item.asset_type}</Text>
                <Ionicons name="checkmark-circle" size={14} color={theme.accent} />
              </View>
            </View>
          </Animated.View>
        )}
      />

      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSettings(false)}
      >
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
               <View style={{ width: 40 }} /> 
               <Text style={[styles.modalTitle, { color: theme.text }]}>
                 {isEditing ? 'Edit Profile' : 'Settings'}
               </Text>
               <Pressable 
                 style={[styles.closeButton, { backgroundColor: theme.card }]} 
                 onPress={() => { Keyboard.dismiss(); setShowSettings(false); setIsEditing(false); }}
               >
                 <Ionicons name="close" size={22} color={theme.text} />
               </Pressable>
            </View>

          <ScrollView contentContainerStyle={[styles.modalScroll, isEditing && { paddingBottom: 120 }]}>
            <View style={styles.profileHeader}>
              <Pressable style={[styles.avatarPlaceholder, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 2 }]}>
                <Ionicons name={avatarId as any} size={42} color={theme.accent} />
                <View style={[styles.editAvatarBadge, { backgroundColor: theme.accent, borderColor: theme.background }]}>
                  <Ionicons name="camera" size={12} color={theme.background} />
                </View>
              </Pressable>
              <Text style={[styles.name, { color: theme.text }]}>{alias}</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={[styles.planBadge, { backgroundColor: isPro ? theme.accent + '15' : (isGuest ? theme.warning + '15' : 'transparent'), borderColor: isPro ? theme.accent : (isGuest ? theme.warning : theme.border) }]}>
                  <Text style={[styles.planBadgeText, { color: isPro ? theme.accent : (isGuest ? theme.warning : theme.icon) }]}>
                    {isGuest ? 'Guest Mode ✦' : planLabel}
                  </Text>
                </View>
              </View>

              {!isEditing && (
                <Animated.View entering={FadeIn.delay(200)}>
                  <Pressable 
                    style={[styles.editProfileTrigger, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsEditing(true); }}
                  >
                    <Ionicons name="create-outline" size={16} color={theme.text} />
                    <Text style={[styles.editProfileTriggerText, { color: theme.text }]}>Edit Profile</Text>
                  </Pressable>
                </Animated.View>
              )}
            </View>

            <View style={styles.settingsBlock}>
              <ExpandableSettingsRow icon="person-outline" title="Creator Profile" description="Your name and discovery source" theme={theme}>
                <View style={styles.editorContent}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.icon }]}>Alias / Full Name</Text>
                    <TextInput 
                      style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, opacity: isEditing ? 1 : 0.6 }]} 
                      value={alias} 
                      onChangeText={setAlias}
                      editable={isEditing}
                      placeholder="e.g. Creative Director"
                      placeholderTextColor={theme.icon}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.icon }]}>How did you find us?</Text>
                    <TextInput 
                      style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, opacity: isEditing ? 1 : 0.6 }]} 
                      value={discovery} 
                      onChangeText={setDiscovery}
                      editable={isEditing}
                      placeholder="e.g. Instagram, Referral"
                      placeholderTextColor={theme.icon}
                    />
                  </View>
                </View>
              </ExpandableSettingsRow>

              <ExpandableSettingsRow icon="business-outline" title="Brand Identity" description="Your business and focus" theme={theme}>
                <View style={styles.editorContent}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.icon }]}>Business / Shop Name</Text>
                    <TextInput 
                      style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, opacity: isEditing ? 1 : 0.6 }]} 
                      value={shopName} 
                      onChangeText={setShopName}
                      editable={isEditing}
                      placeholder="My Creative Studio"
                      placeholderTextColor={theme.icon}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.icon }]}>Industry (Sector)</Text>
                    <TextInput 
                      style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, opacity: isEditing ? 1 : 0.6 }]} 
                      value={industry} 
                      onChangeText={setIndustry}
                      editable={isEditing}
                      placeholder="e.g. Tech, Fashion, Design"
                      placeholderTextColor={theme.icon}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.icon }]}>Brand Concept</Text>
                    <TextInput 
                      style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, opacity: isEditing ? 1 : 0.6 }]} 
                      value={brandIdentity} 
                      onChangeText={setBrandIdentity}
                      editable={isEditing}
                      placeholder="Describe your brand mood..."
                      placeholderTextColor={theme.icon}
                      multiline={isEditing}
                    />
                  </View>
                </View>
              </ExpandableSettingsRow>

              <ExpandableSettingsRow icon="rocket-outline" title="Marketing Strategy" description="Goals and frequency" theme={theme}>
                <View style={styles.editorContent}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.icon }]}>Primary Goal</Text>
                    <TextInput 
                      style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, opacity: isEditing ? 1 : 0.6 }]} 
                      value={goal} 
                      onChangeText={setGoal}
                      editable={isEditing}
                      placeholder="e.g. Sales, Grow Community"
                      placeholderTextColor={theme.icon}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.icon }]}>Tone of Voice</Text>
                    <TextInput 
                      style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, opacity: isEditing ? 1 : 0.6 }]} 
                      value={tone} 
                      onChangeText={setTone}
                      editable={isEditing}
                      placeholder="e.g. Casual, Bold, Minimalist"
                      placeholderTextColor={theme.icon}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.icon }]}>Publishing Frequency</Text>
                    <TextInput 
                      style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, opacity: isEditing ? 1 : 0.6 }]} 
                      value={frequency} 
                      onChangeText={setFrequency}
                      editable={isEditing}
                      placeholder="e.g. Daily, 3 times/week"
                      placeholderTextColor={theme.icon}
                    />
                  </View>
                </View>
              </ExpandableSettingsRow>

              <ExpandableSettingsRow icon="link-outline" title="Permanent Account" description="Save progress with Apple or Google" theme={theme}>
                <Text style={[styles.mockEnvText, { color: theme.text, marginBottom: 16 }]}>Link your guest session to a permanent account to sync your work across all devices.</Text>
                <View style={styles.socialBtnRow}>
                  <Pressable style={[styles.socialBtn, { backgroundColor: theme.text }]} onPress={() => Alert.alert("Coming Soon", "Apple Sign-in integration.")}>
                    <Ionicons name="logo-apple" size={20} color={theme.background} />
                    <Text style={[styles.socialBtnText, { color: theme.background }]}>Link Apple</Text>
                  </Pressable>
                  <Pressable style={[styles.socialBtn, { backgroundColor: '#4285F4' }]} onPress={() => Alert.alert("Coming Soon", "Google Sign-in integration.")}>
                    <Ionicons name="logo-google" size={20} color="#fff" />
                    <Text style={[styles.socialBtnText, { color: '#fff' }]}>Link Google</Text>
                  </Pressable>
                </View>
              </ExpandableSettingsRow>

              <ExpandableSettingsRow icon="server-outline" title="Database Configuration" description="Environment connectivity & sync" theme={theme}>
                <Text style={[styles.mockEnvText, { color: theme.icon }]}>Syncing with Supabase Production. Subscriptions routed via RevenueCat.</Text>
              </ExpandableSettingsRow>

              <ExpandableSettingsRow icon="shield-checkmark-outline" title="Manage Permissions" description="Camera, Photos, Push Notifications" theme={theme}>
                <Text style={[styles.mockEnvText, { color: theme.text, marginBottom: 16 }]}>Grant or revoke access to camera, image library, and notifications in your device settings.</Text>
                <Pressable
                  style={[styles.miniButton, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Linking.openSettings();
                  }}
                >
                  <Text style={[styles.miniBtnText, { color: theme.text }]}>Open System Settings</Text>
                </Pressable>
              </ExpandableSettingsRow>
              
              <ExpandableSettingsRow icon="cart-outline" title="Restore Purchases" description="Sync your App Store subscriptions" theme={theme}>
                 <Pressable
                   style={[styles.miniButton, { backgroundColor: theme.primary, opacity: restoring ? 0.6 : 1 }]}
                   onPress={handleRestorePurchases}
                   disabled={restoring}
                 >
                   {restoring ? (
                   <ActivityIndicator color={theme.background} size="small" />
                   ) : (
                     <Text style={[styles.miniBtnText, { color: theme.background }]}>Restore via RevenueCat SDK</Text>
                   )}
                 </Pressable>
              </ExpandableSettingsRow>

              {isPro && (
                <ExpandableSettingsRow icon="people-circle-outline" title="Manage Subscription" description="Cancel, change plan, or get support" theme={theme}>
                  <Pressable
                    style={[styles.miniButton, { backgroundColor: theme.warning }]}
                    onPress={handleCustomerCenter}
                  >
                     <Text style={[styles.miniBtnText, { color: theme.background }]}>Open Customer Center</Text>
                  </Pressable>
                </ExpandableSettingsRow>
              )}

              <ExpandableSettingsRow icon="log-out-outline" title="Sign Out" description="Exit current session" isDanger theme={theme}>
                <Text style={[styles.mockEnvText, { color: theme.danger, marginBottom: 12 }]}>Signing out will clear your local session.</Text>
                <Pressable
                  style={[styles.miniButton, { backgroundColor: theme.danger }]}
                  onPress={() => {
                    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Sign Out", style: "destructive", onPress: () => {
                        signOut();
                        router.replace('/');
                      }}
                    ]);
                  }}
                >
                  <Text style={[styles.miniBtnText, { color: theme.white }]}>Confirm Sign Out</Text>
                </Pressable>
              </ExpandableSettingsRow>

              <View style={styles.settingsDivider} />
              <Text style={[styles.sectionHeaderLabel, { color: theme.icon }]}>Data & Legal</Text>

              <ExpandableSettingsRow icon="shield-off-outline" title="Account & Privacy" description="Delete your information" isDanger theme={theme}>
                <Text style={[styles.mockEnvText, { color: theme.danger, marginBottom: 12 }]}>Warning: Deleting your account is permanent. All your creative work and profile details will be destroyed.</Text>
                <Pressable
                  style={[styles.miniButton, { backgroundColor: theme.danger, opacity: deletingId === 'account' ? 0.7 : 1 }]}
                  onPress={handleDeleteAccount}
                  disabled={deletingId === 'account'}
                >
                  {deletingId === 'account' ? (
                    <ActivityIndicator color={theme.white} size="small" />
                  ) : (
                    <Text style={[styles.miniBtnText, { color: theme.white }]}>Permanent Account Deletion</Text>
                  )}
                </Pressable>
              </ExpandableSettingsRow>

              {__DEV__ && (
                <>
                  <View style={styles.settingsDivider} />
                  <Text style={[styles.sectionHeaderLabel, { color: theme.accent }]}>Developer Tools (Internal)</Text>
                  
                  <ExpandableSettingsRow icon="bug-outline" title="Debug Account State" description="Force reset subscription & credits" theme={theme}>
                    <Text style={[styles.mockEnvText, { color: theme.text, marginBottom: 12 }]}>
                      Use this to test the Free/Pro transitions. This bypasses RevenueCat local cache and updates the database directly.
                    </Text>
                    <Pressable
                      style={[styles.miniButton, { backgroundColor: theme.danger }]}
                      onPress={() => {
                        Alert.alert("Force Reset", "This will set is_pro to false and credits to 0 in Supabase. Continue?", [
                          { text: "Cancel", style: "cancel" },
                          { text: "Force Reset", style: "destructive", onPress: handleResetPro }
                        ]);
                      }}
                    >
                      <Text style={[styles.miniBtnText, { color: theme.white }]}>Force Reset to Free Plan</Text>
                    </Pressable>
                  </ExpandableSettingsRow>
                </>
              )}

              <View style={styles.settingsDivider} />
              <Text style={[styles.sectionHeaderLabel, { color: theme.icon }]}>Help & Growth</Text>

              <Pressable style={[styles.simpleRow, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={handleRateApp}>
                <Ionicons name="star-outline" size={20} color={theme.accent} />
                <Text style={[styles.simpleRowText, { color: theme.text }]}>Star us on App Store</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.icon} />
              </Pressable>

              <Pressable style={[styles.simpleRow, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={handleShareApp}>
                <Ionicons name="share-social-outline" size={20} color={theme.text} />
                <Text style={[styles.simpleRowText, { color: theme.text }]}>Share with Friends</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.icon} />
              </Pressable>

              <View style={styles.settingsDivider} />
              
              <Pressable style={styles.legalRow} onPress={() => Linking.openURL('https://socify.ai/privacy')}>
                 <Text style={[styles.legalText, { color: theme.icon }]}>Privacy Policy</Text>
              </Pressable>
              <Pressable style={styles.legalRow} onPress={() => Linking.openURL('https://socify.ai/terms')}>
                 <Text style={[styles.legalText, { color: theme.icon }]}>Terms of Use</Text>
              </Pressable>
              <Pressable style={styles.legalRow} onPress={() => Linking.openURL('https://socify.ai/agreement')}>
                 <Text style={[styles.legalText, { color: theme.icon }]}>Payment Agreement</Text>
              </Pressable>
           </View>
          </ScrollView>

            {isEditing && (
              <Animated.View 
                entering={FadeInDown.duration(400)} 
                exiting={FadeOutDown.duration(300)}
                style={styles.stickyFooterContainer}
              >
                <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={styles.blurWrapper}>
                  <View style={[styles.footerContent, { borderTopColor: theme.border }]}>
                    <Pressable 
                      style={[styles.cancelFooterBtn, { borderColor: theme.border }]} 
                      onPress={() => { Keyboard.dismiss(); setIsEditing(false); }}
                    >
                      <Text style={[styles.cancelFooterBtnText, { color: theme.icon }]}>Cancel</Text>
                    </Pressable>
                    <Pressable 
                      style={[styles.saveFooterBtn, { backgroundColor: theme.primary }]} 
                      onPress={handleSaveSettings}
                      disabled={saving}
                    >
                      {saving ? (
                         <ActivityIndicator size="small" color={theme.background} />
                      ) : (
                        <Text style={[styles.saveFooterBtnText, { color: theme.background }]}>Save Changes</Text>
                      )}
                    </Pressable>
                  </View>
                </BlurView>
              </Animated.View>
            )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fixedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  headerSubtitle: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  creditsPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, gap: 6 },
  creditsText: { fontSize: 14, fontWeight: '700' },
  settingsButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  
  gridContainer: { paddingVertical: 24 },
  gridRow: { paddingHorizontal: 20, justifyContent: 'space-between', gap: 16 },
  gridHeader: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 24, marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  assetCount: { fontSize: 14, fontWeight: '600' },

  subContainer: { paddingHorizontal: 20, marginBottom: 32 },
  subBox: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, gap: 16 },
  subIconRow: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.1)', alignItems: 'center', justifyContent: 'center' },
  subTextContent: { flex: 1 },
  subText: { fontSize: 17, fontWeight: '800', marginBottom: 2 },
  subDesc: { fontSize: 13, fontWeight: '500' },

  emptyStateContainer: { marginHorizontal: 24, padding: 32, borderRadius: 24, borderWidth: 1, alignItems: 'center', gap: 12 },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyStateTitle: { fontSize: 18, fontWeight: '700' },
  emptyStateDesc: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  ctaButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24, marginTop: 8 },
  ctaButtonText: { fontSize: 15, fontWeight: '700' },

  historyCard: { flex: 0.48, borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  historyImage: { width: '100%', height: 120, justifyContent: 'center', alignItems: 'center' },
  cardActions: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 6 },
  actionBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cardContent: { padding: 12 },
  historyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  historyFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historySubtitle: { fontSize: 12, fontWeight: '500', flex: 1 },

  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  closeButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  modalScroll: { paddingBottom: 40 },
  profileHeader: { alignItems: 'center', marginTop: 24, marginBottom: 32 },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  editAvatarBadge: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  name: { fontSize: 24, fontWeight: '800', marginBottom: 6 },
  planBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  planBadgeText: { fontSize: 12, fontWeight: '700' },

  settingsBlock: { gap: 12, paddingHorizontal: 24 },
  settingsRowContainer: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  settingsRowText: { flex: 1 },
  settingsRowTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  settingsRowDesc: { fontSize: 13, fontWeight: '500' },
  expandedContent: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 4, borderTopWidth: 1 },
  
  editorContent: { marginTop: 12 },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 11, fontWeight: '600', marginBottom: 6, marginLeft: 4, textTransform: 'uppercase' },
  input: { padding: 14, borderRadius: 14, borderWidth: 1, fontSize: 15, fontWeight: '500' },
  mockEnvText: { fontSize: 14, lineHeight: 22, marginTop: 8 },
  miniButton: { padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  miniBtnText: { fontWeight: '700', fontSize: 14 },
  socialBtnRow: { flexDirection: 'row', gap: 12 },
  socialBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  socialBtnText: { fontWeight: '700', fontSize: 13 },
  
  settingsDivider: { height: 1, marginVertical: 8, opacity: 0.5 },
  sectionHeaderLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase' },
  simpleRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 8, gap: 12 },
  simpleRowText: { flex: 1, fontSize: 15, fontWeight: '600' },
  legalRow: { paddingVertical: 10, paddingHorizontal: 16 },
  legalText: { fontSize: 13, fontWeight: '500', textDecorationLine: 'underline' },

  headerActionGroup: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8 },
  headerActionText: { fontSize: 16, fontWeight: '600' },
  editProfileTrigger: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 12, 
    borderWidth: 1,
    marginTop: 4 
  },
  editProfileTriggerText: { fontSize: 13, fontWeight: '700' },

  stickyFooterContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    overflow: 'hidden',
  },
  blurWrapper: {
    paddingBottom: Platform.OS === 'ios' ? 34 : 20, // Account for home indicator
    paddingTop: 16,
    paddingHorizontal: 24,
  },
  footerContent: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  cancelFooterBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelFooterBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  saveFooterBtn: {
    flex: 2,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveFooterBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
