import React, { useRef, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList, 
  Dimensions,
  Pressable,
  Text,
  StatusBar,
} from 'react-native';
import Animated, { 
  useAnimatedScrollHandler, 
  useSharedValue, 
  useAnimatedStyle, 
  interpolate,
  Extrapolation,
  useAnimatedRef,
  scrollTo,
  FadeIn,
} from 'react-native-reanimated';
import { Stack, useRouter } from 'expo-router';
import { OnboardingStep, OnboardingLayoutStyle } from '@/components/OnboardingStep';
import { AnimatedButton } from '@/components/AnimatedButton';
import { QuestionCard } from '@/components/QuestionCard';
import { FloatingParticle } from '@/components/FloatingParticle';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingData {
  id: string;
  title: string;
  subtitle: string;
  style: OnboardingLayoutStyle;
  type?: 'welcome' | 'discovery' | 'question_select' | 'question_input' | 'final';
  options?: string[];
  placeholder?: string;
}

const ONBOARDING_DATA: OnboardingData[] = [
  {
    id: '1',
    title: 'THE FUTURE IS SOCIAL',
    subtitle: 'Welcome to the next evolution of human connection. Prepared to enter the neon?',
    style: 'hero',
    type: 'welcome',
  },
  {
    id: '2',
    title: 'Pulse Scanning',
    subtitle: 'Real-time discovery of nearby vibes. Find your tribe in the digital fog.',
    style: 'split',
    type: 'discovery',
  },
  {
    id: '3',
    title: 'Select Your Flux',
    subtitle: 'What powers your connection? Choose your core interests.',
    style: 'grid',
    type: 'question_select',
    options: ['Cyber-Art', 'Neural-Tech', 'Neon-Fashion', 'Gamer-Vibe', 'City-Run', 'Deep-Music'],
  },
  {
    id: '4',
    title: 'Identity Alias',
    subtitle: 'Choose a handle that resonates through the void.',
    style: 'centered',
    type: 'question_input',
    placeholder: 'Enter your alias...',
  },
  {
    id: '5',
    title: 'SYSTEM READY',
    subtitle: 'Connection stable. Connection established. Ready to join the network?',
    style: 'abstract',
    type: 'final',
  },
];

export default function OnboardingScreen() {
  const scrollX = useSharedValue(0);
  const flatListRef = useAnimatedRef<FlatList>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollTo(flatListRef, (nextIndex) * SCREEN_WIDTH, 0, true);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/modal');
    }
  };

  const skip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/modal');
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  // 3-LAYER PARALLAX BACKGROUNDS
  const farBgStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(scrollX.value, [0, SCREEN_WIDTH * 4], [0, -SCREEN_WIDTH * 0.1], Extrapolation.CLAMP) }],
  }));

  const midBgStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(scrollX.value, [0, SCREEN_WIDTH * 4], [0, -SCREEN_WIDTH * 0.3], Extrapolation.CLAMP) }],
  }));

  const nearBgStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(scrollX.value, [0, SCREEN_WIDTH * 4], [0, -SCREEN_WIDTH * 0.6], Extrapolation.CLAMP) }],
  }));

  const renderItem = ({ item }: { item: OnboardingData }) => {
    return (
      <View style={{ width: SCREEN_WIDTH }}>
        <OnboardingStep 
          title={item.title} 
          subtitle={item.subtitle}
          style={item.style}
        >
          {item.type === 'question_select' && (
            <QuestionCard 
              type="select" 
              options={item.options} 
              onValueChange={() => {}} 
            />
          )}
          {item.type === 'question_input' && (
            <QuestionCard 
              type="input" 
              placeholder={item.placeholder} 
              onValueChange={() => {}} 
            />
          )}
          
          <View style={styles.buttonWrapper}>
            <AnimatedButton 
              title={currentIndex === ONBOARDING_DATA.length - 1 ? 'LAUNCH NETWORK' : 'INITIALIZE NEXT'} 
              onPress={handleNext}
              primary={currentIndex === ONBOARDING_DATA.length - 1}
            />
          </View>
        </OnboardingStep>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />
      
      {/* FAR LAYER: Distant blur glow */}
      <Animated.View style={[styles.backgroundLayer, farBgStyle]}>
        <FloatingParticle color={theme.primary} size={SCREEN_WIDTH * 0.8} delay={0} duration={6000} />
      </Animated.View>

      {/* MID LAYER: Asset image with moderate shift */}
      <Animated.Image 
        source={require('@/assets/images/icon.png')} 
        style={[styles.backgroundImage, midBgStyle]}
        resizeMode="cover"
        blurRadius={15}
      />
      
      {/* NEAR LAYER: Sharper floaters with high shift */}
      <Animated.View style={[styles.backgroundLayer, nearBgStyle]}>
        <FloatingParticle color={theme.secondary} size={80} delay={500} duration={4000} />
        <FloatingParticle color={theme.accent} size={60} delay={1500} duration={5000} />
      </Animated.View>

      {/* Overlay to dim background */}
      <View style={[styles.overlay, { backgroundColor: theme.background + 'B3' }]} />

      <Animated.FlatList
        ref={flatListRef}
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
      />

      {/* Skip Header */}
      {currentIndex < ONBOARDING_DATA.length - 1 && (
        <Animated.View entering={FadeIn.delay(1000)} style={styles.header}>
          <Pressable onPress={skip}>
            <Text style={[styles.skipText, { color: theme.text + '88' }]}>SKIP INITIALIZATION</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Futuristic Vertical Progress Indicator */}
      <View style={styles.pagination}>
        {ONBOARDING_DATA.map((_, index) => {
          const dotStyle = useAnimatedStyle(() => {
            const height = interpolate(scrollX.value, [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH], [8, 32, 8], Extrapolation.CLAMP);
            const opacity = interpolate(scrollX.value, [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH], [0.3, 1, 0.3], Extrapolation.CLAMP);
            return { height, opacity, backgroundColor: theme.primary };
          });
          return <Animated.View key={index} style={[styles.dot, dotStyle]} />;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -3,
  },
  backgroundImage: {
    position: 'absolute',
    width: SCREEN_WIDTH * 2,
    height: SCREEN_HEIGHT,
    zIndex: -2,
    opacity: 0.25,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  header: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 100,
  },
  skipText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  buttonWrapper: {
    marginTop: 40,
    alignItems: 'center',
    width: '100%',
  },
  pagination: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.4,
    left: 16,
    gap: 12,
  },
  dot: {
    width: 3,
    borderRadius: 2,
  },
});
