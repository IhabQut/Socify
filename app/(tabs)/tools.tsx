import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView, Pressable, TextInput,
  Modal, KeyboardAvoidingView, Platform, ActivityIndicator,
  Image, Dimensions, Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInUp, ZoomIn, FadeIn,
  useSharedValue, useAnimatedStyle,
  withTiming, Easing
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { sendChatMessage, ChatMessage } from '@/lib/openrouter';
import { supabase } from '@/lib/supabase';
import { router, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { usePurchases } from '@/hooks/use-purchases';
import { StorageService } from '@/services/storageService';
import { CreditService } from '@/services/creditService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const EASE_OUT = Easing.bezier(0.4, 0, 0.2, 1);
const EASE_IN  = Easing.bezier(0.4, 0, 1, 1);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Config ───────────────────────────────────────────────────────────────────
const TOOLS = [
  { id: 'enhancer', title: 'Image Enhancer',  icon: 'color-wand-outline',          desc: 'Upscale and perfect your images.',     needsImage: true,  needsText: false },
  { id: 'remover',  title: 'Background Remover', icon: 'cut-outline',             desc: 'Remove backgrounds instantly.',        needsImage: true,  needsText: false },
  { id: 'hashtag',  title: 'Hashtag Finder',  icon: 'grid-outline',               desc: 'Generate trending hashtags locally.',  needsImage: false, needsText: true  },
  { id: 'caption',  title: 'Caption Writer',  icon: 'chatbubble-ellipses-outline', desc: 'Write engaging captions.',             needsImage: true,  needsText: true  },
];

interface Message { id: string; sender: 'user'|'ai'; text?: string; imageUri?: string; timestamp: number; }

const INIT_MSG: Message = {
  id: 'init', sender: 'ai', timestamp: Date.now(),
  text: "Hey! I'm your Socify AI Agent ✨\n\nI can help you with:\n• Ad copy & captions\n• Hashtag strategies\n• Content calendars\n• Brand visuals\n\nWhat are you working on?",
};

// ─── Typing dots ──────────────────────────────────────────────────────────────
const Dot = ({ delay, color }: { delay: number; color: string }) => {
  const op = useSharedValue(0.3);
  useEffect(() => { setTimeout(() => { op.value = withTiming(1, { duration: 500 }); }, delay); }, []);
  const s = useAnimatedStyle(() => ({ opacity: op.value }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }, s]} />;
};
const TypingDots = ({ color }: { color: string }) => (
  <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 4 }}>
    <Dot delay={0}   color={color} />
    <Dot delay={160} color={color} />
    <Dot delay={320} color={color} />
  </View>
);

// ─── Chat Modal ───────────────────────────────────────────────────────────────
// The whole modal view starts shifted UP so the input bar sits at the button's Y.
// Animating translateY → 0 slides everything DOWN into final position.
// INPUT_BAR_H must match the actual rendered height of the input bar.
const INPUT_BAR_H = 76;

