import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn, Layout, ZoomIn } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { StorageService } from '@/services/storageService';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  type: 'text' | 'image_asset';
  text?: string;
  imageUri?: string;
  hasPassed?: boolean;
}

const DEFAULT_MESSAGES: Message[] = [
  { id: 'init_1', sender: 'ai', type: 'text', text: "Hello! I'm your Socify AI Agent. Describe your imagination or upload an asset, and I'll generate the marketing materials you need." }
];

export default function AiChatScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const router = useRouter();

  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const scrollRef = useRef<ScrollView>(null);

  // Persistence Load
  useEffect(() => {
    StorageService.loadChatHistory().then(saved => {
      if (saved && saved.length > 0) {
        setMessages(saved);
      } else {
        setMessages(DEFAULT_MESSAGES);
      }
    });
  }, []);

  // Persistence Save
  useEffect(() => {
    if (messages.length > 0) {
      StorageService.saveChatHistory(messages);
    }
  }, [messages]);

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

  const clearChat = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await StorageService.clearChatHistory();
    setMessages(DEFAULT_MESSAGES);
  };

  const handleSend = () => {
    if (!input.trim() && !selectedImage) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const userMessage: Message = { 
      id: Date.now().toString(), 
      sender: 'user', 
      type: 'text', 
      text: input,
      imageUri: selectedImage || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    
    const storedInput = input;
    const hadImage = !!selectedImage;
    
    setInput('');
    setSelectedImage(null);
    setIsGenerating(true);

    // AI Generation Simulation Loop
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '_loading',
        sender: 'ai',
        type: 'text',
        text: hadImage ? 'I have received your reference image! Enhancing context...' : `Processing request for: "${storedInput}"`
      }]);
      setIsGenerating(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setTimeout(() => {
        setMessages(prev => [...prev, {
           id: Date.now().toString() + '_asset',
           sender: 'ai',
           type: 'image_asset'
        }]);
      }, 500);

    }, 2000);
  };

  useEffect(() => {
    setTimeout(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, 100);
  }, [messages, isGenerating, selectedImage]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={15}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Socify Agent</Text>
            <View style={styles.statusDotRow}>
              <View style={styles.statusDot} />
              <Text style={[styles.statusText, { color: theme.icon }]}>Online • Persistence Active</Text>
            </View>
          </View>
          <Pressable onPress={clearChat} style={styles.backBtn} hitSlop={15}>
            <Ionicons name="refresh" size={22} color={theme.icon} />
          </Pressable>
        </View>

        <ScrollView 
          ref={scrollRef}
          style={styles.chatArea} 
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg, index) => {
            const isUser = msg.sender === 'user';
            
            if (msg.type === 'image_asset') {
               return (
                 <Animated.View key={msg.id} entering={ZoomIn.duration(400)} style={[styles.assetWrapper, { marginBottom: index === messages.length -1 ? 0 : 24 }]}>
                    <View style={[styles.imagePlaceholder, { backgroundColor: theme.card, borderColor: theme.border }]}>
                       <Ionicons name="image-outline" size={40} color={theme.icon} />
                       <Text style={[styles.assetTag, { color: theme.icon }]}>Generated Artwork • Review</Text>
                    </View>
                 </Animated.View>
               );
            }

            return (
              <Animated.View 
                key={msg.id} 
                layout={Layout.springify()} 
                entering={FadeInUp.delay(50)}
                style={[
                  styles.messageBubble, 
                  isUser ? styles.userBubble : styles.aiBubble,
                  { backgroundColor: isUser ? theme.primary : theme.card, borderColor: isUser ? theme.primary : theme.border }
                ]}
              >
                {msg.imageUri && (
                  <View style={styles.bubbleAttachmentBox}>
                    <Image source={{ uri: msg.imageUri }} style={styles.bubbleAttachedImage} />
                  </View>
                )}
                {msg.text ? <Text style={[styles.messageText, { color: isUser ? '#fff' : theme.text }]}>{msg.text}</Text> : null}
              </Animated.View>
            );
          })}

          {isGenerating && (
            <Animated.View entering={FadeIn} style={[styles.messageBubble, styles.aiBubble, { backgroundColor: theme.card, borderColor: theme.border }]}>
               <Text style={[styles.messageText, { color: theme.icon }]}>Building generation parameters...</Text>
            </Animated.View>
          )}
        </ScrollView>

        <View style={[styles.inputContainer, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
          
          {selectedImage && (
            <Animated.View entering={FadeInUp} style={styles.inlineImagePreview}>
              <View style={[styles.inlineImageWrapper, { borderColor: theme.border }]}>
                <Image source={{ uri: selectedImage }} style={styles.inlineImage} />
                <Pressable style={styles.removeImageBtn} onPress={() => setSelectedImage(null)}>
                  <Ionicons name="close-circle" size={24} color="#FF3B30" />
                </Pressable>
              </View>
            </Animated.View>
          )}
          
          <View style={styles.inputRow}>
            <Pressable onPress={handlePickImage} style={[styles.attachBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="image-outline" size={20} color={theme.icon} />
            </Pressable>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
              placeholder="Describe what you want to create..."
              placeholderTextColor={theme.icon}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={250}
            />
            <Pressable 
              style={[styles.sendBtn, { backgroundColor: (input.trim().length > 0 || selectedImage) ? theme.primary : theme.border }]}
              onPress={handleSend}
              disabled={!input.trim() && !selectedImage}
            >
              <Ionicons name="arrow-up" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerInfo: { alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  statusDotRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34C759' },
  statusText: { fontSize: 12, fontWeight: '500' },
  chatArea: { flex: 1 },
  chatContent: { paddingHorizontal: 20, paddingVertical: 24, gap: 16 },
  messageBubble: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, borderWidth: 1 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  bubbleAttachmentBox: { marginBottom: 8 },
  bubbleAttachedImage: { width: 200, height: 140, borderRadius: 12 },
  assetWrapper: { width: '100%', alignSelf: 'flex-start' },
  imagePlaceholder: { width: '100%', height: 260, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  assetTag: { marginTop: 12, fontSize: 13, fontWeight: '500' },
  inputContainer: { padding: 16, borderTopWidth: 1 },
  inlineImagePreview: { marginBottom: 16 },
  inlineImageWrapper: { width: 80, height: 80, borderRadius: 12, borderWidth: 1 },
  inlineImage: { width: '100%', height: '100%', borderRadius: 11 },
  removeImageBtn: { position: 'absolute', top: -10, right: -10, backgroundColor: '#fff', borderRadius: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  attachBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  textInput: { flex: 1, minHeight: 48, maxHeight: 120, borderRadius: 24, borderWidth: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
});
