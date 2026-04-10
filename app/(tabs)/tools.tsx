import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, ZoomIn, FadeIn, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Tool definitions ──────────────────────────────────────────────────────
const TOOLS = [
  {
    id: 1, title: 'AI Copywriter', icon: 'create-outline', color: '#5E5CE6',
    desc: 'Generate high-converting ad copy, captions, and CTAs instantly.',
    placeholder: 'Describe your product or campaign goal...',
    outputPrefix: '✍️ Here\'s your copy:\n\n',
  },
  {
    id: 2, title: 'Image Enhancer', icon: 'color-wand-outline', color: '#FF375F',
    desc: 'Upscale, sharpen, and colour-correct your images using AI.',
    placeholder: 'Describe the image and desired enhancement...',
    outputPrefix: '🎨 Enhancement applied:\n\n',
  },
  {
    id: 3, title: 'Background Remover', icon: 'cut-outline', color: '#32ADE6',
    desc: 'Remove or swap backgrounds from product photos with one tap.',
    placeholder: 'Describe your subject and desired background...',
    outputPrefix: '✂️ Background removed! Result:\n\n',
  },
  {
    id: 4, title: 'Hashtag Generator', icon: 'hash-outline', color: '#FF9F0A',
    desc: 'Generate trending, niche-targeted hashtags for any platform.',
    placeholder: 'Describe your post or brand niche...',
    outputPrefix: '# Top hashtags for you:\n\n',
  },
  {
    id: 5, title: 'Caption Writer', icon: 'chatbubble-outline', color: '#34C759',
    desc: 'Write engaging captions optimised for Instagram, TikTok, and more.',
    placeholder: 'What\'s the post about? Tone: casual, formal, funny?',
    outputPrefix: '💬 Caption ready:\n\n',
  },
  {
    id: 6, title: 'SEO Optimizer', icon: 'trending-up-outline', color: '#E1306C',
    desc: 'Craft SEO-rich titles, meta descriptions, and page content.',
    placeholder: 'Enter your page topic or keywords...',
    outputPrefix: '📈 SEO-optimised content:\n\n',
  },
];

// Mock AI response generator
function generateMockOutput(tool: typeof TOOLS[0], input: string): string {
  const examples: Record<number, string> = {
    1: `"${input.slice(0, 30)}..." → Transform your brand with this powerhouse solution. Limited time — act now before it's gone. 🚀\n\nCTA: "Claim Your Spot Today →"\n\nAlt version:\n"Stop scrolling. This is the edge your competitors don't have."`,
    2: `Resolution boosted to 4K. Contrast +18%, Saturation +12%, Sharpness enhanced.\n\nSuggested export: PNG / WebP at 92% quality\nEstimated file size: ~2.1MB`,
    3: `Subject isolated successfully.\nEdges refined with AI masking.\n\nBackground options:\n• Transparent PNG ✓\n• Studio White\n• Gradient Mesh\n• Custom scene (describe below)`,
    4: `#${input.split(' ')[0]?.toLowerCase() ?? 'brand'}marketing #contentcreator #socialmediamarketing #digitalmarketing #instagramgrowth #reelsvirals #trendingnow #creatoreconomy #brandstrategy #visibilitytips`,
    5: `"${input.slice(0, 20)}..." ✨\n\nThis one hits different. Built for those who refuse to settle for average — tap the link in bio to see the full story. Save this for later! 💾\n\n#content #create #grow`,
    6: `Title: "${input.slice(0, 40)} | Socify Guide"\nMeta: "Discover everything about ${input.slice(0, 25)}. Expert tips, frameworks, and real results — all in one place."\n\nH1: The Ultimate Guide to ${input}\nH2: Why ${input.split(' ')[0]} Matters in 2026`,
  };
  return examples[tool.id] || `AI output for: "${input}"`;
}

