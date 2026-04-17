import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ChatMessage, sendChatMessage } from '@/lib/openrouter';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { usePurchases } from '@/hooks/use-purchases';
import { StorageService } from '@/services/storageService';
import { CreditService } from '@/services/creditService';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { Easing, FadeIn, FadeInDown, FadeInUp, ZoomIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  type: 'text' | 'image_asset';
  text?: string;
  imageUri?: string;
  downloadUrl?: string;
  model?: string;
  timestamp?: number;
}

const DEFAULT_MESSAGES: Message[] = [
  {
    id: 'init_1',
    sender: 'ai',
    type: 'text',
    text: "Hey! I'm your Socify AI Agent ✨\n\nI can help you with:\n• Ad copy & captions\n• Hashtag strategies\n• Content calendars\n• Brand visuals\n\nWhat are you working on?",
    timestamp: Date.now(),
  }
];

const QUICK_PROMPTS = [
  { label: "Write a caption for my product launch", icon: "chatbubble-ellipses" },
  { label: "Generate 30 hashtags for a fitness brand", icon: "hash" },
  { label: "Create a 50% off ad headline", icon: "megaphone" },
  { label: "Plan a week of Instagram content", icon: "calendar" },
  { label: "Write a TikTok hook for my store", icon: "flame" },
  { label: "SEO-optimize my website copy", icon: "trending-up" },
];

// Animated typing indicator dots
const TypingDots = ({ theme }: any) => {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    dot1.value = withRepeat(withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }), -1, true);
    setTimeout(() => {
      dot2.value = withRepeat(withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }), -1, true);
    }, 200);
    setTimeout(() => {
      dot3.value = withRepeat(withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }), -1, true);
    }, 400);
  }, []);

  const s1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View style={styles.typingContainer}>
      <Animated.View style={[styles.typingDot, { backgroundColor: theme.accent }, s1]} />
      <Animated.View style={[styles.typingDot, { backgroundColor: theme.accent }, s2]} />
      <Animated.View style={[styles.typingDot, { backgroundColor: theme.accent }, s3]} />
    </View>
  );
};

