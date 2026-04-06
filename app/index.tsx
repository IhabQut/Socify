import React, { useRef, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList, 
  Dimensions,
  Pressable,
  Text,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { 
  useAnimatedScrollHandler, 
  useSharedValue, 
  useAnimatedStyle, 
  interpolate,
  Extrapolation,
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
import { StorageService } from '@/services/storageService';
import { useEffect } from 'react';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Data omitted for chunk, let's keep all standard items.
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
  { id: '1', title: 'Unlock Your Creativity', subtitle: 'A space designed specially for creators to share, inspire, and connect.', style: 'hero', type: 'welcome' },
  { id: '2', title: 'Discover Inspiration', subtitle: 'Find curated content tailored to your unique creative vision.', style: 'split', type: 'discovery' },
  { id: '3', title: 'What drives you?', subtitle: 'Select your primary areas of interest.', style: 'grid', type: 'question_select', options: ['Photography', 'Design', 'Writing', 'Music', 'Art', 'Video', 'Coding'] },
  { id: '4', title: 'What is your primary goal?', subtitle: 'This decides the type of assets we generate first.', style: 'grid', type: 'question_select', options: ['Grow Following', 'Sell Products', 'Brand Awareness', 'Build Portfolio'] },
  { id: '5', title: 'Preferred Tone', subtitle: 'How should your brand sound in copies?', style: 'centered', type: 'question_select', options: ['Professional', 'Casual', 'Humorous', 'Bold'] },
  { id: '6', title: 'Create Your Profile', subtitle: 'Choose how the world sees you.', style: 'centered', type: 'question_input', placeholder: 'Enter your alias...' },
  { id: '7', title: 'Ready to Inspire?', subtitle: 'Your creative journey begins now.', style: 'hero', type: 'final' },
];

export default function OnboardingScreen() {
  const scrollX = useSharedValue(0);
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

  useEffect(() => {
    StorageService.hasOnboarded().then(status => {
      if (status) {
        router.replace('/(tabs)');
      }
    });
  }, []);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleNext = async () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await StorageService.setOnboarded();
      // @ts-ignore
      router.replace('/(tabs)');
    }
  };

  const skip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await StorageService.setOnboarded();
    // @ts-ignore
    router.replace('/(tabs)');
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const nearBgStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(scrollX.value, [0, SCREEN_WIDTH * 6], [0, -SCREEN_WIDTH * 0.2], Extrapolation.CLAMP) }],
  }));

  const renderItem = ({ item, index }: { item: OnboardingData; index: number }) => {
    return (
      <View style={{ width: SCREEN_WIDTH, paddingTop: SCREEN_HEIGHT * 0.1, flex: 1 }}>
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
              title={index === ONBOARDING_DATA.length - 1 ? 'Get Started' : 'Continue'} 
              onPress={handleNext}
              primary={index === ONBOARDING_DATA.length - 1}
            />
          </View>
        </OnboardingStep>
      </View>
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
      />

      <SafeAreaView style={styles.headerSafeArea} pointerEvents="box-none">
        {currentIndex < ONBOARDING_DATA.length - 1 && (
          <Animated.View entering={FadeIn.delay(500)} style={styles.header}>
            <Pressable onPress={skip} hitSlop={20}>
              <Text style={[styles.skipText, { color: theme.icon }]}>Skip</Text>
            </Pressable>
          </Animated.View>
        )}
      </SafeAreaView>

      <View style={styles.pagination} pointerEvents="none">
        {ONBOARDING_DATA.map((_, index) => {
          const dotStyle = useAnimatedStyle(() => {
            const width = interpolate(scrollX.value, [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH], [8, 24, 8], Extrapolation.CLAMP);
            const opacity = interpolate(scrollX.value, [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH], [0.2, 1, 0.2], Extrapolation.CLAMP);
            return { width, opacity, backgroundColor: theme.primary };
          });
          return <Animated.View key={index} style={[styles.dot, dotStyle]} />;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundLayer: { ...StyleSheet.absoluteFillObject, zIndex: -3, opacity: 0.1 },
  headerSafeArea: { position: 'absolute', top: 20, width: '100%', zIndex: 100 },
  header: { alignItems: 'flex-end', paddingHorizontal: 24, paddingTop: 10 },
  skipText: { fontSize: 15, fontWeight: '500' },
  buttonWrapper: { marginTop: 40, alignItems: 'center', width: '100%', paddingHorizontal: 24, zIndex: 50 },
  pagination: { position: 'absolute', bottom: 50, flexDirection: 'row', width: '100%', justifyContent: 'center', alignItems: 'center', gap: 8 },
  dot: { height: 4, borderRadius: 2 },
});
