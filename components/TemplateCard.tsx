import React from 'react';
import { StyleSheet, View, Text, Pressable, Image, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { usePurchases } from '@/hooks/use-purchases';

const { width } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TemplateCardProps {
  template: {
    id: string;
    title: string;
    category?: string;
    thumbnail_url?: string;
    is_pro?: boolean;
    pro?: boolean;
    requirements?: any[];
  };
  theme: any;
  colorScheme: 'light' | 'dark';
  width?: number;
  height?: number;
}

export const TemplateCard = ({ template, theme, colorScheme, width: cardWidth = width * 0.46, height: cardHeight = 180 }: TemplateCardProps) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const { isPro } = usePurchases();

  const isPremium = template.is_pro || template.pro;
  const isLocked = isPremium && !isPro;
  
  // Use a fallback image if thumbnail_url is missing
  const defaultImage = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop';
  const imageUrl = template.thumbnail_url || defaultImage;

  return (
    <AnimatedPressable
      style={[styles.card, animatedStyle, { backgroundColor: theme.card, borderColor: theme.border, width: cardWidth, height: cardHeight }]}
      onPressIn={() => { scale.value = withSpring(0.96); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
      onPressOut={() => scale.value = withSpring(1)}
      onPress={() => router.push(`/template/${template.id}`)}
    >
      <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFillObject} />
      
      {/* Premium Badge */}
      {isPremium && (
        <View style={[styles.badgeContainer, { backgroundColor: isLocked ? 'rgba(0,0,0,0.6)' : theme.accent }]}>
          <Ionicons name={isLocked ? "lock-closed" : "star"} size={10} color="#FFF" />
          <Text style={styles.badgeText}>PRO</Text>
        </View>
      )}

      {/* Glassmorphism Title Bar */}
      <View style={styles.bottomContainer}>
        <BlurView 
            intensity={colorScheme === 'dark' ? 40 : 60} 
            tint={colorScheme} 
            style={styles.blurBanner}
        >
          <View style={styles.infoRow}>
            <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{template.title}</Text>
                <Text style={[styles.cardSub, { color: theme.icon }]} numberOfLines={1}>
                    {template.category || (isPremium ? 'Premium Studio' : 'Free Tool')}
                </Text>
            </View>
            <View style={[styles.arrowCircle, { backgroundColor: theme.text + '20' }]}>
                <Ionicons name="chevron-forward" size={12} color={theme.text} />
            </View>
          </View>
        </BlurView>
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: { 
    borderRadius: 24, 
    borderWidth: 1, 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 10,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    overflow: 'hidden',
  },
  blurBanner: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  cardSub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
    opacity: 0.8,
  },
  arrowCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
  }
});
