import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePurchases } from '@/hooks/use-purchases';
import { supabase } from '@/lib/supabase';
import { DesignTemplate } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, Layout, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Mock DB of templates with requirements
const MOCK_TEMPLATES: Record<string, DesignTemplate> = {
    '1': {
        id: '1', title: 'Black Friday Frenzy', category: 'Instagram Posts',
        requirements: [
            { id: 'r1', type: 'photo', label: 'Main Product Image', description: 'Clear frontal view of the discounted item' },
            { id: 'r2', type: 'text', label: 'Discount Percentage', description: 'e.g., "50% OFF"' }
        ]
    },
    '4': {
        id: '4', title: 'Real Estate App', category: 'Facebook Ads',
        requirements: [
            { id: 'r1', type: 'photo', label: 'Exterior Front View', description: 'Wide angle showing the whole property' },
            { id: 'r2', type: 'photo', label: 'Living Room', description: 'Well-lit interior shot' },
            { id: 'r3', type: 'text', label: 'Location Headline', description: 'e.g., "Downtown Luxury"' }
        ]
    },
    '6': {
        id: '6', title: 'Vlog Intro', category: 'Stories & Reels',
        requirements: [
            { id: 'r1', type: 'video', label: 'Action Clip', description: '3-second video of you waving' },
            { id: 'r2', type: 'text', label: 'Channel Name', description: 'Your YT username' }
        ],
        defaultCaptionMode: 'auto'
    }
};

const DEFAULT_TEMPLATE: DesignTemplate = {
    id: 'default', title: 'Generic Campaign', category: 'Ads',
    requirements: [
        { id: 'r1', type: 'photo', label: 'Add First Photo', description: 'Primary angle' },
        { id: 'r2', type: 'photo', label: 'Add Last Photo', description: 'Different angle or lifestyle shot' }
    ]
};

const PickerSheet = ({ visible, onClose, onCamera, onLibrary, theme }: any) => (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
        <Pressable style={styles.sheetOverlay} onPress={onClose}>
            <Animated.View entering={FadeInUp.duration(300)} style={[styles.sheetContainer, { backgroundColor: theme.card }]}>
                <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
                <Text style={[styles.sheetTitle, { color: theme.text }]}>Add Media</Text>

                <Pressable style={[styles.sheetOption, { borderColor: theme.border }]} onPress={onCamera}>
                    <View style={[styles.sheetOptionIcon, { backgroundColor: '#5E5CE620' }]}>
                        <Ionicons name="camera-outline" size={22} color="#5E5CE6" />
                    </View>
                    <View style={styles.sheetOptionText}>
                        <Text style={[styles.sheetOptionTitle, { color: theme.text }]}>Take a Photo</Text>
                        <Text style={[styles.sheetOptionDesc, { color: theme.icon }]}>Open camera directly</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.icon} />
                </Pressable>

                <Pressable style={[styles.sheetOption, { borderColor: theme.border }]} onPress={onLibrary}>
                    <View style={[styles.sheetOptionIcon, { backgroundColor: '#32ADE620' }]}>
                        <Ionicons name="images-outline" size={22} color="#32ADE6" />
                    </View>
                    <View style={styles.sheetOptionText}>
                        <Text style={[styles.sheetOptionTitle, { color: theme.text }]}>Choose from Library</Text>
                        <Text style={[styles.sheetOptionDesc, { color: theme.icon }]}>Browse your photo library</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.icon} />
                </Pressable>

                <Pressable style={[styles.sheetCancel, { backgroundColor: theme.background }]} onPress={onClose}>
                    <Text style={[styles.sheetCancelText, { color: theme.text }]}>Cancel</Text>
                </Pressable>
            </Animated.View>
        </Pressable>
    </Modal>
);

