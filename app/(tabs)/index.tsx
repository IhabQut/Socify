import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, FlatList, Dimensions, ActivityIndicator, TextInput, Alert } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSpring, FadeIn, withRepeat, withTiming } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { usePurchases } from '@/hooks/use-purchases';
import { restorePurchases, ENTITLEMENT_ID } from '@/lib/purchases';
import { StorageService } from '@/services/storageService';
import { TemplateCard } from '@/components/TemplateCard';
import { FeaturedCarousel } from '@/components/FeaturedCarousel';
import { BlurView } from 'expo-blur';
import { Skeleton } from '@/components/ui/Skeleton';

const { width } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Removed local TemplateCard component, now using universal TemplateCard from components

const DashboardSkeleton = ({ theme }: any) => (
  <View style={styles.categorySection}>
    <View style={styles.categoryHeader}>
      <Skeleton width={140} height={20} borderRadius={6} />
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
      {[1, 2, 3].map((j) => (
        <View key={j} style={styles.horizontalCardWrapper}>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, height: 180 }]}>
            <Skeleton width="100%" height={120} borderRadius={0} />
            <View style={styles.cardInfo}>
              <Skeleton width="70%" height={12} style={{ marginBottom: 6 }} />
              <Skeleton width="45%" height={10} />
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  </View>
);

