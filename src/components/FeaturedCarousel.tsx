import React from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.75; 
const SPACER_WIDTH = (width - ITEM_WIDTH) / 2;

const CAROUSEL_DATA = [
  {
    id: 'carousel_1',
    title: 'Visual Storytelling',
    subtitle: 'Unlock next-generation AI visuals for your brand',
    image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1000',
    badge: 'FEATURED',
    targetRoute: '/category/marketing' // Mock route
  },
  {
    id: 'carousel_2',
    title: 'Summer Collection',
    subtitle: 'Bright, vibrant aesthetics for seasonal campaigns',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000',
    badge: 'TRENDING',
    targetRoute: '/category/seasonal'
  },
  {
    id: 'carousel_3',
    title: 'Product Masterclass',
    subtitle: 'Command attention with a sleek reveal',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000',
    badge: 'NEW TEMPLATE',
    targetRoute: '/category/product'
  }
];

const CarouselItem = ({ item, index, scrollX }: { item: any, index: number, scrollX: Animated.SharedValue<number> }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * ITEM_WIDTH,
      index * ITEM_WIDTH,
      (index + 1) * ITEM_WIDTH,
    ];

    const scale = interpolate(scrollX.value, inputRange, [0.85, 1, 0.85], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.5, 1, 0.5], Extrapolation.CLAMP);
    
    // Smooth 3D cylinder bending
    const rotateY = interpolate(scrollX.value, inputRange, [25, 0, -25], Extrapolation.CLAMP);

    return {
      transform: [
        { perspective: 800 },
        { scale },
        { rotateY: `${rotateY}deg` }
      ],
      opacity,
    };
  });

  return (
    <Animated.View style={[{ width: ITEM_WIDTH }, animatedStyle]}>
      <Pressable style={styles.cardContainer} onPress={() => { /* Navigate or open template */ }}>
        <Image 
          source={{ uri: item.image }} 
          style={StyleSheet.absoluteFillObject} 
          contentFit="cover" 
        />
        
        <View style={styles.badgeContainer}>
          <BlurView intensity={60} tint="dark" style={styles.badgeBlur}>
            <Ionicons name="sparkles" size={12} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.badgeText}>{item.badge}</Text>
          </BlurView>
        </View>
        
        <View style={styles.glassWrapper}>
          <BlurView intensity={40} tint="dark" style={styles.glassContent}>
            <Text style={styles.titleText}>{item.title}</Text>
            <Text style={styles.subtitleText}>{item.subtitle}</Text>
          </BlurView>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export const FeaturedCarousel = () => {
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  return (
    <View style={styles.container}>
      <Animated.FlatList
        data={CAROUSEL_DATA}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        bounces={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingHorizontal: SPACER_WIDTH,
        }}
        renderItem={({ item, index }) => (
          <CarouselItem item={item} index={index} scrollX={scrollX} />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 220,
    marginBottom: 32,
  },
  cardContainer: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#000',
  },
  badgeContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 10,
  },
  badgeBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  glassWrapper: {
    width: '100%',
    overflow: 'hidden',
  },
  glassContent: {
    padding: 20,
    borderTopWidth: 0,
  },
  titleText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
});