// ── Requirement Input Block ──────────────────────────────────────
const RequirementInput = ({ req, theme, isLast }: any) => {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const [value, setValue] = useState('');
    const [pickedUri, setPickedUri] = useState<string | null>(null);
    const [showSheet, setShowSheet] = useState(false);

    const requestAndPick = async (useCamera: boolean) => {
        setShowSheet(false);
        await new Promise(r => setTimeout(r, 400)); // wait for sheet to close

        if (useCamera) {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: req.type === 'video'
                    ? ImagePicker.MediaTypeOptions.Videos
                    : ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.85,
                aspect: [4, 3],
            });
            if (!result.canceled && result.assets[0]) {
                setPickedUri(result.assets[0].uri);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } else {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: req.type === 'video'
                    ? ImagePicker.MediaTypeOptions.Videos
                    : ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.85,
                aspect: [4, 3],
            });
            if (!result.canceled && result.assets[0]) {
                setPickedUri(result.assets[0].uri);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        }
    };

    const handleUploadPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowSheet(true);
    };

    return (
        <Animated.View layout={Layout.springify()} style={[styles.reqBlock, !isLast && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <PickerSheet
                visible={showSheet}
                onClose={() => setShowSheet(false)}
                onCamera={() => requestAndPick(true)}
                onLibrary={() => requestAndPick(false)}
                theme={theme}
            />

            <View style={styles.reqHeader}>
                <View style={[styles.reqIcon, { backgroundColor: theme.card }]}>
                    {req.type === 'photo' && <Ionicons name="image-outline" size={20} color={theme.primary} />}
                    {req.type === 'video' && <Ionicons name="videocam-outline" size={20} color={theme.primary} />}
                    {req.type === 'text' && <Ionicons name="text-outline" size={20} color={theme.primary} />}
                </View>
                <View style={styles.reqInfo}>
                    <Text style={[styles.reqLabel, { color: theme.text }]}>{req.label}</Text>
                    {req.description && <Text style={[styles.reqDesc, { color: theme.icon }]}>{req.description}</Text>}
                </View>
                {pickedUri && (
                    <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPickedUri(null); }} hitSlop={10}>
                        <Ionicons name="close-circle" size={22} color="#FF3B30" />
                    </Pressable>
                )}
            </View>

            {(req.type === 'photo' || req.type === 'video') ? (
                pickedUri ? (
                    // ── Preview of selected image ──
                    <Animated.View entering={FadeIn.duration(400)} style={styles.previewContainer}>
                        <Image source={{ uri: pickedUri }} style={styles.previewImage} resizeMode="cover" />
                        <View style={styles.previewOverlay}>
                            <Pressable
                                style={[styles.previewChangeBtn, { backgroundColor: theme.card + 'ee' }]}
                                onPress={handleUploadPress}
                            >
                                <Ionicons name="sync-outline" size={16} color={theme.text} />
                                <Text style={[styles.previewChangeBtnText, { color: theme.text }]}>Change</Text>
                            </Pressable>
                        </View>
                        <View style={[styles.previewBadge, { backgroundColor: theme.primary }]}>
                            <Ionicons name="checkmark" size={14} color="#fff" />
                        </View>
                    </Animated.View>
                ) : (
                    // ── Upload prompt ──
                    <AnimatedPressable
                        style={[styles.uploadBox, animatedStyle, { backgroundColor: theme.background, borderColor: theme.border }]}
                        onPressIn={() => { scale.value = withSpring(0.98); }}
                        onPressOut={() => scale.value = withSpring(1)}
                        onPress={handleUploadPress}
                    >
                        <View style={[styles.uploadIconBg, { backgroundColor: theme.card }]}>
                            <Ionicons name="cloud-upload-outline" size={28} color={theme.primary} />
                        </View>
                        <Text style={[styles.uploadText, { color: theme.text }]}>Tap to add {req.type === 'video' ? 'video' : 'photo'}</Text>
                        <Text style={[styles.uploadHint, { color: theme.icon }]}>Camera or Photo Library</Text>
                    </AnimatedPressable>
                )
            ) : (
                <TextInput
                    style={[styles.textInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                    placeholder="Enter text here..."
                    placeholderTextColor={theme.icon}
                    value={value}
                    onChangeText={setValue}
                />
            )}
        </Animated.View>
    );
}


export default function TemplateExecutionScreen() {
    const { id } = useLocalSearchParams();
    const colorScheme = useColorScheme() ?? 'dark';
    const theme = Colors[colorScheme];
    const insets = useSafeAreaInsets();
    const { isPro } = usePurchases();

    const [template, setTemplate] = useState<DesignTemplate | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTemplate() {
            setLoading(true);
            const { data, error } = await supabase
                .from('templates')
                .select('*')
                .eq('id', id)
                .single();

            if (data) {
                // Pro Gating Check
                const isPremium = data.is_pro || data.pro;
                if (isPremium && !isPro) {
                    router.replace('/paywall');
                    return;
                }
                setTemplate(data);
            } else if (MOCK_TEMPLATES[id as string]) {
                setTemplate(MOCK_TEMPLATES[id as string]);
            } else {
                setTemplate(DEFAULT_TEMPLATE);
            }
            setLoading(false);
        }
        fetchTemplate();
    }, [id, isPro]);

    const [aiCaption, setAiCaption] = useState(true);
    const [generationStyle, setGenerationStyle] = useState('Realistic');

    const ctaScale = useSharedValue(1);
    const ctaAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: ctaScale.value }] }));

    if (loading || !template) return null;

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>

                    {/* Header / Video Preview Hero */}
                    <View style={[styles.heroSection, { backgroundColor: theme.card, paddingTop: insets.top }]}>
                        {/* Back Button */}
                        <Pressable style={styles.closeButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
                            <Ionicons name="close-circle" size={32} color="#ffffffdd" />
                        </Pressable>

                        <View style={[styles.videoPlaceholder, { backgroundColor: '#111' }]}>
                            <Ionicons name="play-circle-outline" size={64} color="#ffffff88" />
                            <Text style={styles.videoMockText}>Template Video Preview</Text>
                        </View>

                        <View style={styles.heroDetails}>
                            <Text style={[styles.heroCategory, { color: theme.primary }]}>{template.category}</Text>
                            <Text style={[styles.heroTitle, { color: theme.text }]}>{template.title}</Text>
                        </View>
                    </View>

                    {/* Inputs Section */}
                    <Animated.View entering={FadeInUp.delay(100).duration(600)} style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Template Assets ({template.requirements?.length || 0})</Text>

                        <View style={[styles.cardContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            {template.requirements?.map((req, index) => (
                                <RequirementInput
                                    key={req.id}
                                    req={req}
                                    theme={theme}
                                    isLast={index === (template.requirements?.length ?? 0) - 1}
                                />
                            ))}
                        </View>
                    </Animated.View>

                    {/* Preferences Section */}
                    <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>AI Preferences</Text>

                        <View style={[styles.cardContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>

                            {/* Caption Toggle */}
                            <View style={[styles.prefRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                                <View style={styles.prefInfo}>
                                    <Text style={[styles.prefTitle, { color: theme.text }]}>AI Generated Captions</Text>
                                    <Text style={[styles.prefDesc, { color: theme.icon }]}>Automatically write highly-converting copy</Text>
                                </View>
                                <Pressable
                                    style={[styles.toggle, { backgroundColor: aiCaption ? theme.primary : theme.background, borderColor: aiCaption ? theme.primary : theme.border }]}
                                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAiCaption(!aiCaption); }}
                                >
                                    <Animated.View layout={Layout.springify()} style={[styles.knob, { left: aiCaption ? 22 : 2 }]} />
                                </Pressable>
                            </View>

                            {/* Style Segmentation */}
                            <View style={styles.prefRowVert}>
                                <View style={[styles.prefInfo, { marginBottom: 12 }]}>
                                    <Text style={[styles.prefTitle, { color: theme.text }]}>Visual Style</Text>
                                    <Text style={[styles.prefDesc, { color: theme.icon }]}>How should the AI render the final visuals?</Text>
                                </View>
                                <View style={[styles.segmentedControl, { backgroundColor: theme.background, borderColor: theme.border }]}>
                                    {['Realistic', 'Cinematic', '3D Stylized'].map((style) => (
                                        <Pressable
                                            key={style}
                                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setGenerationStyle(style); }}
                                            style={[styles.segment, generationStyle === style && { backgroundColor: theme.card }]}
                                        >
                                            <Text style={[styles.segmentText, { color: generationStyle === style ? theme.text : theme.icon }, generationStyle === style && { fontWeight: '700' }]}>{style}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                        </View>
                    </Animated.View>

                    {/* Spacer for bottom bar */}
                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Sticky Action Bar */}
                <Animated.View entering={FadeInDown.delay(400).duration(500)} style={[styles.actionBar, { backgroundColor: theme.card, borderTopColor: theme.border, paddingBottom: insets.bottom || 24 }]}>
                    <View style={styles.creditsCost}>
                        <Text style={[styles.costLabel, { color: theme.icon }]}>Cost</Text>
                        <View style={styles.costBadge}>
                            <Ionicons name="flash" size={14} color="#FF9F0A" />
                            <Text style={[styles.costValue, { color: theme.text }]}>5</Text>
                        </View>
                    </View>

                    <AnimatedPressable
                        style={[styles.createBtn, ctaAnimatedStyle, { backgroundColor: theme.primary }]}
                        onPressIn={() => { ctaScale.value = withSpring(0.95); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        onPressOut={() => ctaScale.value = withSpring(1)}
                        onPress={async () => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

                            if (!isMock) {
                                const { error } = await supabase.from('generated_assets').insert({
                                    template_id: template.id,
                                    title: `${template.title} Output`,
                                    prompt: `Style: ${generationStyle}, Captions: ${aiCaption}`,
                                    asset_type: 'image'
                                });
                                if (error) console.error("Error creating asset", error);
                            }

                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            setTimeout(() => { router.back(); }, 1500);
                        }}
                    >
                        <Ionicons name="color-wand" size={20} color="#fff" />
                        <Text style={styles.createBtnText}>Generate Asset</Text>
                    </AnimatedPressable>
                </Animated.View>

            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: {},
    heroSection: { borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' },
    closeButton: { position: 'absolute', top: 50, right: 20, zIndex: 10, },
    videoPlaceholder: { width: '100%', height: height * 0.35, justifyContent: 'center', alignItems: 'center' },
    videoMockText: { color: '#ffffff88', marginTop: 12, fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
    heroDetails: { padding: 24, paddingVertical: 20 },
    heroCategory: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
    heroTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },

    section: { paddingHorizontal: 20, marginTop: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, marginLeft: 4 },
    cardContainer: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },

    reqBlock: { padding: 16 },
    reqHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    reqIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    reqInfo: { flex: 1 },
    reqLabel: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    reqDesc: { fontSize: 13, fontWeight: '500' },
    uploadBox: { height: 120, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 8 },
    uploadIconBg: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    uploadText: { fontSize: 14, fontWeight: '700' },
    uploadHint: { fontSize: 12, fontWeight: '500' },
    uploadedState: { alignItems: 'center', justifyContent: 'center' },
    uploadedText: { fontSize: 14, fontWeight: '700', marginTop: 6 },
    textInput: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, fontSize: 15, fontWeight: '500' },

    previewContainer: { borderRadius: 16, overflow: 'hidden', height: 180 },
    previewImage: { width: '100%', height: '100%' },
    previewOverlay: { position: 'absolute', bottom: 12, left: 12, right: 12, alignItems: 'flex-start' },
    previewChangeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    previewChangeBtnText: { fontSize: 13, fontWeight: '700' },
    previewBadge: { position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },

    sheetOverlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
    sheetContainer: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 20 },
    sheetOption: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, borderWidth: 1, marginBottom: 12 },
    sheetOptionIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    sheetOptionText: { flex: 1 },
    sheetOptionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    sheetOptionDesc: { fontSize: 13, fontWeight: '500' },
    sheetCancel: { padding: 16, borderRadius: 18, alignItems: 'center', marginTop: 4 },
    sheetCancelText: { fontSize: 16, fontWeight: '600' },

    prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    prefRowVert: { padding: 20 },
    prefInfo: { flex: 1, paddingRight: 20 },
    prefTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    prefDesc: { fontSize: 13, fontWeight: '500', lineHeight: 18 },

    toggle: { width: 50, height: 30, borderRadius: 15, borderWidth: 1, justifyContent: 'center' },
    knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', position: 'absolute' },

    segmentedControl: { flexDirection: 'row', padding: 4, borderRadius: 16, borderWidth: 1 },
    segment: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
    segmentText: { fontSize: 13, fontWeight: '600' },

    actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
    creditsCost: { marginRight: 24 },
    costLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
    costBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    costValue: { fontSize: 18, fontWeight: '800' },
    createBtn: { flex: 1, flexDirection: 'row', height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', gap: 8 },
    createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
