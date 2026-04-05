import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Easing
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  primary?: boolean;
}

export const AnimatedButton = ({ title, onPress, primary = true }: AnimatedButtonProps) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.5);
  const theme = Colors[colorScheme];

  useEffect(() => {
    // Constant pulsing glow for focus
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      backgroundColor: primary ? theme.primary : 'transparent',
      borderColor: theme.primary,
      borderWidth: primary ? 0 : 2,
      shadowColor: theme.primary,
      shadowOpacity: primary ? interpolate(glow.value, [0.5, 1], [0.3, 0.8]) : 0,
      shadowRadius: interpolate(glow.value, [0.5, 1], [10, 25]),
      elevation: primary ? interpolate(glow.value, [0.5, 1], [5, 15]) : 0,
    };
  });

  const textStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(glow.value, [0.5, 1], [0.8, 1]),
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.92);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <AnimatedPressable
      style={[styles.button, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.Text style={[styles.text, { color: primary ? '#fff' : theme.primary }, textStyle]}>
        {title.toUpperCase()}
      </Animated.Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 260,
  },
  text: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
