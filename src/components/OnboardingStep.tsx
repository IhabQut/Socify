import React from 'react';
import { StyleSheet, View, Text, useWindowDimensions, Platform } from 'react-native';
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
  emoji?: string;
  children?: React.ReactNode;
  style?: OnboardingLayoutStyle;
}

export const OnboardingStep = ({ title, subtitle, emoji, children, style = 'hero' }: OnboardingStepProps) => {
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

  const isHero = style === 'hero';

  return (
    <View style={[styles.container, { width }]}>
      <View style={styles.contentWrapper}>

        {/* Emoji badge — shown on question steps */}
        {emoji && (
          <Animated.View
            entering={FadeIn.delay(80).duration(600)}
            style={[styles.emojiBadge, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </Animated.View>
        )}

        {/* Titles */}
        <Animated.View
          entering={FadeInDown.delay(140).duration(700).springify()}
          style={[styles.textContainer, isHero && styles.textContainerHero]}
        >
          <Text style={[
            styles.title,
            { color: theme.text },
            isHero && styles.titleHero
          ]}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>
            {subtitle}
          </Text>
        </Animated.View>

        {/* Content / Options */}
        {children && (
          <Animated.View
            entering={FadeInUp.delay(260).duration(700).springify()}
            style={styles.childContainer}
          >
            {children}
          </Animated.View>
        )}

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
    paddingHorizontal: 28,
    alignItems: 'flex-start',
    justifyContent: 'center',
    flex: 1,
    paddingTop: 20,
  },
  emojiBadge: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  emojiText: {
    fontSize: 20,
  },
  textContainer: {
    alignItems: 'flex-start',
    marginBottom: 28,
    width: '100%',
  },
  textContainerHero: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.2,
    marginBottom: 14,
    lineHeight: 42,
  },
  titleHero: {
    fontSize: 42,
    textAlign: 'center',
    lineHeight: 50,
    letterSpacing: -1.5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  childContainer: {
    width: '100%',
    alignItems: 'center',
    flex: 1,
  },
});
