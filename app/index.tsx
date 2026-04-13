import { AnimatedButton } from '@/components/AnimatedButton';
import { FloatingParticle } from '@/components/FloatingParticle';
import { OnboardingLayoutStyle, OnboardingStep } from '@/components/OnboardingStep';
import { QuestionCard } from '@/components/QuestionCard';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { StorageService } from '@/services/storageService';
import { useAuth } from '@/hooks/use-auth';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter, Redirect } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingData {
  id: string;
  title: string;
  subtitle: string;
  style: OnboardingLayoutStyle;
  type?: 'welcome' | 'discovery' | 'question_select' | 'question_input' | 'final';
  options?: string[];
  placeholder?: string;
  multiSelect?: boolean;
  maxLength?: number;
}

const ONBOARDING_DATA: OnboardingData[] = [
  { id: '1', title: "Let's Customize Your Experience", subtitle: "Let's be creative. A space designed specially for creators to share, inspire, and connect.", style: 'hero', type: 'welcome' },
  { id: '3', title: 'Main Interests', subtitle: 'Select your primary areas of focus. (Select multiple)', style: 'grid', type: 'question_select', options: ['Photography', 'Graphic Design', 'Content Creation', 'Digital Art', 'Video Production', 'Creative Writing', 'Performance Art'], multiSelect: true },
  { id: '8', title: 'Active Platforms', subtitle: 'Where do you build your presence? (Select multiple)', style: 'grid', type: 'question_select', options: ['Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'Facebook', 'Threads', 'Pinterest'], multiSelect: true },
  { id: '4', title: 'Primary Goal', subtitle: 'What is your main focus for growth?', style: 'grid', type: 'question_select', options: ['Scale Engagement', 'Monetize Content', 'Build Authority', 'Drive Sales', 'Establish Brand', 'Network & Connect'], multiSelect: false },
  { id: '9', title: 'Discovery Source', subtitle: 'How did you find your way here?', style: 'centered', type: 'question_select', options: ['App Store', 'Social Media', 'Search Engine', 'Friend Referral', 'Advertisement'], multiSelect: false },
  { id: '10', title: 'Current Reach', subtitle: 'What is your current follower base?', style: 'centered', type: 'question_select', options: ['0 - 1k', '1k - 10k', '10k - 50k', '50k - 100k', '100k+'], multiSelect: false },
  { id: '14', title: 'Your Industry', subtitle: 'Which sector best defines your work?', style: 'centered', type: 'question_select', options: ['Beauty & Cosmetics', 'Food & Beverage', 'Fashion & Apparel', 'Real Estate', 'Tech & SaaS', 'Health & Wellness', 'Education', 'Creative Arts', 'Luxury & Lifestyle'], multiSelect: false },
  { id: '11', title: 'Brand Identity', subtitle: 'Describe your brand essence in a few words.', style: 'centered', type: 'question_input', placeholder: 'e.g., Minimalist Sustainable Fashion', maxLength: 80 },
  { id: '15', title: 'Shop & Location', subtitle: 'What is your business or alias name?', style: 'centered', type: 'question_input', placeholder: 'Digital Dreamers Co.', maxLength: 40 },
  { id: '12', title: 'Physical Presence', subtitle: 'Do you operate a physical location?', style: 'centered', type: 'question_select', options: ['Yes, Physical Shop', 'No, Online Only'], multiSelect: false },
  { id: '13', title: 'Marketing Pulse', subtitle: 'How often do you run social media ads?', style: 'centered', type: 'question_select', options: ['Daily', 'Weekly', 'Monthly', 'Exploring Options'], multiSelect: false },
  { id: '6', title: 'Alias', subtitle: 'Finally, how should we address you?', style: 'centered', type: 'question_input', placeholder: 'Enter your name...', maxLength: 30 },
  { id: '7', title: 'Strategy Ready', subtitle: 'We’ve analyzed your profile and prepared a personalized creative engine.', style: 'hero', type: 'final' },
];

const PaginationDot = ({ index, scrollX, theme }: any) => {
  return null; // Dots are replaced by progress bar
};

const ProgressBar = ({ progress, theme }: { progress: number, theme: any }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    width: withSpring(`${progress * 100}%`, { damping: 20, stiffness: 90 }),
  }));

  return (
    <View style={[styles.progressBarTrack, { backgroundColor: theme.card }]}>
      <Animated.View style={[styles.progressBarFill, { backgroundColor: theme.primary }, animatedStyle]} />
    </View>
  );
};

