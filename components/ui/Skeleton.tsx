import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue, LayoutChangeEvent } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  Easing,
  interpolate
} from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
  variant?: 'circle' | 'rect' | 'text';
}

export const Skeleton = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 8, 
  style,
  variant = 'rect' 
}: SkeletonProps) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const [layoutWidth, setLayoutWidth] = useState(0);
  
  const shimmerValue = useSharedValue(0);

  useEffect(() => {
    shimmerValue.value = withRepeat(
      withTiming(1, { 
        duration: 1500, 
        easing: Easing.linear
      }), 
      -1, 
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerValue.value,
      [0, 1],
      [-layoutWidth || 200, layoutWidth || 200]
    );
    
    return {
      transform: [{ translateX }],
    };
  });

  const onLayout = (event: LayoutChangeEvent) => {
    setLayoutWidth(event.nativeEvent.layout.width);
  };

  const finalBorderRadius = variant === 'circle' ? (typeof height === 'number' ? height / 2 : 999) : borderRadius;

  return (
    <View 
      onLayout={onLayout}
      style={[
        styles.skeleton, 
        { 
          width, 
          height: variant === 'text' ? 14 : height, 
          borderRadius: finalBorderRadius,
          backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', 
        }, 
        style
      ]}
    >
      <Animated.View 
        style={[
          styles.shimmer, 
          { 
            backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            width: '100%',
          }, 
          shimmerStyle
        ]} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  shimmer: {
    height: '100%',
  },
});