// ─── Tool Modal ────────────────────────────────────────────────────────────
const ToolModal = ({ tool, visible, onClose, theme }: any) => {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = () => {
    if (!input.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOutput('');
    setLoading(true);
    setTimeout(() => {
      setOutput(tool.outputPrefix + generateMockOutput(tool, input.trim()));
      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1800);
  };

  const handleClose = () => {
    setInput('');
    setOutput('');
    setLoading(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>

          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={[styles.toolIconLg, { backgroundColor: tool?.color + '22' }]}>
              <Ionicons name={tool?.icon} size={26} color={tool?.color} />
            </View>
            <View style={styles.modalHeaderText}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{tool?.title}</Text>
              <Text style={[styles.modalDesc, { color: theme.icon }]}>{tool?.desc}</Text>
            </View>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Ionicons name="close-circle" size={28} color={theme.icon} />
            </Pressable>
          </View>

          <View style={[styles.modalDivider, { backgroundColor: theme.border }]} />

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            {/* Input */}
            <Text style={[styles.inputLabel, { color: theme.icon }]}>Your Prompt</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
              placeholder={tool?.placeholder}
              placeholderTextColor={theme.icon}
              value={input}
              onChangeText={setInput}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Generate Button */}
            <Pressable
              style={[styles.generateBtn, { backgroundColor: tool?.color, opacity: !input.trim() ? 0.5 : 1 }]}
              onPress={handleGenerate}
              disabled={!input.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={18} color="#fff" />
                  <Text style={styles.generateBtnText}>Generate</Text>
                </>
              )}
            </Pressable>

            {/* Output */}
            {(loading || output) && (
              <Animated.View entering={FadeIn.duration(400)} style={[styles.outputCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.outputHeader}>
                  <Text style={[styles.outputLabel, { color: tool?.color }]}>AI Output</Text>
                  {output && (
                    <Pressable hitSlop={10} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setOutput(''); setInput(''); }}>
                      <Ionicons name="refresh-outline" size={18} color={theme.icon} />
                    </Pressable>
                  )}
                </View>
                {loading ? (
                  <View style={styles.loadingOutput}>
                    <ActivityIndicator color={tool?.color} />
                    <Text style={[styles.loadingText, { color: theme.icon }]}>AI is thinking...</Text>
                  </View>
                ) : (
                  <Text style={[styles.outputText, { color: theme.text }]}>{output}</Text>
                )}
              </Animated.View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Tool Card ─────────────────────────────────────────────────────────────
const ToolCard = ({ tool, index, theme, onPress }: any) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={ZoomIn.delay(300 + index * 80).duration(500).springify()} style={styles.gridItem}>
      <AnimatedPressable
        style={[styles.toolCard, animatedStyle, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPressIn={() => { scale.value = withSpring(0.92); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        onPressOut={() => scale.value = withSpring(1)}
        onPress={() => onPress(tool)}
      >
        <View style={[styles.iconWrapper, { backgroundColor: tool.color + '18' }]}>
          <Ionicons name={tool.icon as any} size={26} color={tool.color} />
        </View>
        <Text style={[styles.toolTitle, { color: theme.text }]}>{tool.title}</Text>
        <Text style={[styles.toolDesc, { color: theme.icon }]} numberOfLines={2}>{tool.desc}</Text>
        <View style={[styles.toolArrow, { backgroundColor: tool.color + '18' }]}>
          <Ionicons name="arrow-forward" size={14} color={tool.color} />
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function ToolsScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const [selectedTool, setSelectedTool] = useState<typeof TOOLS[0] | null>(null);
  const [search, setSearch] = useState('');

  const filteredTools = TOOLS.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.desc.toLowerCase().includes(search.toLowerCase())
  );

  const scaleHero = useSharedValue(1);
  const heroStyle = useAnimatedStyle(() => ({ transform: [{ scale: scaleHero.value }] }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ToolModal
        tool={selectedTool}
        visible={!!selectedTool}
        onClose={() => setSelectedTool(null)}
        theme={theme}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(100).duration(800)} style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Suite</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>Powerful AI tools for modern creators</Text>
        </Animated.View>

        {/* Search Bar */}
        <Animated.View entering={FadeInUp.delay(150).duration(600)} style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={18} color={theme.icon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search tools..."
            placeholderTextColor={theme.icon}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.icon} />
            </Pressable>
          )}
        </Animated.View>

        {/* Hero Tool: AI Chat */}
        <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.heroSection}>
          <AnimatedPressable
            style={[styles.heroCard, heroStyle, { backgroundColor: theme.accent ?? '#5E5CE6' }]}
            onPressIn={() => { scaleHero.value = withSpring(0.96); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            onPressOut={() => scaleHero.value = withSpring(1)}
            onPress={() => router.push('/ai-chat')}
          >
            <View style={styles.heroHeaderRow}>
              <Ionicons name="sparkles" size={32} color="#fff" />
              <View style={styles.heroBadge}>
                <Text style={[styles.heroBadgeText, { color: theme.accent ?? '#5E5CE6' }]}>Generative AI</Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>Imagine it. Create it.</Text>
            <Text style={styles.heroSubtitle}>Describe your imagination to create brand assets from scratch.</Text>
            <View style={styles.heroFooter}>
              <Ionicons name="arrow-forward-circle" size={28} color="#ffffffcc" />
            </View>
          </AnimatedPressable>
        </Animated.View>

        {/* Tool Grid */}
        {filteredTools.length > 0 ? (
          <View style={styles.grid}>
            {filteredTools.map((tool, i) => (
              <ToolCard key={tool.id} tool={tool} index={i} theme={theme} onPress={setSelectedTool} />
            ))}
          </View>
        ) : (
          <Animated.View entering={FadeIn} style={styles.emptySearch}>
            <Ionicons name="search-outline" size={40} color={theme.icon} />
            <Text style={[styles.emptySearchText, { color: theme.icon }]}>No tools found for "{search}"</Text>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingVertical: 24, paddingHorizontal: 20, paddingBottom: 100 },
  header: { marginBottom: 20, marginTop: 10 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 16, fontWeight: '500' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 24 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  heroSection: { marginBottom: 24 },
  heroCard: { padding: 24, borderRadius: 28, minHeight: 200, justifyContent: 'space-between' },
  heroHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  heroBadge: { backgroundColor: '#ffffffff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  heroBadgeText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  heroTitle: { fontSize: 28, fontWeight: '800', marginBottom: 8, letterSpacing: -0.5, color: '#fff' },
  heroSubtitle: { fontSize: 15, fontWeight: '500', lineHeight: 22, color: '#ffffffcc' },
  heroFooter: { alignItems: 'flex-end', marginTop: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  gridItem: { width: '47%' },
  toolCard: { padding: 18, borderRadius: 24, borderWidth: 1, minHeight: 160, justifyContent: 'space-between' },
  iconWrapper: { padding: 12, borderRadius: 16, marginBottom: 12, alignSelf: 'flex-start' },
  toolTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  toolDesc: { fontSize: 12, fontWeight: '500', lineHeight: 17 },
  toolArrow: { alignSelf: 'flex-end', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  emptySearch: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptySearchText: { fontSize: 15, fontWeight: '500' },

  // Modal styles
  modalContainer: { flex: 1, paddingTop: 8 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16 },
  toolIconLg: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  modalHeaderText: { flex: 1 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalDesc: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  modalDivider: { height: 1, marginHorizontal: 20 },
  modalScrollContent: { padding: 20, gap: 16, paddingBottom: 60 },
  inputLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { minHeight: 120, padding: 16, borderRadius: 20, borderWidth: 1, fontSize: 15, fontWeight: '500', lineHeight: 22 },
  generateBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 56, borderRadius: 28, gap: 10 },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  outputCard: { borderRadius: 20, borderWidth: 1, padding: 20 },
  outputHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  outputLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  outputText: { fontSize: 15, lineHeight: 24, fontWeight: '500' },
  loadingOutput: { alignItems: 'center', paddingVertical: 20, gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '500' },
});
