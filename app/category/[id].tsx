import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSpring, FadeIn } from 'react-native-reanimated';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { usePurchases } from '@/hooks/use-purchases';
import { ENTITLEMENT_ID } from '@/lib/purchases';
import { TemplateCard } from '@/components/TemplateCard';

const { width } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const CARD_WIDTH = (width - 48 - 12) / 2;

// Removed local TemplateCard component, now using universal TemplateCard from components

export default function CategoryScreen() {
  const { id, name, color } = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTemplates() {
      setLoading(true);
      setError(null);
      const query = id
        ? supabase.from('templates').select('*').eq('category_id', id)
        : supabase.from('templates').select('*').eq('category', name);

      const { data, error: err } = await query;
      if (err) {
        setError('Failed to load templates. Please try again.');
      } else {
        setTemplates(data || []);
      }
      setLoading(false);
    }
    fetchTemplates();
  }, [id, name]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <View>
          <Text style={[styles.screenTitle, { color: theme.text }]}>{name || 'Templates'}</Text>
          {!loading && (
            <Text style={[styles.screenSubtitle, { color: theme.icon }]}>
              {templates.length} template{templates.length !== 1 ? 's' : ''} available
            </Text>
          )}
        </View>
      </Animated.View>

      {/* Category Color Bar */}
      <View style={[styles.colorBar, { backgroundColor: (color as string) || theme.accent }]} />


      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.icon }]}>Loading templates...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.danger} />
          <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          <Pressable
            style={[styles.retryBtn, { backgroundColor: theme.primary }]}
            onPress={() => setLoading(true)}
          >
            <Text style={[styles.retryText, { color: theme.background }]}>Retry</Text>
          </Pressable>
        </View>
      ) : templates.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="file-tray-outline" size={48} color={theme.icon} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Templates Yet</Text>
          <Text style={[styles.emptyDesc, { color: theme.icon }]}>Templates for this category will appear here once added by your admin.</Text>
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInUp.delay(index * 80).duration(500)} style={{ width: CARD_WIDTH }}>
              <TemplateCard template={item} theme={theme} colorScheme={colorScheme} width={CARD_WIDTH} />
            </Animated.View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  screenTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  screenSubtitle: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  colorBar: { height: 3, marginHorizontal: 20, borderRadius: 2, marginBottom: 12 },
  searchBox: { paddingHorizontal: 20, marginBottom: 20 },
  searchInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, gap: 8, height: 44 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500' },
  grid: { paddingHorizontal: 20, paddingBottom: 100 },
  row: { gap: 12, marginBottom: 12 },
  card: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  imageBox: { height: 120, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  badge: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 9, fontWeight: '900' },
  cardInfo: { padding: 14 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  cardMeta: { fontSize: 12, fontWeight: '500' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  loadingText: { fontSize: 15, fontWeight: '500' },
  errorState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  errorText: { fontSize: 15, fontWeight: '500', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, marginTop: 8 },
  retryText: { fontWeight: '700', fontSize: 14 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptyDesc: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 22 },
});
