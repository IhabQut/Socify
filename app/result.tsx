import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, FlatList, Share, Alert } from 'react-native';
import Animated, { FadeIn, SlideInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import * as RegularFileSystem from 'expo-file-system';
import { BlurView } from 'expo-blur';
import { AssetSyncService } from '@/services/assetSyncService';
import { useAuth } from '@/hooks/use-auth';

const { width, height } = Dimensions.get('window');

// ── Mock Data Generation for the "AI Results" ──
const generateMockVariants = (batchSize: number, style: string) => {
    const variants = [];
    const baseImages = [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000',
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000',
        'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=1000',
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000'
    ];
    
    for (let i = 0; i < batchSize; i++) {
        const isCarousel = i === 0;
        
        variants.push({
            id: `v_${i}`,
            title: `Concept ${i + 1}`,
            images: isCarousel ? [baseImages[i % baseImages.length], baseImages[(i + 1) % baseImages.length]] : [baseImages[i % baseImages.length]],
            caption: `Presenting our latest design concept. Crafted with ${style} aesthetics to elevate your brand presence. What do you think? 👇\n\n#branding #design #creative #socify`
        });
    }
    return variants;
};

// ── Glowing Studio Skeleton Component ──
const StudioSkeleton = ({ theme }: { theme: any }) => {
    const opacity = useSharedValue(0.5);
    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 800 }),
                withTiming(0.4, { duration: 800 })
            ),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
        <View style={styles.skeletonContainer}>
            <Animated.View style={[styles.skeletonStage, { backgroundColor: theme.card }, animatedStyle]} />
            <View style={{ gap: 12, marginTop: 24 }}>
                <Animated.View style={[{ width: 140, height: 16, borderRadius: 8, backgroundColor: theme.card }, animatedStyle]} />
                <Animated.View style={[{ width: '100%', height: 100, borderRadius: 16, backgroundColor: theme.card }, animatedStyle]} />
            </View>
        </View>
    );
};