// Timestamp formatter
function formatTime(ts?: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatEngine({ onClose }: { onClose?: () => void }) {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const router = useRouter();

  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { profile } = useAuth();
  const { isPro } = usePurchases();

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const getInitialContext = useCallback(() => {
    const greeting = "Hey! I'm your Socify AI Agent ✨\n\nI can help you with:\n• Ad copy & captions\n• Hashtag strategies\n• Content calendars\n• Brand visuals\n\nWhat are you working on?";

    return [{
      id: 'init_1',
      sender: 'ai',
      type: 'text',
      text: greeting,
      timestamp: Date.now(),
    }] as Message[];
  }, []);

  // Database Persistence Load
  useEffect(() => {
    async function loadCloudSession() {
      if (!profile) return;
      
      const { data: latestSession, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestSession) {
        const sessionAgeHrs = (Date.now() - new Date(latestSession.created_at).getTime()) / (1000 * 60 * 60);
        
        // If the session is within 24 hours, restore it natively
        if (sessionAgeHrs < 24) {
          setSessionId(latestSession.id);
          
          const { data: cloudMessages } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', latestSession.id)
            .order('created_at', { ascending: true });

          if (cloudMessages && cloudMessages.length > 0) {
            const mappedMessages: Message[] = [];
            const history: ChatMessage[] = [];

            cloudMessages.forEach(msg => {
              mappedMessages.push({
                id: msg.id,
                sender: msg.role === 'user' ? 'user' : 'ai',
                type: 'text',
                text: msg.content,
                timestamp: new Date(msg.created_at).getTime()
              });
              history.push({ 
                role: msg.role === 'user' ? 'user' : 'assistant', 
                content: msg.content 
              });
            });

            setMessages(mappedMessages);
            setMessageCount(mappedMessages.filter(m => m.sender === 'user').length);
            setConversationHistory(history);
            return; // Successful cloud restore
          }
        }
      }
      
      // If older than 24h, or no cloud session exists, start fresh.
      setMessages(getInitialContext());
    }

    loadCloudSession();
  }, [profile, getInitialContext]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const downloadAsset = async (imageUrl: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { status } = await MediaLibrary.requestPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert("Permission Required", "We need access to your photos to save assets.");
      return;
    }

    try {
      const fileUri = FileSystem.documentDirectory + `socify_asset_${Date.now()}.jpg`;
      const { uri } = await FileSystem.downloadAsync(imageUrl, fileUri);
      await MediaLibrary.saveToLibraryAsync(uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved!", "Asset downloaded to your camera roll.");
    } catch (e) {
      Alert.alert("Export Error", "Could not save the generated asset.");
    }
  };

  const clearChat = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Clear Chat",
      "This will end the current session. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
             await StorageService.clearChatHistory();
             setMessages(getInitialContext());
             setConversationHistory([]);
             setMessageCount(0);
             setSessionId(null); // Will automatically generate a new ID on next send
          }
        }
      ]
    );
  }, []);

  const handleSend = useCallback(async () => {
    if (!trimmed && !selectedImage) return;
    if (isGenerating) return; // Prevent double-sends

    // ── Credit Deduction ──
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

    const now = Date.now();
    const userMessage: Message = {
      id: now.toString(),
      sender: 'user',
      type: 'text',
      text: trimmed,
      imageUri: selectedImage || undefined,
      timestamp: now,
    };

    setMessages(prev => [...prev, userMessage]);
    setMessageCount(c => c + 1);

    const storedInput = trimmed;
    const hadImage = !!selectedImage;

    setInput('');
    setSelectedImage(null);
    setIsGenerating(true);

    try {
      // Lazy Session Generation
      let activeSessionId = sessionId;
      if (!activeSessionId && profile) {
         const { data: newSession } = await supabase.from('chat_sessions').insert({
            user_id: profile.id,
            title: storedInput.substring(0, 40) + '...'
         }).select().single();
         if (newSession) {
             activeSessionId = newSession.id;
             setSessionId(activeSessionId);
         }
      }

      // Sync User Message
      if (activeSessionId) {
         await supabase.from('chat_messages').insert({
            session_id: activeSessionId,
            role: 'user',
            content: hadImage ? `[Image attached] ${storedInput}` : storedInput
         });
      }

      const { reply, model } = await sendChatMessage(
        conversationHistory,
        storedInput,
        hadImage
      );

      // Update conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: hadImage ? `[Image attached] ${storedInput}` : storedInput },
        { role: 'assistant', content: reply }
      ]);

      const aiId = Date.now().toString() + '_ai';
      setMessages(prev => [...prev, {
        id: aiId,
        sender: 'ai',
        type: 'text',
        text: reply,
        model,
        timestamp: Date.now(),
      }]);

      // Sync AI Message
      if (activeSessionId) {
         await supabase.from('chat_messages').insert({
            session_id: activeSessionId,
            role: 'assistant',
            content: reply
         });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '_error',
        sender: 'ai',
        type: 'text',
        text: "Something went wrong. Please try again.",
        timestamp: Date.now(),
      }]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGenerating(false);
    }
  }, [input, selectedImage, isGenerating, conversationHistory]);

  // Auto-scroll
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
    return () => clearTimeout(timer);
  }, [messages, isGenerating]);

  const handleQuickPrompt = useCallback((label: string) => {
    setInput(label);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    inputRef.current?.focus();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={() => onClose ? onClose() : router.back()} style={styles.backBtn} hitSlop={15}>
            <Ionicons name="chevron-down" size={26} color={theme.text} />
          </Pressable>
          <View style={styles.headerInfo}>
            <View style={styles.headerTitleRow}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Socify AI</Text>
            </View>
            <View style={styles.statusDotRow}>
              <View style={[styles.statusDot, { backgroundColor: isGenerating ? theme.warning : theme.success }]} />
              <Text style={[styles.statusText, { color: theme.icon }]}>
                {isGenerating ? 'Thinking...' : 'Online'}
              </Text>
              {messageCount > 0 && (
                <Text style={[styles.msgCount, { color: theme.icon }]}> • {messageCount} messages</Text>
              )}
            </View>
          </View>
          <Pressable onPress={clearChat} style={styles.backBtn} hitSlop={15}>
            <Ionicons name="trash-outline" size={20} color={theme.icon} />
          </Pressable>
        </View>

        {/* Chat Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          {/* Quick Prompts — only show when chat is fresh */}
          {messages.length <= 1 && (
            <Animated.View entering={FadeIn.delay(300).duration(500)} style={styles.suggestionsWrapper}>
              <Text style={[styles.suggestionTitle, { color: theme.icon }]}>Try asking</Text>
              <View style={styles.suggestionGrid}>
                {QUICK_PROMPTS.map((item, i) => (
                  <Animated.View key={i} entering={FadeInUp.delay(400 + i * 80).duration(400)}>
                    <Pressable
                      onPress={() => handleQuickPrompt(item.label)}
                      style={[styles.suggestionChip, { backgroundColor: theme.card, borderColor: theme.border }]}
                    >
                      <View style={[styles.suggestionIcon, { backgroundColor: theme.accent + '15' }]}>
                        <Ionicons name={item.icon as any} size={16} color={theme.accent} />
                      </View>
                      <Text style={[styles.suggestionBtnText, { color: theme.text }]} numberOfLines={2}>{item.label}</Text>
                    </Pressable>
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Message Bubbles */}
          {messages.map((msg, index) => {
            const isUser = msg.sender === 'user';

            if (msg.type === 'image_asset') {
              return (
                <Animated.View key={msg.id} entering={ZoomIn.duration(400)} style={[styles.assetWrapper, { marginBottom: index === messages.length - 1 ? 0 : 24 }]}>
                  <Pressable onPress={() => msg.downloadUrl && downloadAsset(msg.downloadUrl)} style={[styles.imagePlaceholder, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    {msg.downloadUrl ? (
                      <Image source={{ uri: msg.downloadUrl }} style={styles.mockedOutput} />
                    ) : (
                      <Ionicons name="image-outline" size={40} color={theme.icon} />
                    )}

                    <View style={[styles.downloadOverlay, { backgroundColor: theme.card }]}>
                      <Ionicons name="download" size={16} color={theme.text} />
                      <Text style={[styles.downloadText, { color: theme.text }]}>Save to Camera Roll</Text>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            }

            return (
              <Animated.View
                key={msg.id}
                entering={FadeInUp.delay(30).duration(350)}
                style={[
                  styles.messageBubble,
                  isUser ? styles.userBubble : styles.aiBubble,
                  { backgroundColor: isUser ? theme.accent : theme.card, borderColor: isUser ? theme.accent : theme.border }
                ]}
              >
                {!isUser && (
                  <View style={styles.aiAvatarRow}>
                    <View style={[styles.aiAvatar, { backgroundColor: theme.accent + '15' }]}>
                      <Ionicons name="sparkles" size={12} color={theme.accent} />
                    </View>
                    <Text style={[styles.aiLabel, { color: theme.accent }]}>Socify AI</Text>
                  </View>
                )}
                {msg.imageUri ? (
                  <View style={styles.bubbleAttachmentBox}>
                    <Image source={{ uri: msg.imageUri }} style={styles.bubbleAttachedImage} />
                  </View>
                ) : null}
                {msg.text ? <Text style={[styles.messageText, { color: isUser ? theme.background : theme.text }]} selectable>{msg.text}</Text> : null}
                {msg.timestamp ? (
                  <Text style={[styles.timestamp, { color: isUser ? theme.background + '88' : theme.icon }]}>{formatTime(msg.timestamp)}</Text>
                ) : null}
              </Animated.View>
            );
          })}

          {/* Typing Indicator */}
          {isGenerating && (
            <Animated.View entering={FadeIn.duration(200)} style={[styles.messageBubble, styles.aiBubble, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.aiAvatarRow}>
                <View style={[styles.aiAvatar, { backgroundColor: theme.accent + '15' }]}>
                  <Ionicons name="sparkles" size={12} color={theme.accent} />
                </View>
                <Text style={[styles.aiLabel, { color: theme.accent }]}>Socify AI</Text>
              </View>
              <TypingDots theme={theme} />
            </Animated.View>
          )}
        </ScrollView>

        {/* Input Area */}
        <Animated.View entering={FadeInDown.duration(300)} style={[styles.inputContainer, { borderTopColor: theme.border, backgroundColor: theme.background }]}>

          {/* Image Preview */}
          {selectedImage && (
            <Animated.View entering={FadeInUp.duration(200)} style={styles.inlineImagePreview}>
              <View style={[styles.inlineImageWrapper, { borderColor: theme.accent, borderWidth: 2 }]}>
                <Image source={{ uri: selectedImage }} style={styles.inlineImage} />
                <Pressable style={[styles.removeImageBtn, { backgroundColor: theme.background }]} onPress={() => setSelectedImage(null)}>
                  <Ionicons name="close-circle" size={22} color={theme.danger} />
                </Pressable>
              </View>
            </Animated.View>
          )}

          <View style={styles.inputRow}>
            <Pressable
              onPress={handlePickImage}
              style={[styles.attachBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              disabled={isGenerating}
            >
              <Ionicons name="image-outline" size={20} color={isGenerating ? theme.border : theme.accent} />
            </Pressable>
            <TextInput
              ref={inputRef}
              style={[styles.textInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
              placeholder={isGenerating ? "AI is responding..." : "Ask anything about marketing..."}
              placeholderTextColor={theme.icon}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              editable={!isGenerating}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <Pressable
              style={[styles.sendBtn, {
                backgroundColor: (input.trim().length > 0 || selectedImage) && !isGenerating ? theme.accent : theme.border,
                opacity: isGenerating ? 0.5 : 1,
              }]}
              onPress={handleSend}
              disabled={(!input.trim() && !selectedImage) || isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color={theme.background} />
              ) : (
                <Ionicons name="arrow-up" size={18} color={theme.background} />
              )}
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerInfo: { alignItems: 'center', flex: 1, paddingHorizontal: 12 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  modelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  modelBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusDotRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  msgCount: { fontSize: 11, fontWeight: '500' },
  chatArea: { flex: 1 },
  chatContent: { paddingHorizontal: 16, paddingVertical: 20, gap: 12 },

  // Message bubbles
  messageBubble: { maxWidth: '85%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, borderWidth: 1 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  aiBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 6 },
  messageText: { fontSize: 15, lineHeight: 23, fontWeight: '400' },
  timestamp: { fontSize: 10, fontWeight: '500', marginTop: 6, alignSelf: 'flex-end' },

  // AI avatar
  aiAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  aiAvatar: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  aiLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },

  // Typing indicator
  typingContainer: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  typingDot: { width: 8, height: 8, borderRadius: 4 },

  // Attachments
  bubbleAttachmentBox: { marginBottom: 8 },
  bubbleAttachedImage: { width: 200, height: 140, borderRadius: 12 },

  // Quick prompts
  suggestionsWrapper: { paddingBottom: 16 },
  suggestionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, marginLeft: 4 },
  suggestionGrid: { gap: 8 },
  suggestionChip: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 18, borderWidth: 1 },
  suggestionIcon: { width: 34, height: 34, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  suggestionBtnText: { fontSize: 14, fontWeight: '500', flex: 1 },

  // Assets
  assetWrapper: { width: '100%', alignSelf: 'flex-start' },
  imagePlaceholder: { width: '100%', height: 260, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mockedOutput: { width: '100%', height: '100%' },
  downloadOverlay: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, opacity: 0.9 },
  downloadText: { fontSize: 13, fontWeight: '600' },

  // Input area
  inputContainer: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  inlineImagePreview: { marginBottom: 12 },
  inlineImageWrapper: { width: 72, height: 72, borderRadius: 14 },
  inlineImage: { width: '100%', height: '100%', borderRadius: 12 },
  removeImageBtn: { position: 'absolute', top: -8, right: -8, borderRadius: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  attachBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  textInput: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, borderWidth: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
});
