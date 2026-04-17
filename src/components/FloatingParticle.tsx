import React, { useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FloatingParticleProps {
  color: string;
  size?: number;
  delay?: number;
  duration?: number;
}

export const FloatingParticle = ({ color, size = 300, delay = 0, duration = 15000 }: FloatingParticleProps) => {
  const translateX = useSharedValue((Math.random() - 0.5) * SCREEN_WIDTH * 0.8);
  const translateY = useSharedValue((Math.random() - 0.5) * SCREEN_HEIGHT * 0.8);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Slow, ambient hovering animation
    translateX.value = withRepeat(
      withTiming(translateX.value + (Math.random() > 0.5 ? 100 : -100), {
        duration: duration,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    translateY.value = withRepeat(
      withTiming(translateY.value + (Math.random() > 0.5 ? 100 : -100), {
        duration: duration * 1.2,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    scale.value = withRepeat(
      withDelay(delay, withTiming(1.2, { duration: duration * 0.8, easing: Easing.inOut(Easing.ease) })),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <Animated.View 
      style={[
        styles.particle, 
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2, 
          backgroundColor: color,
        }, 
        animatedStyle
      ]} 
    />
  );
};

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    // We use a high blur to create an ambient mesh gradient effect
    // Note: CSS filter blur works in Expo Web. For native, we rely on opacity since standard Views don't support high blur dynamically without expo-blur
    filter: 'blur(80px)',
    opacity: 0.15,
  },
});