export default function CreativeScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const { isPro, isLoading: subLoading, customerInfo } = usePurchases();
  const { profile, isGuest } = useAuth();

  const [categories, setCategories] = useState<any[]>([]);
  const [templatesByCategory, setTemplatesByCategory] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // Logo Animation
  const logoPulse = useSharedValue(0);
  useEffect(() => {
    logoPulse.value = withRepeat(
      withTiming(1, { duration: 2500, easing: withSpring(1) }),
      -1,
      true
    );
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + logoPulse.value * 0.08 }, { rotate: `${logoPulse.value * 5}deg` }],
  }));

  // Credits logic
  const creditsDisplay = profile?.credits ?? '0';

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Execute database search
  useEffect(() => {
    if (debouncedSearch.trim().length > 0) {
      performSearch();
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [debouncedSearch]);

  async function performSearch() {
    setIsSearching(true);
    try {
      const { data, error: searchErr } = await supabase
        .from('templates')
        .select('*')
        .ilike('title', `%${debouncedSearch}%`)
        .limit(20);
      
      if (searchErr) throw searchErr;
      setSearchResults(data || []);
    } catch (e) {
      console.error("Search failed", e);
    } finally {
      setIsSearching(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [retryCount]);

  async function fetchData() {
    setLoading(true);
    setError(null);

    // Fetch categories — non-fatal if table doesn't exist yet
    try {
      const { data: cats, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (!catErr) {
        setCategories(cats || []);
      } else {
        console.warn('[fetchData] categories table not available:', catErr.message);
      }
    } catch (e) {
      console.warn('[fetchData] categories fetch failed silently:', e);
    }

    // Fetch templates — this is the critical data path
    try {
      const { data: tmpls, error: tmplErr } = await supabase
        .from('templates')
        .select('*')
        .limit(50);

      if (tmplErr) throw tmplErr;

      // Group templates by category_id OR category string
      const grouped: Record<string, any[]> = {};
      (tmpls || []).forEach((t: any) => {
        const key = t.category_id || t.category || 'Uncategorized';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(t);
      });

      setTemplatesByCategory(grouped);
    } catch (e: any) {
      console.error('[fetchData] templates error:', e?.message || e);
      setError('Could not load templates. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* App Header */}
      <View style={styles.appHeader}>
        <View style={styles.headerLeft}>
          <Animated.View style={animatedLogoStyle}>
            <Image 
              source={require('../../assets/images/logo.png')} 
              style={{ width: 32, height: 32 }} 
              resizeMode="contain" 
            />
          </Animated.View>
          <Text style={[styles.appName, { color: theme.text }]}>Socify</Text>
        </View>
        <Pressable 
          onPress={() => router.push('/paywall')}
          style={[styles.creditsPill, { backgroundColor: theme.card, borderColor: isPro ? theme.accent : (isGuest ? theme.warning : theme.border) }]}
        >
          <Ionicons name={isPro ? "star" : "flash"} size={14} color={isPro ? theme.accent : theme.warning} />
          <Text style={[styles.creditsText, { color: theme.text }]}>{creditsDisplay}</Text>
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

        {/* Banner Section */}
        {!search && (
          <FeaturedCarousel />
        )}

        {error ? (
          <Animated.View entering={FadeIn} style={styles.errorState}>
            <Ionicons name="wifi-outline" size={40} color={theme.icon} />
            <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
            <Pressable
              style={[styles.retryBtn, { backgroundColor: theme.primary }]}
              onPress={() => setRetryCount(c => c + 1)}
            >
              <Text style={[styles.retryBtnText, { color: theme.background }]}>Retry Connection</Text>
            </Pressable>
          </Animated.View>
        ) : search.length > 0 ? (
          // Search Results View
          <Animated.View entering={FadeIn.duration(400)} style={styles.searchResultsContainer}>
            <View style={styles.categoryHeader}>
              <Text style={[styles.categoryTitle, { color: theme.text }]}>
                {isSearching ? 'Searching...' : `Found ${searchResults.length} results`}
              </Text>
            </View>
            
            {isSearching ? (
              <View style={styles.searchGrid}>
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={styles.gridCardWrapper}>
                    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, height: 180 }]}>
                      <Skeleton width="100%" height={120} borderRadius={0} />
                      <View style={styles.cardInfo}>
                        <Skeleton width="70%" height={12} style={{ marginBottom: 6 }} />
                        <Skeleton width="45%" height={10} />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : searchResults.length > 0 ? (
              <View style={styles.searchGrid}>
                {searchResults.map((item) => (
                  <View key={item.id} style={styles.gridCardWrapper}>
                    <TemplateCard template={item} theme={theme} colorScheme={colorScheme} width={width * 0.44} />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptySearch}>
                <Ionicons name="search-outline" size={40} color={theme.icon} />
                <Text style={[styles.emptySearchText, { color: theme.icon }]}>
                  No templates found for "{search}"
                </Text>
              </View>
            )}
          </Animated.View>
        ) : loading ? (
          // Skeleton Loading State
          <View>
            <DashboardSkeleton theme={theme} />
            <DashboardSkeleton theme={theme} />
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
                      <TemplateCard template={item} theme={theme} colorScheme={colorScheme} />
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appName: { fontSize: 26, fontWeight: '900', letterSpacing: -1 },
  creditsPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, gap: 4 },
  creditsText: { fontSize: 14, fontWeight: '700' },
  searchContainer: { paddingHorizontal: 24, marginBottom: 24 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  scrollContent: { paddingVertical: 16, paddingBottom: 100 },
  bannerWrapper: { paddingHorizontal: 24, marginBottom: 32 },
  bannerCard: { borderRadius: 28, minHeight: 180, overflow: 'hidden', justifyContent: 'flex-end' },
  bannerBadge: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, zIndex: 10 },
  bannerBadgeText: { fontSize: 11, fontWeight: '900', color: '#FFF', letterSpacing: 0.5 },
  bannerGlassWrapper: { width: '100%', overflow: 'hidden' },
  bannerBlur: { padding: 18, borderTopWidth: 0 },
  bannerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 },
  bannerSubtitle: { fontSize: 13, fontWeight: '600', opacity: 0.9 },
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
  badge: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '900' },
  cardInfo: { padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  cardSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  skeletonLine: { height: 14, borderRadius: 7 },
  errorState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  errorText: { fontSize: 15, fontWeight: '500', textAlign: 'center', paddingHorizontal: 40 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, marginTop: 8 },
  retryBtnText: { fontWeight: '700', fontSize: 14 },
  searchResultsContainer: { flex: 1 },
  searchGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 16 },
  gridCardWrapper: { width: width * 0.44 },
  searchLoading: { paddingVertical: 40, alignItems: 'center' },
  emptySearch: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptySearchText: { fontSize: 15, fontWeight: '500' },
});
