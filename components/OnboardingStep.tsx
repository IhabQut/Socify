import React from 'react';
import { StyleSheet, View, Text, useWindowDimensions, Dimensions } from 'react-native';
import Animated, { 
  FadeInDown,
  FadeIn,
  FadeInUp,
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

export const OnboardingStep = ({ title, subtitle, children, style = 'hero' }: OnboardingStepProps) => {
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

  // Base text rendering for clean aesthetics
  const renderTitles = () => (
    <Animated.View 
      entering={FadeInDown.delay(200).duration(800).springify()}
      style={styles.textContainer}
    >
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: theme.icon }]}>{subtitle}</Text>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { width }]}>
      <View style={styles.contentWrapper}>
        
        {style === 'hero' && (
          <Animated.View entering={FadeIn.duration(1000)} style={styles.heroSpacer}>
             {/* Future space for minimal illustration */}
          </Animated.View>
        )}

        {renderTitles()}

        <Animated.View 
          entering={FadeInUp.delay(400).duration(800).springify()}
          style={styles.childContainer}
        >
          {children}
        </Animated.View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 500,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  heroSpacer: {
    height: 120, // Replaces giant glowing logo
    width: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(128, 128, 128, 0.05)',
    marginBottom: 40,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '400',
  },
  childContainer: {
    width: '100%',
    alignItems: 'center',
    flex: 1,
  },
});
