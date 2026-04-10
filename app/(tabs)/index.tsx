import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, FlatList, Dimensions, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSpring, FadeIn } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { usePurchases } from '@/hooks/use-purchases';
import { ENTITLEMENT_ID } from '@/lib/purchases';

const { width } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TemplateCard = ({ template, theme }: any) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const { isPro } = usePurchases();

  // Badge Logic
  const isPremium = template.is_pro || template.pro;
  const isNew = template.is_new || template.new;
  const isLocked = isPremium && !isPro;

  return (
    <AnimatedPressable
      style={[styles.card, animatedStyle, { backgroundColor: theme.card, borderColor: theme.border, height: 180 }]}
      onPressIn={() => { scale.value = withSpring(0.95); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
      onPressOut={() => scale.value = withSpring(1)}
      onPress={() => router.push(`/template/${template.id}`)}
    >
      <View style={[styles.imagePlaceholder, { backgroundColor: theme.border }]}>
        <Ionicons name={isLocked ? "lock-closed" : "color-wand-outline"} size={24} color={isLocked ? theme.accent : theme.icon} />
        
        {/* Badges */}
        <View style={styles.badgeContainer}>
          {isPremium && (
            <View style={[styles.badge, { backgroundColor: theme.accent }]}>
              <Text style={styles.badgeText}>PRO</Text>
            </View>
          )}
          {isNew && (
            <View style={[styles.badge, { backgroundColor: '#34C759' }]}>
              <Text style={styles.badgeText}>NEW</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{template.title}</Text>
        <Text style={[styles.cardSub, { color: theme.icon }]} numberOfLines={1}>
          {isPremium ? 'Premium Asset' : `${template.requirements?.length || 0} assets needed`}
        </Text>
      </View>
    </AnimatedPressable>
  );
};

const SkeletonCard = ({ theme }: any) => (
  <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, height: 180, opacity: 0.5 }]}>
    <View style={[styles.imagePlaceholder, { backgroundColor: theme.border }]} />
    <View style={styles.cardInfo}>
      <View style={[styles.skeletonLine, { backgroundColor: theme.border, width: '70%' }]} />
      <View style={[styles.skeletonLine, { backgroundColor: theme.border, width: '45%', marginTop: 6 }]} />
    </View>
  </View>
);

