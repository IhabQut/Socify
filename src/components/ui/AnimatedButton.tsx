import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withTiming,
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
  const opacity = useSharedValue(1);
  const theme = Colors[colorScheme];

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
      backgroundColor: primary ? theme.primary : 'transparent',
      borderColor: theme.border,
      borderWidth: primary ? 0 : 1,
      shadowColor: '#000',
      shadowOpacity: primary ? 0.15 : 0,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: primary ? 4 : 0,
    };
  });

  const textStyle = useAnimatedStyle(() => {
    return {
      color: primary ? theme.background : theme.primary,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(0.9, { duration: 100 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 200 });
  };

  return (
    <AnimatedPressable
      style={[styles.button, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.Text style={[styles.text, textStyle]}>
        {title}
      </Animated.Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '80%',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
