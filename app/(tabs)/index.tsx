import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeInRight, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CATEGORIES_DATA = [
  {
    id: 'c1',
    title: 'Instagram Posts',
    templates: [
      { id: '1', title: 'Black Friday', height: 180 },
      { id: '2', title: 'Cafe Promo', height: 180 },
      { id: '3', title: 'Tech Gadget', height: 180 },
    ]
  },
  {
    id: 'c2',
    title: 'Facebook Ads',
    templates: [
      { id: '4', title: 'Real Estate App', height: 140 },
      { id: '5', title: 'Dental Clinic', height: 140 },
    ]
  },
  {
    id: 'c3',
    title: 'Stories & Reels',
    templates: [
      { id: '6', title: 'Vlog Intro', height: 240 },
      { id: '7', title: 'Daily Quote', height: 240 },
    ]
  }
];

// Reusable card template component
const TemplateCard = ({ template, theme }: any) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable 
      style={[styles.card, animatedStyle, { backgroundColor: theme.card, borderColor: theme.border, height: template.height }]}
      onPressIn={() => { scale.value = withSpring(0.95); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
      onPressOut={() => scale.value = withSpring(1)}
    >
      <View style={[styles.imagePlaceholder, { backgroundColor: theme.border }]} />
      <View style={styles.cardInfo}>
        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{template.title}</Text>
      </View>
    </AnimatedPressable>
  );
};

export default function CreativeScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* App Header */}
      <View style={styles.appHeader}>
        <Text style={[styles.appName, { color: theme.text }]}>Socify</Text>
        <View style={[styles.creditsPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="flash" size={14} color="#FF9F0A" />
          <Text style={[styles.creditsText, { color: theme.text }]}>150</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Special Banner */}
        <Animated.View entering={FadeInUp.delay(100).duration(800)} style={styles.bannerWrapper}>
          <View style={[styles.bannerCard, { backgroundColor: theme.primary }]}>
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>Today's Hot 🔥</Text>
            </View>
            <Text style={styles.bannerTitle}>Autumn Collection Campaign</Text>
            <Text style={styles.bannerSubtitle}>Generate high-converting assets instantly.</Text>
          </View>
        </Animated.View>

        {/* Dynamic Categories */}
        {CATEGORIES_DATA.map((category, idx) => (
          <Animated.View key={category.id} entering={FadeInUp.delay(200 + idx * 100).duration(600)} style={styles.categorySection}>
            
            {/* Category Header */}
            <View style={styles.categoryHeader}>
              <Text style={[styles.categoryTitle, { color: theme.text }]}>{category.title}</Text>
              <Pressable style={styles.seeAllBtn}>
                <Text style={[styles.seeAllText, { color: theme.icon }]}>See all</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.icon} />
              </Pressable>
            </View>

            {/* Horizontal Templates */}
            <FlatList
              data={category.templates}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              snapToInterval={width * 0.45 + 16}
              decelerationRate="fast"
              renderItem={({ item, index }) => (
                <View style={styles.horizontalCardWrapper}>
                  <TemplateCard template={item} theme={theme} />
                </View>
              )}
            />
          </Animated.View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  appName: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -1,
  },
  creditsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  creditsText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: { paddingVertical: 16, paddingBottom: 100 },
  bannerWrapper: { paddingHorizontal: 24, marginBottom: 32 },
  bannerCard: {
    padding: 24,
    borderRadius: 24,
    minHeight: 180,
    justifyContent: 'flex-end',
  },
  bannerBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: '#ffffffdd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  bannerBadgeText: { fontSize: 13, fontWeight: '800', color: '#111' },
  bannerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 6 },
  bannerSubtitle: { fontSize: 14, fontWeight: '500', color: '#fff', opacity: 0.9 },
  
  categorySection: { marginBottom: 32 },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  categoryTitle: { fontSize: 20, fontWeight: '800' },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 14, fontWeight: '600' },
  horizontalList: { paddingHorizontal: 24, gap: 16 },
  horizontalCardWrapper: { width: width * 0.45 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  imagePlaceholder: { flex: 1 },
  cardInfo: { padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700' },
});
