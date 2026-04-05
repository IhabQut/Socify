import React from 'react';
import { StyleSheet, View, Text, useWindowDimensions, Dimensions } from 'react-native';
import Animated, { 
  FadeInDown,
  FadeIn,
  FadeInUp,
  ZoomIn,
  SlideInRight,
  BounceIn,
  StretchInX,
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type OnboardingLayoutStyle = 'hero' | 'split' | 'grid' | 'centered' | 'abstract';

interface OnboardingStepProps {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
  style?: OnboardingLayoutStyle;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const OnboardingStep = ({ title, subtitle, children, style = 'hero' }: OnboardingStepProps) => {
  const { width, height } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

  // 1. HERO STYLE: Cinematic "Assemble" Branding
  if (style === 'hero') {
    return (
      <View style={[styles.container, { width }]}>
        <Animated.View 
          entering={ZoomIn.duration(1200).springify().damping(12)}
          style={styles.heroImageContainer}
        >
          <View style={[styles.logoGlow, { backgroundColor: theme.primary }]} />
          <Text style={styles.brandingLogo}>SOCIFYY</Text>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(600).duration(1000).springify()}
          style={styles.heroTextContainer}
        >
          <Text style={[styles.heroTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.heroSubtitle, { color: theme.text + 'AA' }]}>{subtitle}</Text>
          {children}
        </Animated.View>
      </View>
    );
  }

  // 2. SPLIT STYLE: Vertical "Slide & Merge"
  if (style === 'split') {
    return (
      <View style={[styles.container, { width }]}>
        <Animated.View 
          entering={StretchInX.duration(1000)}
          style={[styles.splitImageArea, { height: height * 0.45, backgroundColor: theme.primary + '11' }]}
        >
          <Text style={styles.placeholderText}>[ VISUAL ENGINE ]</Text>
        </Animated.View>

        <Animated.View 
          entering={FadeInUp.delay(300).duration(1000).springify()}
          style={[styles.splitContentArea, { backgroundColor: theme.background }]}
        >
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.text + '99' }]}>{subtitle}</Text>
          {children}
        </Animated.View>
      </View>
    );
  }

  // 3. GRID STYLE: Matrix Staggered Entry
  if (style === 'grid') {
    return (
      <View style={[styles.container, { width, padding: 24, paddingTop: 60 }]}>
        <Animated.View entering={SlideInRight.duration(800)}>
          <Text style={[styles.gridTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.gridSubtitle, { color: theme.text + '88' }]}>{subtitle}</Text>
        </Animated.View>
        <View style={styles.gridContent}>
          {children}
        </View>
      </View>
    );
  }

  // 4. CENTERED STYLE: High-Glow Glass Reveal
  if (style === 'centered') {
    return (
      <View style={[styles.container, { width, justifyContent: 'center', padding: 24 }]}>
        <Animated.View 
          entering={BounceIn.duration(1200).delay(200)}
          style={[styles.centeredCard, { backgroundColor: theme.card, borderColor: theme.primary + '33' }]}
        >
          <Text style={[styles.title, { color: theme.text, textAlign: 'center' }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.text + '99', textAlign: 'center' }]}>{subtitle}</Text>
          {children}
        </Animated.View>
      </View>
    );
  }

  // 5. ABSTRACT STYLE: Ultra-impact scaling
  return (
    <View style={[styles.container, { width, justifyContent: 'center', alignItems: 'center' }]}>
      <Animated.View entering={ZoomIn.duration(1000).springify()}>
        <Text style={[styles.abstractTitle, { color: theme.primary }]}>{title}</Text>
        <Text style={[styles.abstractSubtitle, { color: theme.text }]}>{subtitle}</Text>
      </Animated.View>
      <View style={styles.abstractCTA}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Hero
  heroImageContainer: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoGlow: {
    width: 250,
    height: 250,
    borderRadius: 125,
    position: 'absolute',
    opacity: 0.15,
  },
  brandingLogo: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 8,
    textShadowColor: 'rgba(188, 0, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  heroTextContainer: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
  },
  // Split
  splitImageArea: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitContentArea: {
    flex: 1,
    padding: 32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  // Grid
  gridTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  gridSubtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  gridContent: {
    flex: 1,
  },
  // Centered
  centeredCard: {
    padding: 40,
    borderRadius: 32,
    borderWidth: 1.5,
    shadowColor: '#BC00FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  // Abstract
  abstractTitle: {
    fontSize: 42,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -2,
    textTransform: 'uppercase',
  },
  abstractSubtitle: {
    fontSize: 20,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '300',
    letterSpacing: 1,
  },
  abstractCTA: {
    marginTop: 60,
  },
  // Common
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  placeholderText: {
    color: '#333',
    fontWeight: 'bold',
    opacity: 0.5,
    letterSpacing: 2,
  },
});
