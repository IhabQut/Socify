import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withDelay,
  Easing,
  interpolate
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FloatingParticleProps {
  color: string;
  size?: number;
  delay?: number;
  duration?: number;
}

export const FloatingParticle = ({ color, size = 100, delay = 0, duration = 4000 }: FloatingParticleProps) => {
  const translateX = useSharedValue(Math.random() * SCREEN_WIDTH);
  const translateY = useSharedValue(Math.random() * SCREEN_HEIGHT);
  const opacity = useSharedValue(0.1);
  const scale = useSharedValue(1);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(translateX.value + (Math.random() * 100 - 50), {
        duration: duration,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );

    translateY.value = withRepeat(
      withTiming(translateY.value + (Math.random() * 100 - 50), {
        duration: duration + 1000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );

    opacity.value = withRepeat(
      withDelay(delay, withTiming(0.4, { duration: 2000 })),
      -1,
      true
    );

    scale.value = withRepeat(
      withTiming(1.5, { duration: 3000 }),
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
      opacity: opacity.value,
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
          backgroundColor: color 
        }, 
        animatedStyle
      ]} 
    />
  );
};

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    zIndex: -3,
    filter: 'blur(40px)',
  },
});