export default function OnboardingScreen() {
  const scrollX = useSharedValue(0);
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [alias, setAlias] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [goal, setGoal] = useState('');
  const [discovery, setDiscovery] = useState('');
  const [followerCount, setFollowerCount] = useState('');
  const [brandIdentity, setBrandIdentity] = useState('');
  const [industry, setIndustry] = useState('');
  const [shopName, setShopName] = useState('');
  const [hasLocalShop, setHasLocalShop] = useState(false);
  const [frequency, setFrequency] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysisProgress = useSharedValue(0);
  const [analysisPercentage, setAnalysisPercentage] = useState(0);
  const [analysisText, setAnalysisText] = useState('Analyzing your focus...');
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const { signInGuest, completeOnboarding, session, user, loading, hasCompletedOnboarding } = useAuth();

  // Move all hooks ABOVE early returns to maintain consistent hook order
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const nearBgStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(scrollX.value, [0, SCREEN_WIDTH * 6], [0, -SCREEN_WIDTH * 0.2], Extrapolation.CLAMP) }],
  }));

  const logoScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withRepeat(withTiming(1.05, { duration: 1200 }), -1, true) }],
    opacity: withRepeat(withTiming(0.8, { duration: 1200 }), -1, true),
  }));

  const analysisProgressStyle = useAnimatedStyle(() => ({
    width: `${analysisProgress.value}%`
  }));

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  // Early returns must come AFTER all hooks are declared
  if (!loading && hasCompletedOnboarding) {
    return <Redirect href="/(tabs)" />;
  }

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: theme.background }} />;
  }

  const handleNext = async () => {
    const currentStep = ONBOARDING_DATA[currentIndex];
    let isValid = true;
    let errorMsg = "Please make a selection to continue.";

    if (currentStep.type === 'question_select') {
      if (currentStep.id === '3') isValid = interests.length > 0;
      else if (currentStep.id === '8') isValid = platforms.length > 0;
      else if (currentStep.id === '4') isValid = !!goal;
      else if (currentStep.id === '9') isValid = !!discovery;
      else if (currentStep.id === '10') isValid = !!followerCount;
      else if (currentStep.id === '14') isValid = !!industry;
      else if (currentStep.id === '12') isValid = true;
      else if (currentStep.id === '13') isValid = !!frequency;
    } else if (currentStep.type === 'question_input') {
      if (currentStep.id === '11') isValid = brandIdentity.trim().length > 0;
      else if (currentStep.id === '15') isValid = shopName.trim().length > 0;
      else if (currentStep.id === '6') isValid = alias.trim().length > 0;
      errorMsg = "Please enter the required information.";
    }

    if (!isValid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Input Required", errorMsg);
      return;
    }

    Keyboard.dismiss();

    if (currentIndex < ONBOARDING_DATA.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    } else {
      setIsAnalyzing(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      const analysisSteps = [
        "Analyzing your marketing focus...",
        "Identifying high-engagement templates...",
        "Customizing your creative engine...",
        "Building your personalized strategy...",
        "Finalizing your creative hub..."
      ];

      for (let i = 0; i < analysisSteps.length; i++) {
        const progress = Math.round(((i + 1) / analysisSteps.length) * 100);
        setAnalysisText(analysisSteps[i]);
        setAnalysisPercentage(progress);
        analysisProgress.value = withTiming(progress, { duration: 800 });
        await new Promise(r => setTimeout(r, 850));
      }

      setIsSubmitting(true);
      try {
        // Ensure user is signed in before completing onboarding
        if (!user) {
          const { error: authError } = await signInGuest();
          if (authError) throw authError;
        }

        const { error } = await completeOnboarding({
          fullName: alias || 'Future Creator',
          discoverySource: discovery,
          shopName: shopName,
          industry: industry,
          brandIdentity: brandIdentity,
          hasLocalShop: hasLocalShop,
          frequency: frequency,
          goal: goal,
          platforms: platforms
        });
        
        if (error) {
           console.error("Onboarding saving failed:", error);
           Alert.alert("Server Error", "Could not save your preferences. Please try again.");
           return;
        }
        await StorageService.setOnboarded();
        router.replace('/(tabs)');
        
        setTimeout(() => {
          router.push('/paywall');
        }, 500);

      } catch (err) {
        console.error("Onboarding completion failed", err);
      } finally {
        setIsSubmitting(false);
        setIsAnalyzing(false);
      }
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      flatListRef.current?.scrollToIndex({ index: prevIndex, animated: true });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const skip = null; // Removed skip

  const renderItem = ({ item, index }: { item: OnboardingData; index: number }) => {
    return (
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ width: SCREEN_WIDTH, paddingTop: 20, flex: 1 }}>
          <OnboardingStep
            title={item.title}
            subtitle={item.subtitle}
            style={item.style}
          >
            {item.type === 'welcome' && (
              <View style={styles.previewContainer}>
                <View style={[styles.videoPlaceholder, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Ionicons name="play-circle" size={64} color={theme.primary} />
                  <Text style={[styles.placeholderText, { color: theme.icon }]}>App Showcase Preview</Text>
                  <View style={[styles.videoBadge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.videoBadgeText}>HD GIF/VIDEO</Text>
                  </View>
                </View>
              </View>
            )}
            {item.type === 'question_select' && (
              <QuestionCard
                type="select"
                options={item.options}
                multiSelect={item.multiSelect}
                onValueChange={(val) => {
                  if (item.id === '3') setInterests(val as string[]);
                  if (item.id === '8') setPlatforms(val as string[]);
                  if (item.id === '4') { setGoal(val as string); }
                  if (item.id === '9') { setDiscovery(val as string); }
                  if (item.id === '10') { setFollowerCount(val as string); }
                  if (item.id === '14') { setIndustry(val as string); }
                  if (item.id === '12') { setHasLocalShop(val === 'Yes, Physical Shop'); }
                  if (item.id === '13') { setFrequency(val as string); }
                }}
              />
            )}
            {item.type === 'question_input' && (
              <QuestionCard
                type="input"
                placeholder={item.placeholder}
                maxLength={item.maxLength}
                onValueChange={(val) => {
                  if (item.id === '11') setBrandIdentity(val as string);
                  if (item.id === '15') setShopName(val as string);
                  if (item.id === '6') setAlias(val as string);
                }}
              />
            )}
          </OnboardingStep>
        </View>
      </KeyboardAvoidingView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />

      <Animated.View style={[styles.backgroundLayer, nearBgStyle]} pointerEvents="none">
        <FloatingParticle color={theme.accent} size={SCREEN_WIDTH * 0.9} delay={0} duration={12000} />
        <FloatingParticle color={theme.primary} size={SCREEN_WIDTH * 0.7} delay={1000} duration={15000} />
      </Animated.View>

      <SafeAreaView style={styles.headerSafeArea} pointerEvents="box-none">
        {currentIndex > 0 && (
          <View style={styles.topHeader}>
            <View style={styles.headerTopRow}>
              {currentIndex < ONBOARDING_DATA.length - 1 ? (
                <Pressable 
                  onPress={handleBack} 
                  style={styles.headerBackButton}
                  hitSlop={20}
                >
                  <Ionicons name="arrow-back" size={24} color={theme.text} />
                </Pressable>
              ) : (
                <View style={{ width: 32 }} />
              )}
              <View style={styles.stepInfo}>
                <Text style={[styles.stepText, { color: theme.icon }]}>
                  Step {currentIndex} <Text style={{ color: theme.text, opacity: 0.3 }}>/</Text> {ONBOARDING_DATA.length - 1}
                </Text>
              </View>
              <View style={{ width: 32 }} /> 
            </View>
            <ProgressBar progress={currentIndex / (ONBOARDING_DATA.length - 1)} theme={theme} />
          </View>
        )}
      </SafeAreaView>

      <Animated.FlatList
        ref={flatListRef as any}
        data={ONBOARDING_DATA}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        keyExtractor={(item) => item.id}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        scrollEnabled={false}
      />

      <View style={styles.footerNav}>
        <View style={styles.footerButtons}>
          <View style={{ flex: 1 }}>
            <AnimatedButton
              title={currentIndex === ONBOARDING_DATA.length - 1 ? (isSubmitting ? 'Entering...' : 'Get Started') : 'Continue'}
              onPress={handleNext}
              primary={currentIndex === ONBOARDING_DATA.length - 1}
              disabled={isSubmitting}
            />
          </View>
        </View>
      </View>

      <Modal visible={isAnalyzing} transparent animationType="none">
        <View style={StyleSheet.absoluteFill}>
          <View style={[styles.analysisOverlay, { backgroundColor: theme.background }]}>
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <FloatingParticle color={theme.accent} size={SCREEN_WIDTH * 0.5} delay={0} duration={8000} />
              <FloatingParticle color={theme.primary} size={SCREEN_WIDTH * 0.4} delay={2000} duration={10000} />
            </View>

            <View style={styles.analysisContent}>
              <Animated.View 
                entering={FadeInDown.delay(200).duration(800)}
                style={logoScaleStyle}
              >
                <View style={[styles.logoContainer, { borderColor: theme.border, shadowColor: theme.primary }]}>
                  <Image 
                    source={require('@/assets/images/logo.png')} 
                    style={styles.analysisLogo}
                    resizeMode="contain"
                  />
                </View>
              </Animated.View>

              <View style={styles.analysisTextGroup}>
                <Animated.Text 
                  entering={FadeInDown.duration(600)}
                  key={analysisText} 
                  style={[styles.analysisTitle, { color: theme.text }]}
                >
                  {analysisText}
                </Animated.Text>
                <Text style={[styles.analysisSubtitle, { color: theme.icon }]}>
                  Creating your premium brand strategy
                </Text>
              </View>

              <View style={styles.progressContainer}>
                <View style={[styles.progressTrack, { backgroundColor: theme.card }]}>
                  <Animated.View 
                    style={[
                      styles.progressBar, 
                      { backgroundColor: theme.primary },
                      analysisProgressStyle
                    ]} 
                  />
                </View>
                <Text style={[styles.progressPercentage, { color: theme.icon }]}>
                   {analysisPercentage}%
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundLayer: { ...StyleSheet.absoluteFillObject, zIndex: -3, opacity: 0.1 },
  headerSafeArea: { width: '100%', zIndex: 100 },
  topHeader: { paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 10 : 20, paddingBottom: 10 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerBackButton: { padding: 4 },
  stepInfo: { justifyContent: 'center' },
  stepText: { fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  progressBarTrack: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 2 },
  footerNav: { position: 'absolute', bottom: 40, width: '100%', paddingHorizontal: 24, zIndex: 100 },
  footerButtons: { flexDirection: 'row', alignItems: 'center' },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  skipText: { fontSize: 15, fontWeight: '500' },
  buttonWrapper: { marginTop: 40, alignItems: 'center', width: '100%', paddingHorizontal: 24, zIndex: 50 },
  pagination: { position: 'absolute', bottom: 50, flexDirection: 'row', width: '100%', justifyContent: 'center', alignItems: 'center', gap: 8 },
  dot: { height: 4, borderRadius: 2 },
  analysisOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  analysisContent: { width: '100%', alignItems: 'center' },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    padding: 20,
    marginBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
  },
  analysisLogo: { width: 60, height: 60 },
  analysisTextGroup: { alignItems: 'center', marginBottom: 50 },
  analysisTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  analysisSubtitle: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  progressContainer: { width: '100%', alignItems: 'center' },
  progressTrack: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
  progressBar: { height: '100%', borderRadius: 3 },
  progressPercentage: { fontSize: 13, fontWeight: '700' },
  previewContainer: {
    width: '100%',
    aspectRatio: 16/10,
    marginTop: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 24,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  videoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 20,
  },
  videoBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
