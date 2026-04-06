import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, ZoomIn, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ToolCard = ({ tool, index, theme }: any) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={ZoomIn.delay(300 + index * 100).duration(500).springify()} style={styles.gridItem}>
      <AnimatedPressable 
        style={[styles.toolCard, animatedStyle, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPressIn={() => { scale.value = withSpring(0.92); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        onPressOut={() => scale.value = withSpring(1)}
      >
        <View style={[styles.iconWrapper, { backgroundColor: tool.color + '22' }]}>
          <Ionicons name={tool.icon as any} size={28} color={tool.color} />
        </View>
        <Text style={[styles.toolTitle, { color: theme.text }]}>{tool.title}</Text>
      </AnimatedPressable>
    </Animated.View>
  );
};

export default function ToolsScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

  // Specific AI Marketing Tools requested
  const tools = [
    { id: 1, title: 'AI Copywriter', icon: 'create-outline', color: '#5E5CE6' },
    { id: 2, title: 'Image Enhancer', icon: 'color-wand-outline', color: '#FF375F' },
    { id: 3, title: 'Background Remover', icon: 'cut-outline', color: '#32ADE6' },
    { id: 4, title: 'SEO Optimizer', icon: 'trending-up-outline', color: '#FF9F0A' },
  ];

  const scaleHero = useSharedValue(1);
  const heroStyle = useAnimatedStyle(() => ({ transform: [{ scale: scaleHero.value }] }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(100).duration(800)} style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Suite</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>Powerful tools for modern creators</Text>
        </Animated.View>

        {/* Hero Tool: Prompt Generator */}
        <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.heroSection}>
           <AnimatedPressable 
            style={[styles.heroCard, heroStyle, { backgroundColor: theme.primary }]}
            onPressIn={() => { scaleHero.value = withSpring(0.96); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            onPressOut={() => scaleHero.value = withSpring(1)}
            onPress={() => router.push('/ai-chat')}
           >
             <View style={styles.heroHeaderRow}>
               <Ionicons name="sparkles" size={32} color={theme.background} />
               <View style={styles.heroBadge}>
                 <Text style={[styles.heroBadgeText, { color: theme.primary }]}>Generative AI</Text>
               </View>
             </View>
             <Text style={[styles.heroTitle, { color: theme.background }]}>Imagine it. Create it.</Text>
             <Text style={[styles.heroSubtitle, { color: theme.background + 'dd' }]}>Describe your imagination to create brand assets from scratch.</Text>
           </AnimatedPressable>
        </Animated.View>

        {/* Specific Sub-tools mapped to user requirements */}
        <View style={styles.grid}>
          {tools.map((tool, i) => (
            <ToolCard key={tool.id} tool={tool} index={i} theme={theme} />
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingVertical: 24, paddingHorizontal: 24, paddingBottom: 100 },
  header: { marginBottom: 32, marginTop: 10 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 16, fontWeight: '500' },

  heroSection: { marginBottom: 24 },
  heroCard: {
    padding: 24,
    borderRadius: 24,
    minHeight: 200,
    justifyContent: 'space-between',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  heroBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  heroBadgeText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  heroTitle: { fontSize: 28, fontWeight: '800', marginBottom: 8, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 15, fontWeight: '500', lineHeight: 22 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gridItem: { width: '47%' },
  toolCard: { padding: 20, borderRadius: 24, borderWidth: 1, alignItems: 'flex-start', minHeight: 140, justifyContent: 'space-between' },
  iconWrapper: { padding: 12, borderRadius: 16, marginBottom: 16 },
  toolTitle: { fontSize: 16, fontWeight: '600' },
});