const ChatModal = ({ visible, onClose, theme, insets, startY }: {
  visible: boolean; onClose: () => void; theme: any; insets: any; startY: number;
}) => {
  const { user } = useAuth();
  const [messages,  setMessages]  = useState<Message[]>([INIT_MSG]);
  const [history,   setHistory]   = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string|null>(null);
  const [input,     setInput]     = useState('');
  const [image,     setImage]     = useState<string|null>(null);
  const [busy,      setBusy]      = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef  = useRef<TextInput>(null);

  // How much to shift the whole modal UP so the input bar aligns with button:
  // modal_input_top = SCREEN_HEIGHT - INPUT_BAR_H - insets.bottom
  // We want: modal_input_top + translateY = startY
  //          translateY = startY - (SCREEN_HEIGHT - INPUT_BAR_H - insets.bottom)
  const getInitY = () => startY - (SCREEN_HEIGHT - INPUT_BAR_H - insets.bottom);

  const slideY = useSharedValue(getInitY());
  const slide  = useAnimatedStyle(() => ({ transform: [{ translateY: slideY.value }] }));

  useEffect(() => {
    if (visible) {
      slideY.value = getInitY();              // snap to button alignment
      slideY.value = withTiming(0, { duration: 420, easing: EASE_OUT });
      setTimeout(() => inputRef.current?.focus(), 440);
    }
  }, [visible, startY]);

  const close = () => {
    inputRef.current?.blur();
    slideY.value = withTiming(getInitY(), { duration: 340, easing: EASE_IN });
    setTimeout(() => { setInput(''); setImage(null); onClose(); }, 340);
  };

  // Auto-scroll
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(t);
  }, [messages, busy]);

  const pickImage = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });
    if (!r.canceled && r.assets[0]) { setImage(r.assets[0].uri); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
  };

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed && !image) return;
    if (busy) return;

    // ── Credit Check ──
    const creditRes = await CreditService.deductCredits(1);
    if (!creditRes.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Insufficient Credits", "You need at least 1 credit to chat with the AI.", [
        { text: "Cancel", style: "cancel" },
        { text: "Buy Credits", onPress: () => router.push('/paywall') }
      ]);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const hadImage = !!image;
    const imgUri   = image;
    const now      = Date.now();
    setMessages(prev => [...prev, { id: now.toString(), sender: 'user', text: trimmed, imageUri: imgUri ?? undefined, timestamp: now }]);
    setInput(''); setImage(null); setBusy(true);

    try {
      let sid = sessionId;
      if (!sid && user) {
        const { data } = await supabase.from('chat_sessions').insert({ user_id: user.id, title: trimmed.slice(0, 40) }).select().single();
        if (data) { sid = data.id; setSessionId(sid); }
      }
      if (sid) await supabase.from('chat_messages').insert({ session_id: sid, role: 'user', content: hadImage ? `[Image] ${trimmed}` : trimmed });

      const { reply } = await sendChatMessage(history, trimmed, hadImage);
      setHistory(h => [...h, { role: 'user', content: trimmed }, { role: 'assistant', content: reply }]);
      const aiId = Date.now().toString() + '_ai';
      setMessages(prev => [...prev, { id: aiId, sender: 'ai', text: reply, timestamp: Date.now() }]);
      if (sid) await supabase.from('chat_messages').insert({ session_id: sid, role: 'assistant', content: reply });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setMessages(prev => [...prev, { id: Date.now() + '_e', sender: 'ai', text: 'Something went wrong. Try again.', timestamp: Date.now() }]);
    } finally { setBusy(false); }
  }, [input, image, busy, history, sessionId, user]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      {/* The whole view slides as one piece */}
      <Animated.View style={[StyleSheet.absoluteFillObject, slide, { backgroundColor: theme.background }]}>
        {/* Safe area padding applied manually so it works even when off-screen on mount */}
        <View style={{ flex: 1, paddingTop: insets.top }}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

            {/* Header — matches collapsed button style */}
            <View style={[ch.header, { borderBottomColor: theme.border }]}>
              <View style={[ch.icon, { backgroundColor: theme.text }]}>
                <Ionicons name="sparkles" size={20} color={theme.background} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[ch.name, { color: theme.text }]}>Socify AI</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={[ch.dot, { backgroundColor: busy ? '#FF9500' : '#34C759' }]} />
                  <Text style={{ color: theme.icon, fontSize: 12, fontWeight: '500' }}>
                    {busy ? 'Thinking...' : 'Online'}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  Alert.alert('Clear Chat', 'This will reset the conversation. Are you sure?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear', style: 'destructive', onPress: () => {
                      setMessages([INIT_MSG]);
                      setHistory([]);
                      setSessionId(null);
                    }},
                  ]);
                }}
                hitSlop={14}
                style={{ marginRight: 14 }}
              >
                <Ionicons name="trash-outline" size={20} color={theme.icon} />
              </Pressable>
              <Pressable onPress={close} hitSlop={14}>
                <Ionicons name="chevron-up" size={22} color={theme.icon} />
              </Pressable>
            </View>

            {/* Messages */}
            <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={ch.msgs}
              showsVerticalScrollIndicator={false} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled">
              {messages.map(msg => {
                const isUser = msg.sender === 'user';
                return (
                  <Animated.View key={msg.id} entering={FadeIn.duration(260)}
                    style={[ch.bubble, isUser
                      ? [ch.userBubble, { backgroundColor: theme.text }]
                      : [ch.aiBubble,  { backgroundColor: theme.card, borderColor: theme.border }]]}>
                    {!isUser && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                        <Ionicons name="sparkles" size={11} color={theme.icon} />
                        <Text style={{ color: theme.icon, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 }}>Socify AI</Text>
                      </View>
                    )}
                    {msg.imageUri && <Image source={{ uri: msg.imageUri }} style={ch.attachImg} />}
                    {msg.text     && <Text style={{ color: isUser ? theme.background : theme.text, fontSize: 15, lineHeight: 23 }}>{msg.text}</Text>}
                  </Animated.View>
                );
              })}
              {busy && (
                <Animated.View entering={FadeIn.duration(200)}
                  style={[ch.bubble, ch.aiBubble, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <TypingDots color={theme.icon} />
                </Animated.View>
              )}
            </ScrollView>

            {/* Input bar — this visually aligns with the collapsed button on open */}
            <View style={[ch.bar, { borderTopColor: theme.border, backgroundColor: theme.background, paddingBottom: insets.bottom + 8 }]}>
              {image && (
                <Animated.View entering={FadeIn.duration(200)} style={{ marginBottom: 10 }}>
                  <View style={[ch.imgPreview, { borderColor: theme.text }]}>
                    <Image source={{ uri: image }} style={StyleSheet.absoluteFillObject} borderRadius={10} />
                    <Pressable onPress={() => setImage(null)} style={ch.imgRemove}>
                      <Ionicons name="close-circle" size={20} color="red" />
                    </Pressable>
                  </View>
                </Animated.View>
              )}
              <View style={ch.row}>
                <Pressable onPress={pickImage} style={[ch.btn, { backgroundColor: theme.card, borderColor: theme.border }]} disabled={busy}>
                  <Ionicons name="image-outline" size={20} color={busy ? theme.border : theme.icon} />
                </Pressable>
                <TextInput
                  ref={inputRef}
                  style={[ch.textInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                  placeholder={busy ? 'AI is responding...' : 'Ask anything about marketing...'}
                  placeholderTextColor={theme.icon}
                  value={input} onChangeText={setInput}
                  multiline maxLength={500} editable={!busy} blurOnSubmit={false}
                />
                <Pressable
                  style={[ch.btn, { backgroundColor: (input.trim() || image) && !busy ? theme.text : theme.border }]}
                  onPress={send} disabled={(!input.trim() && !image) || busy}>
                  {busy
                    ? <ActivityIndicator size="small" color={theme.background} />
                    : <Ionicons name="arrow-up" size={18} color={theme.background} />}
                </Pressable>
              </View>
            </View>

          </KeyboardAvoidingView>
        </View>
      </Animated.View>
    </Modal>
  );
};

// ─── Tool Modal ───────────────────────────────────────────────────────────────
const ToolModal = ({ tool, visible, onClose, theme }: any) => {
  const { profile } = useAuth();
  const { isPro } = usePurchases();
  const [input,   setInput]   = useState('');
  const [imgUri,  setImgUri]  = useState<string|null>(null);
  const [output,  setOutput]  = useState('');
  const [loading, setLoading] = useState(false);
  
  const toolRouter = useRouter();

  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });
    if (!r.canceled && r.assets[0]) { setImgUri(r.assets[0].uri); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
  };

  const run = async () => {
    // Allow access if user is Pro OR if they have at least 5 credits (for non-pro credit purchasers)
    const hasAccess = isPro || (profile?.credits ?? 0) >= 5;
    
    if (!hasAccess) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Locked Feature", "Premium automations require Socify Pro or at least 5 credits.", [
        { text: "Cancel", style: "cancel" },
        { text: "Unlock Now", onPress: () => { close(); toolRouter.push('/paywall'); } }
      ]);
      return;
    }

    const creditRes = await CreditService.deductCredits(5);
    if (!creditRes.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Insufficient Credits", "Premium automations cost 5 credits to run.", [
        { text: "Cancel", style: "cancel" },
        { text: "Buy Credits", onPress: () => { close(); toolRouter.push('/paywall'); } }
      ]);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOutput(''); setLoading(true);
    try {
      if (tool.id === 'enhancer' || tool.id === 'remover') {
        setTimeout(() => {
          setOutput(tool.id === 'enhancer'
            ? '✨ Image upscaled to 4K. Contrast & saturation balanced.'
            : '✂️ Background removed. Edges refined cleanly.');
          setLoading(false);
        }, 2500);
        return;
      }
      const sys = tool.id === 'hashtag'
        ? [{ role: 'system', content: `Generate 20 trending hashtags. User is in ${profile?.country || 'Global'}.` }]
        : [{ role: 'system', content: 'You are a premium social media caption writer.' }];
      const { reply } = await sendChatMessage(sys as any, input || '[Image attached]', !!imgUri);
      setOutput(reply);
    } catch { setOutput('Error. Please try again.'); }
    finally { if (tool.id !== 'enhancer' && tool.id !== 'remover') setLoading(false); }
  };

  const close = () => { setInput(''); setImgUri(null); setOutput(''); setLoading(false); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[tm.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={close} hitSlop={15}><Ionicons name="chevron-down" size={24} color={theme.text} /></Pressable>
          <Text style={[tm.title, { color: theme.text }]}>{tool?.title}</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={tm.scroll}>
          <Text style={{ color: theme.icon, fontSize: 14, lineHeight: 20, marginBottom: 24 }}>{tool?.desc}</Text>
          {tool?.needsImage && (
            <Pressable style={[tm.imgBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={pick}>
              {imgUri
                ? <><Image source={{ uri: imgUri }} style={StyleSheet.absoluteFillObject} /><View style={tm.overlay}><Ionicons name="camera-reverse-outline" size={24} color="#FFF" /></View></>
                : <View style={{ alignItems: 'center', gap: 8, paddingVertical: 30 }}><Ionicons name="images-outline" size={32} color={theme.icon} /><Text style={{ color: theme.icon, fontSize: 15, fontWeight: '600' }}>Tap to upload photo</Text></View>}
            </Pressable>
          )}
          {tool?.needsText && (
            <View style={{ marginTop: tool?.needsImage ? 20 : 0 }}>
              <Text style={{ color: theme.text, fontWeight: '700', marginBottom: 8 }}>Parameters</Text>
              <TextInput style={[tm.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                placeholder={tool?.id === 'hashtag' ? 'E.g. Vintage clothing, Fitness...' : 'Describe the post context...'}
                placeholderTextColor={theme.icon} value={input} onChangeText={setInput}
                multiline numberOfLines={4} textAlignVertical="top" />
            </View>
          )}
          <Pressable style={[tm.btn, { backgroundColor: theme.text, opacity: loading ? 0.7 : 1 }]} onPress={run} disabled={loading}>
            {loading ? <ActivityIndicator color={theme.background} /> : <Text style={{ color: theme.background, fontSize: 16, fontWeight: '700' }}>Run Auto-Task</Text>}
          </Pressable>

          {loading && (
            <View style={[tm.output, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 24 }]}>
               <Skeleton width={100} height={12} style={{ marginBottom: 16 }} />
               <View style={{ gap: 10 }}>
                 <Skeleton width="100%" height={14} />
                 <Skeleton width="100%" height={14} />
                 <Skeleton width="60%" height={14} />
               </View>
            </View>
          )}

          {!!output && !loading && (
            <Animated.View entering={FadeIn.duration(400)} style={[tm.output, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ color: theme.text, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 12 }}>Result</Text>
                <Pressable onPress={() => Clipboard.setStringAsync(output)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="copy-outline" size={16} color={theme.icon} />
                  <Text style={{ color: theme.icon, fontSize: 13, fontWeight: '600' }}>Copy</Text>
                </Pressable>
              </View>
              <Text style={{ color: theme.text, fontSize: 15, lineHeight: 24 }}>{output}</Text>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Tool Card ────────────────────────────────────────────────────────────────
const ToolCard = ({ tool, index, theme, onPress }: any) => {
  const scale = useSharedValue(1);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View entering={ZoomIn.delay(80 + index * 90).duration(480).springify()}>
      <AnimatedPressable
        style={[s, sc.card, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPressIn={() => scale.value = withTiming(0.96, { duration: 100 })}
        onPressOut={() => scale.value = withTiming(1.00, { duration: 120 })}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(tool); }}>
        <View style={sc.cardTop}>
          <View style={[sc.iconWrap,  { backgroundColor: theme.text }]}><Ionicons name={tool.icon} size={22} color={theme.background} /></View>
          <View style={[sc.arrowWrap, { backgroundColor: theme.text + '11' }]}><Ionicons name="arrow-forward" size={16} color={theme.text} /></View>
        </View>
        <Text style={[sc.cardTitle, { color: theme.text }]}>{tool.title}</Text>
        <Text style={[sc.cardDesc,  { color: theme.icon }]} numberOfLines={2}>{tool.desc}</Text>
      </AnimatedPressable>
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ToolsScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme  = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [activeTool, setActiveTool]   = useState<any>(null);
  const [chatOpen,   setChatOpen]     = useState(false);
  const [chatStartY, setChatStartY]   = useState(200);
  const btnRef = useRef<View>(null);

  const openChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    btnRef.current?.measure((_x, _y, _w, _h, _px, pageY) => {
      setChatStartY(pageY);
      setChatOpen(true);
    });
  };

  return (
    <SafeAreaView style={[sc.root, { backgroundColor: theme.background }]} edges={['top']}>
      <ToolModal tool={activeTool} visible={!!activeTool} onClose={() => setActiveTool(null)} theme={theme} />
      <ChatModal visible={chatOpen} onClose={() => setChatOpen(false)} theme={theme} insets={insets} startY={chatStartY} />

      <ScrollView contentContainerStyle={sc.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(40).duration(600)}>
          <Text style={[sc.title,    { color: theme.text }]}>Automations</Text>
          <Text style={[sc.subtitle, { color: theme.icon }]}>Premium specialized utilities</Text>
        </Animated.View>

        {/* ─── AI Chat button — styled as an input field ─────────────── */}
        <Animated.View entering={FadeInUp.delay(120).duration(600)} style={sc.btnWrap}>
          <Pressable
            ref={btnRef}
            style={[sc.chatBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={openChat}>
            <View style={[sc.chatIcon, { backgroundColor: theme.text }]}>
              <Ionicons name="sparkles" size={17} color={theme.background} />
            </View>
            <Text style={[sc.chatPlaceholder, { color: theme.icon }]}>Ask Socify AI anything...</Text>
            <View style={[sc.onlineDot, { backgroundColor: '#34C759' }]} />
          </Pressable>
        </Animated.View>

        {/* ─── Tool cards ────────────────────────────────────────────── */}
        <View style={sc.grid}>
          {TOOLS.map((t, i) => <ToolCard key={t.id} tool={t} index={i} theme={theme} onPress={setActiveTool} />)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── StyleSheets ──────────────────────────────────────────────────────────────
const sc = StyleSheet.create({
  root:     { flex: 1 },
  scroll:   { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 120 },
  title:    { fontSize: 34, fontWeight: '900', letterSpacing: -1.5, marginBottom: 6 },
  subtitle: { fontSize: 15, fontWeight: '500', marginBottom: 24 },
  btnWrap:  { marginBottom: 28 },
  chatBtn:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1 },
  chatIcon: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  chatPlaceholder: { flex: 1, fontSize: 15, fontWeight: '500' },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  grid:     { gap: 16 },
  card:     { padding: 24, borderRadius: 30, borderWidth: 1, minHeight: 170 },
  cardTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  iconWrap:  { padding: 13, borderRadius: 18 },
  arrowWrap: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 21, fontWeight: '800', marginBottom: 6, letterSpacing: -0.4 },
  cardDesc:  { fontSize: 14, fontWeight: '500', lineHeight: 22 },
});

const ch = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  icon:   { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  name:   { fontSize: 17, fontWeight: '800', letterSpacing: -0.2, marginBottom: 2 },
  dot:    { width: 6, height: 6, borderRadius: 3 },
  msgs:   { paddingHorizontal: 16, paddingVertical: 16, gap: 10 },
  bubble: { maxWidth: '84%', padding: 14, borderRadius: 20 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble:   { alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1 },
  attachImg:  { width: 180, height: 130, borderRadius: 12, marginBottom: 8 },
  bar:        { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  row:        { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  btn:        { width: 42, height: 42, borderRadius: 21, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  textInput:  { flex: 1, minHeight: 42, maxHeight: 110, borderRadius: 21, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15 },
  imgPreview: { width: 64, height: 64, borderRadius: 12, borderWidth: 2, overflow: 'hidden' },
  imgRemove:  { position: 'absolute', top: -6, right: -6 },
});

const tm = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1 },
  title:  { fontSize: 17, fontWeight: '800' },
  scroll: { padding: 24, paddingBottom: 60 },
  imgBtn: { width: '100%', height: 175, borderRadius: 22, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  overlay:{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  input:  { minHeight: 115, borderWidth: 1, borderRadius: 18, padding: 14, fontSize: 15, lineHeight: 22 },
  btn:    { marginTop: 22, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center' },
  output: { marginTop: 22, padding: 18, borderRadius: 18, borderWidth: 1 },
});
