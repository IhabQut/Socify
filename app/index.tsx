import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { FloatingParticle } from '@/components/FloatingParticle';
import { OnboardingLayoutStyle, OnboardingStep } from '@/components/OnboardingStep';
import { QuestionCard } from '@/components/QuestionCard';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { StorageService } from '@/services/storageService';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/Skeleton';
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

import { ONBOARDING_DATA, OnboardingData } from '@/constants/onboarding';

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

const OnboardingSkeleton = ({ theme }: any) => (
  <View style={{ flex: 1, padding: 40, paddingTop: 100 }}>
    <Skeleton width={120} height={12} style={{ alignSelf: 'center', marginBottom: 40 }} />
    <Skeleton width="90%" height={32} style={{ alignSelf: 'center', marginBottom: 12 }} />
    <Skeleton width="70%" height={32} style={{ alignSelf: 'center', marginBottom: 40 }} />
    
    <View style={{ gap: 16, marginTop: 40 }}>
      {[1, 2, 3, 4].map(i => (
        <Skeleton key={i} width="100%" height={64} borderRadius={20} />
      ))}
    </View>

    <View style={{ position: 'absolute', bottom: 60, left: 40, right: 40 }}>
       <Skeleton width="100%" height={58} borderRadius={29} />
    </View>
  </View>
);

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
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [activeStep, setActiveStep] = useState(0);
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
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <OnboardingSkeleton theme={theme} />
      </View>
    );
  }

  const handleNext = async () => {
    const currentStep = ONBOARDING_DATA[currentIndex];
    let isValid = true;
    let errorMsg = "Please make a selection to continue.";

    if (currentStep.type === 'question_select') {
      if (currentStep.id === '8')  isValid = platforms.length > 0;
      if (currentStep.id === '4')  isValid = !!goal;
      if (currentStep.id === '9')  isValid = !!discovery;
      if (currentStep.id === '10') isValid = !!followerCount;
      if (currentStep.id === '14') isValid = !!industry;
      if (currentStep.id === '12') isValid = true;
      if (currentStep.id === '13') isValid = !!frequency;
    } else if (currentStep.type === 'question_input') {
      if (currentStep.id === '11') isValid = brandIdentity.trim().length > 0;
      if (currentStep.id === '15') isValid = shopName.trim().length > 0;
      if (currentStep.id === '6')  isValid = alias.trim().length > 0;
      errorMsg = "Please fill in this field to continue.";
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
        { label: "Analyzing your marketing focus",       icon: "analytics-outline" },
        { label: "Identifying high-engagement templates", icon: "grid-outline" },
        { label: "Calibrating your creative engine",     icon: "color-wand-outline" },
        { label: "Building your brand strategy",         icon: "trending-up-outline" },
        { label: "Personalizing your creative hub",      icon: "sparkles-outline" },
      ];

      setCompletedSteps([]);
      setActiveStep(0);

      for (let i = 0; i < analysisSteps.length; i++) {
        const progress = Math.round(((i + 1) / analysisSteps.length) * 100);
        setAnalysisText(analysisSteps[i].label);
        setActiveStep(i);
        setAnalysisPercentage(progress);
        analysisProgress.value = withTiming(progress, { duration: 1000 });
        await new Promise(r => setTimeout(r, 1400));
        setCompletedSteps(prev => [...prev, i]);
        await new Promise(r => setTimeout(r, 180));
      }

      setIsSubmitting(true);
      try {
        // Ensure user is signed in before completing onboarding
        if (!user) {
          const { error: authError } = await signInGuest();
          if (authError) throw authError;
        }

        let resolvedCountry = 'Unknown';
        try {
          const geoResponse = await fetch('https://ipapi.co/json/');
          if (geoResponse.ok) {
             const geoData = await geoResponse.json();
             resolvedCountry = `${geoData.city}, ${geoData.country_name}`;
          }
        } catch (e) {
          console.warn("Geolocation fetch failed, defaulting to Unknown.");
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
          platforms: platforms,
          country: resolvedCountry
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
            emoji={item.emoji}
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
                  if (item.id === '8')  setPlatforms(val as string[]);
                  if (item.id === '4')  setGoal(val as string);
                  if (item.id === '9')  setDiscovery(val as string);
                  if (item.id === '10') setFollowerCount(val as string);
                  if (item.id === '14') setIndustry(val as string);
                  if (item.id === '12') setHasLocalShop(val === 'Yes — I have a store or office');
                  if (item.id === '13') setFrequency(val as string);
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

      <Modal visible={isAnalyzing} transparent animationType="fade">
        <View style={StyleSheet.absoluteFill}>
          <View style={[styles.analysisOverlay, { backgroundColor: theme.background }]}>

            {/* Ambient glow particles */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <FloatingParticle color={theme.accent} size={SCREEN_WIDTH * 0.6} delay={0} duration={8000} />
              <FloatingParticle color={theme.primary} size={SCREEN_WIDTH * 0.5} delay={1500} duration={10000} />
            </View>

            <View style={styles.analysisContent}>

              {/* Logo pulse */}
              <Animated.View entering={FadeInDown.delay(100).duration(600)} style={logoScaleStyle}>
                <View style={[styles.logoContainer, { borderColor: theme.border, shadowColor: theme.primary }]}>
                  <Image
                    source={require('../assets/images/logo.png')}
                    style={styles.analysisLogo}
                    resizeMode="contain"
                  />
                </View>
              </Animated.View>

              {/* Title */}
              <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.analysisTitleGroup}>
                <Text style={[styles.analysisTitle, { color: theme.text }]}>Building Your Strategy</Text>
                <Text style={[styles.analysisSubtitle, { color: theme.icon }]}>Personalizing your Socify experience</Text>
              </Animated.View>

              {/* Checklist Rows */}
              <View style={styles.checklistContainer}>
                {[
                  { label: "Analyzing your marketing focus",       icon: "analytics-outline" },
                  { label: "Identifying high-engagement templates", icon: "grid-outline" },
                  { label: "Calibrating your creative engine",     icon: "color-wand-outline" },
                  { label: "Building your brand strategy",         icon: "trending-up-outline" },
                  { label: "Personalizing your creative hub",      icon: "sparkles-outline" },
                ].map((step, i) => {
                  const isDone   = completedSteps.includes(i);
                  const isActive = activeStep === i && !isDone;
                  return (
                    <Animated.View
                      key={i}
                      entering={FadeInDown.delay(300 + i * 80).duration(500)}
                      style={[
                        styles.checkRow,
                        {
                          backgroundColor: isDone
                            ? theme.primary + '12'
                            : isActive
                            ? theme.card
                            : theme.card + '80',
                          borderColor: isDone
                            ? theme.primary + '40'
                            : isActive
                            ? theme.border
                            : theme.border + '50',
                        },
                      ]}
                    >
                      {/* Icon or spinner */}
                      <View style={[
                        styles.checkIconWrap,
                        { backgroundColor: isDone ? theme.primary + '20' : theme.background }
                      ]}>
                        {isDone ? (
                          <Animated.View entering={FadeIn.duration(300)}>
                            <Ionicons name="checkmark" size={16} color={theme.primary} />
                          </Animated.View>
                        ) : isActive ? (
                          <ActivityIndicator size="small" color={theme.primary} />
                        ) : (
                          <Ionicons name={step.icon as any} size={16} color={theme.icon} opacity={0.4} />
                        )}
                      </View>

                      {/* Label */}
                      <Text style={[
                        styles.checkLabel,
                        {
                          color: isDone ? theme.text : isActive ? theme.text : theme.icon,
                          fontWeight: isDone || isActive ? '700' : '500',
                          opacity: isDone || isActive ? 1 : 0.5,
                        }
                      ]}>
                        {step.label}
                      </Text>

                      {/* Done mark */}
                      {isDone && (
                        <Animated.View entering={FadeIn.duration(200)}>
                          <Text style={[styles.checkDoneText, { color: theme.primary }]}>Done</Text>
                        </Animated.View>
                      )}
                    </Animated.View>
                  );
                })}
              </View>

              {/* Progress bar + % */}
              <View style={styles.progressContainer}>
                <View style={[styles.progressTrack, { backgroundColor: theme.card }]}>
                  <Animated.View
                    style={[styles.progressBar, { backgroundColor: theme.primary }, analysisProgressStyle]}
                  />
                </View>
                <View style={styles.progressFooter}>
                  <Text style={[styles.progressLabel, { color: theme.icon }]}>Analyzing...</Text>
                  <Text style={[styles.progressPercentage, { color: theme.primary }]}>{analysisPercentage}%</Text>
                </View>
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
  analysisOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  analysisContent: { width: '100%', alignItems: 'center' },
  analysisTitleGroup: { alignItems: 'center', marginBottom: 32 },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    padding: 20,
    marginBottom: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
  },
  analysisLogo: { width: 60, height: 60 },
  analysisTextGroup: { alignItems: 'center', marginBottom: 50 },
  analysisTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
  analysisSubtitle: { fontSize: 14, fontWeight: '500', textAlign: 'center', opacity: 0.7 },
  // Checklist
  checklistContainer: { width: '100%', gap: 10, marginBottom: 32 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  checkIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLabel: { flex: 1, fontSize: 14, letterSpacing: -0.1 },
  checkDoneText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  // Progress
  progressContainer: { width: '100%' },
  progressTrack: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  progressBar: { height: '100%', borderRadius: 3 },
  progressFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 13, fontWeight: '500' },
  progressPercentage: { fontSize: 13, fontWeight: '800' },
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