export default function CreativeScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const { isPro, isLoading: subLoading, customerInfo } = usePurchases();

  const [categories, setCategories] = useState<any[]>([]);
  const [templatesByCategory, setTemplatesByCategory] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Credits logic
  const credits = isPro ? '∞' : '150';

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      // Fetch categories ordered by sort_order
      const { data: cats, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (catErr) throw catErr;

      // Fetch all templates
      const { data: tmpls, error: tmplErr } = await supabase
        .from('templates')
        .select('*');

      if (tmplErr) throw tmplErr;

      // Group templates by category_id
      const grouped: Record<string, any[]> = {};
      (tmpls || []).forEach((t: any) => {
        const key = t.category_id || t.category;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(t);
      });

      setCategories(cats || []);
      setTemplatesByCategory(grouped);
    } catch (e: any) {
      setError('Could not load templates. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* App Header */}
      <View style={styles.appHeader}>
        <Text style={[styles.appName, { color: theme.text }]}>Socify</Text>
        <Pressable 
          onPress={() => router.push('/paywall')}
          style={[styles.creditsPill, { backgroundColor: theme.card, borderColor: isPro ? theme.accent : theme.border }]}
        >
          <Ionicons name={isPro ? "star" : "flash"} size={14} color={isPro ? theme.accent : "#FF9F0A"} />
          <Text style={[styles.creditsText, { color: theme.text }]}>{credits}</Text>
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={18} color={theme.icon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search templates..."
            placeholderTextColor={theme.icon}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={theme.icon} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Banner */}
        {!search && (
          <Animated.View entering={FadeInUp.delay(100).duration(800)} style={styles.bannerWrapper}>
            <View style={[styles.bannerCard, { backgroundColor: theme.accent }]}>
              <View style={styles.bannerBadge}>
                <Text style={[styles.bannerBadgeText, { color: theme.accent }]}>Today's Hot 🔥</Text>
              </View>
              <Text style={styles.bannerTitle}>Autumn Collection Campaign</Text>
              <Text style={styles.bannerSubtitle}>Generate high-converting assets instantly.</Text>
            </View>
          </Animated.View>
        )}

        {error ? (
          <Animated.View entering={FadeIn} style={styles.errorState}>
            <Ionicons name="wifi-outline" size={40} color={theme.icon} />
            <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
            <Pressable style={[styles.retryBtn, { backgroundColor: theme.primary }]} onPress={fetchData}>
              <Text style={styles.retryBtnText}>Try Again</Text>
            </Pressable>
          </Animated.View>
        ) : loading ? (
          // Skeleton Loading State
          <View>
            {[1, 2].map((i) => (
              <View key={i} style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                  <View style={[styles.skeletonLine, { backgroundColor: theme.border, width: 140, height: 20 }]} />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                  {[1, 2].map((j) => (
                    <View key={j} style={styles.horizontalCardWrapper}>
                      <SkeletonCard theme={theme} />
                    </View>
                  ))}
                </ScrollView>
              </View>
            ))}
          </View>
        ) : (
          // Live Categories from Supabase
          categories.map((category, idx) => {
            const templates = templatesByCategory[category.id] || templatesByCategory[category.name] || [];
            if (templates.length === 0) return null;
            return (
              <Animated.View key={category.id} entering={FadeInUp.delay(200 + idx * 100).duration(600)} style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryTitleRow}>
                    <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                    <Text style={[styles.categoryTitle, { color: theme.text }]}>{category.name}</Text>
                  </View>
                  <Pressable
                    style={styles.seeAllBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push({
                        pathname: `/category/${category.id}`,
                        params: { name: category.name, color: category.color }
                      });
                    }}
                  >
                    <Text style={[styles.seeAllText, { color: category.color || theme.primary }]}>See all</Text>
                    <Ionicons name="chevron-forward" size={16} color={category.color || theme.primary} />
                  </Pressable>
                </View>

                <FlatList
                  data={templates}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                  snapToInterval={width * 0.46 + 16}
                  decelerationRate="fast"
                  renderItem={({ item }) => (
                    <View style={styles.horizontalCardWrapper}>
                      <TemplateCard template={item} theme={theme} />
                    </View>
                  )}
                />
              </Animated.View>
            );
          })
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  appHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  appName: { fontSize: 26, fontWeight: '900', letterSpacing: -1 },
  creditsPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, gap: 4 },
  creditsText: { fontSize: 14, fontWeight: '700' },
  searchContainer: { paddingHorizontal: 24, marginBottom: 24 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  scrollContent: { paddingVertical: 16, paddingBottom: 100 },
  bannerWrapper: { paddingHorizontal: 24, marginBottom: 32 },
  bannerCard: { padding: 24, borderRadius: 24, minHeight: 180, justifyContent: 'flex-end' },
  bannerBadge: { position: 'absolute', top: 20, left: 20, backgroundColor: '#ffffffdd', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  bannerBadgeText: { fontSize: 13, fontWeight: '800' },
  bannerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 6 },
  bannerSubtitle: { fontSize: 14, fontWeight: '500', color: '#fff', opacity: 0.9 },
  categorySection: { marginBottom: 32 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  categoryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  categoryTitle: { fontSize: 20, fontWeight: '800' },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 14, fontWeight: '600' },
  horizontalList: { paddingHorizontal: 24, gap: 16 },
  horizontalCardWrapper: { width: width * 0.46 },
  card: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', width: '100%' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  badgeContainer: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  cardInfo: { padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  cardSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  skeletonLine: { height: 14, borderRadius: 7 },
  errorState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  errorText: { fontSize: 15, fontWeight: '500', textAlign: 'center', paddingHorizontal: 40 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