export default function ResultScreen() {
    const { templateId, batchSize: paramBatchSize, style, aiCaption } = useLocalSearchParams();
    const batchSize = parseInt(paramBatchSize as string) || 1;
    
    const colorScheme = useColorScheme() ?? 'dark';
    const theme = Colors[colorScheme];
    const insets = useSafeAreaInsets();

    const [isGenerating, setIsGenerating] = useState(true);
    const [variants, setVariants] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState(0);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const [captionText, setCaptionText] = useState("");
    const [isSavingObject, setIsSavingObject] = useState(false);
    
    const [expandedImage, setExpandedImage] = useState<string | null>(null);

    const { user } = useAuth();

    useEffect(() => {
        // Simulate AI Generation time (3.5 seconds)
        const timer = setTimeout(async () => {
            const generated = generateMockVariants(batchSize, (style as string) || 'Realistic');
            setVariants(generated);
            setCaptionText(generated[0]?.caption || '');
            setIsGenerating(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Trigger background sync for each generated asset
            if (user) {
                for (let i = 0; i < generated.length; i++) {
                    const variant = generated[i];
                    try {
                        // Download the mock URL to a local URI so the sync service can handle it
                        const tempUri = `${RegularFileSystem.documentDirectory}temp_gen_${i}.jpg`;
                        const { uri: localUri } = await RegularFileSystem.downloadAsync(variant.images[0], tempUri);
                        
                        await AssetSyncService.handleNewGeneratedAsset({
                            userId: user.id,
                            templateId: templateId as string,
                            title: variant.title,
                            prompt: `Style: ${style}, Captions: ${aiCaption}, Variant: ${i+1}`,
                            assetType: 'image',
                            localUri: localUri
                        });
                    } catch (err) {
                        console.error('Failed to queue asset for sync:', err);
                    }
                }
            }
        }, 3500);

        return () => clearTimeout(timer);
    }, [batchSize, style]);

    const handleTabSwitch = (index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveTab(index);
        setCaptionText(variants[index].caption);
        setActiveImageIndex(0);
    };

    const handleCaptionChange = (text: string) => {
        setCaptionText(text);
        const updated = [...variants];
        updated[activeTab].caption = text;
        setVariants(updated);
    };

    const handleShare = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await Share.share({
                message: captionText,
                url: variants[activeTab].images[activeImageIndex] // Share image URL on iOS
            });
        } catch (error) {
            console.log("Error sharing", error);
        }
    };

    const handleDownloadPhoto = async (imageUrl: string) => {
        setIsSavingObject(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permission required", "Please allow Socify to access your photo library in settings to save this asset.");
                setIsSavingObject(false);
                return;
            }

            const fileExt = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
            const fileUri = `${FileSystem.documentDirectory}socify_asset_${Date.now()}.${fileExt}`;
            
            const downloaded = await FileSystem.downloadAsync(imageUrl, fileUri);
            await MediaLibrary.saveToLibraryAsync(downloaded.uri);
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Asset Saved", "The image was successfully saved to your camera roll.");
        } catch (error) {
            console.error("Save error", error);
            Alert.alert("Error", "Could not save the image. Please try again.");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsSavingObject(false);
        }
    };

    const currentVariant = variants[activeTab];

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                
                {/* ── Top Header ── */}
                <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: theme.border }]}>
                    <Pressable style={styles.backBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
                        <Ionicons name="close" size={26} color={theme.text} />
                    </Pressable>
                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.headerSubtitle, { color: theme.icon }]}>STUDIO ASSETS</Text>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>{isGenerating ? 'Generating...' : 'Review & Export'}</Text>
                    </View>
                    <View style={styles.rightHeaderEmpty} />
                </View>

                {/* ── Tabs (Only show if batchSize > 1) ── */}
                {!isGenerating && batchSize > 1 && (
                    <Animated.View entering={SlideInDown.duration(400)} style={[styles.tabsContainer, { borderBottomColor: theme.border }]}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                            {variants.map((v, idx) => (
                                <Pressable 
                                    key={v.id} 
                                    style={[styles.tabBtn, activeTab === idx && { borderBottomColor: theme.primary }]}
                                    onPress={() => handleTabSwitch(idx)}
                                >
                                    <Text style={[styles.tabText, { color: activeTab === idx ? theme.primary : theme.icon }, activeTab === idx && { fontWeight: '700' }]}>
                                        {v.title}
                                    </Text>
                                    {activeTab === idx && <View style={[styles.activeTabDot, { backgroundColor: theme.primary }]} />}
                                </Pressable>
                            ))}
                        </ScrollView>
                    </Animated.View>
                )}

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {isGenerating ? (
                        <StudioSkeleton theme={theme} />
                    ) : (
                        currentVariant && (
                            <Animated.View entering={FadeIn.duration(600)} style={styles.contentWrapper}>
                                
                                {/* Image Stage */}
                                <View style={[styles.stageContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                    <FlatList
                                        data={currentVariant.images}
                                        horizontal
                                        pagingEnabled
                                        showsHorizontalScrollIndicator={false}
                                        onMomentumScrollEnd={(e) => {
                                            const idx = Math.round(e.nativeEvent.contentOffset.x / (width - 40));
                                            setActiveImageIndex(idx);
                                        }}
                                        keyExtractor={(item, index) => `${item}_${index}`}
                                        renderItem={({ item }) => (
                                            <Pressable style={styles.stageSlide} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpandedImage(item); }}>
                                                <Image source={{ uri: item }} style={styles.stageImage} resizeMode="cover" />
                                                
                                                {/* Floating Export Button on Photo */}
                                                <Pressable 
                                                    style={styles.inlineExportBtn}
                                                    onPress={(e) => { 
                                                        e.stopPropagation(); 
                                                        handleDownloadPhoto(item); 
                                                    }}
                                                >
                                                    <BlurView intensity={60} tint="dark" style={styles.inlineExportBlur}>
                                                        <Ionicons name="download" size={18} color="#FFF" />
                                                    </BlurView>
                                                </Pressable>

                                                <BlurView intensity={30} tint="dark" style={styles.expandHintBadge}>
                                                    <Ionicons name="expand" size={16} color="#FFF" />
                                                </BlurView>
                                            </Pressable>
                                        )}
                                    />
                                    {currentVariant.images.length > 1 && (
                                        <View style={styles.paginationDots}>
                                            {currentVariant.images.map((_, i) => (
                                                <View key={i} style={[styles.dot, { backgroundColor: i === activeImageIndex ? '#FFF' : 'rgba(255,255,255,0.4)', transform: [{ scale: i === activeImageIndex ? 1.2 : 1 }] }]} />
                                            ))}
                                        </View>
                                    )}
                                </View>

                                {/* Action Buttons underneath Image */}
                                <View style={styles.actionRow}>
                                    <Pressable 
                                        style={[styles.secondaryActionBtn, { flex: 1, backgroundColor: theme.card, borderColor: theme.border, flexDirection: 'row', gap: 8 }]} 
                                        onPress={handleShare}
                                    >
                                        <Ionicons name="share-outline" size={20} color={theme.text} />
                                        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>Share Asset</Text>
                                    </Pressable>
                                </View>

                                {/* Generated Copy Section */}
                                <View style={styles.copySectionHeader}>
                                    <View style={styles.copyHeaderLeft}>
                                        <Ionicons name="document-text" size={18} color={theme.primary} />
                                        <Text style={[styles.copyTitle, { color: theme.text }]}>Generated Copy</Text>
                                    </View>
                                </View>
                                <View style={[styles.copyEditorContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                    <TextInput
                                        style={[styles.copyInput, { color: theme.text, height: Math.max(120, captionText.length / 2) }]}
                                        value={captionText}
                                        onChangeText={handleCaptionChange}
                                        multiline
                                        placeholder="Add a caption..."
                                        placeholderTextColor={theme.icon}
                                    />
                                    <View style={styles.copyHintBar}>
                                        <Text style={[styles.copyHint, { color: theme.icon }]}>Tap text above to edit</Text>
                                        <Ionicons name="pencil" size={12} color={theme.icon} />
                                    </View>
                                </View>

                            </Animated.View>
                        )
                    )}
                </ScrollView>

                {/* ── Fullscreen Interactive Modal (Zoom Enabled) ── */}
                <Modal visible={!!expandedImage} transparent animationType="fade" onRequestClose={() => setExpandedImage(null)}>
                    <View style={styles.fullScreenOverlay}>
                        
                        {/* Background Press to Close */}
                        <Pressable style={StyleSheet.absoluteFill} onPress={() => setExpandedImage(null)} />

                        {/* Top Controls */}
                        <View style={[styles.fullScreenTopBar, { paddingTop: insets.top || 20 }]}>
                            <Pressable style={styles.fullScreenBtn} onPress={() => setExpandedImage(null)}>
                                <Ionicons name="close" size={28} color="#FFF" />
                            </Pressable>
                            <Pressable 
                                style={[styles.fullScreenBtn, { backgroundColor: theme.primary }]} 
                                onPress={() => expandedImage && handleDownloadPhoto(expandedImage)}
                            >
                                <Ionicons name="download" size={24} color="#000" />
                            </Pressable>
                        </View>

                        {expandedImage && (
                            <ScrollView 
                                maximumZoomScale={5} 
                                minimumZoomScale={1} 
                                bouncesZoom={true}
                                centerContent={true}
                                showsHorizontalScrollIndicator={false}
                                showsVerticalScrollIndicator={false}
                            >
                                <View style={{ flex: 1 }} onStartShouldSetResponder={() => true} onResponderRelease={() => setExpandedImage(null)}>
                                    <View style={{ width: width, height: height, justifyContent: 'center', alignItems: 'center' }}>
                                        <View onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
                                            <Image source={{ uri: expandedImage }} style={{ width: width, height: height * 0.8 }} resizeMode="contain" />
                                        </View>
                                    </View>
                                </View>
                            </ScrollView>
                        )}
                        
                        {/* Hint for zoom */}
                        <View style={{ position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
                            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>Pinch to zoom</Text>
                        </View>

                    </View>
                </Modal>

            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    
    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
    backBtn: { width: 40 },
    headerTitleContainer: { alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 11, fontWeight: '800', marginBottom: 2, letterSpacing: 1 },
    rightHeaderEmpty: { width: 40 },

    // Tabs
    tabsContainer: { borderBottomWidth: 1 },
    tabsScroll: { paddingHorizontal: 16 },
    tabBtn: { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 2, borderBottomColor: 'transparent', alignItems: 'center' },
    tabText: { fontSize: 15, fontWeight: '600' },
    activeTabDot: { width: 4, height: 4, borderRadius: 2, marginTop: 4, position: 'absolute', bottom: 6 },

    scrollContent: { paddingBottom: 120 },
    contentWrapper: { padding: 20, paddingTop: 24 },

    skeletonContainer: { padding: 20, paddingTop: 24 },
    skeletonStage: { width: '100%', height: height * 0.45, borderRadius: 24 },

    // The Stage (Image Container)
    stageContainer: { width: '100%', height: height * 0.45, borderRadius: 24, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
    stageSlide: { width: width - 40, height: height * 0.45 },
    stageImage: { width: '100%', height: '100%' },
    expandHintBadge: { position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    inlineExportBtn: { position: 'absolute', bottom: 16, right: 16 },
    inlineExportBlur: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },

    paginationDots: { position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8 },
    dot: { width: 6, height: 6, borderRadius: 3 },

    // Action Row
    actionRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
    primaryActionBtn: { flex: 1, flexDirection: 'row', height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 8 },
    primaryActionText: { fontSize: 16, fontWeight: '800' },
    secondaryActionBtn: { width: 54, height: 54, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

    // Copy Section
    copySectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 32, marginBottom: 12 },
    copyHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    copyTitle: { fontSize: 16, fontWeight: '800' },
    
    copyEditorContainer: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
    copyInput: { padding: 20, fontSize: 15, lineHeight: 24, textAlignVertical: 'top' },
    copyHintBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
    copyHint: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

    // Fullscreen Overlay
    fullScreenOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
    fullScreenTopBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20 },
    fullScreenBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }
});
