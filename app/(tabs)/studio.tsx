import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, TextInput, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeIn, useSharedValue, useAnimatedStyle, withSpring, Layout } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ExpandableSettingsRow = ({ icon, title, description, children, theme, isDanger = false }: any) => {
  const [expanded, setExpanded] = useState(false);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
  };
  
  return (
    <Animated.View layout={Layout.springify()} style={[styles.settingsRowContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <AnimatedPressable 
        style={[styles.settingsRow, animatedStyle]}
        onPressIn={() => { scale.value = withSpring(0.98); }}
        onPressOut={() => scale.value = withSpring(1)}
        onPress={handlePress}
      >
        <View style={[styles.iconCircle, { backgroundColor: isDanger ? '#FF3B3015' : theme.border }]}>
          <Ionicons name={icon} size={20} color={isDanger ? '#FF3B30' : theme.text} />
        </View>
        <View style={styles.settingsRowText}>
          <Text style={[styles.settingsRowTitle, { color: isDanger ? '#FF3B30' : theme.text }]}>{title}</Text>
          {description && !expanded && <Text style={[styles.settingsRowDesc, { color: theme.icon }]} numberOfLines={1}>{description}</Text>}
        </View>
        <Ionicons name={expanded ? "chevron-down" : "chevron-forward"} size={18} color={theme.icon} />
      </AnimatedPressable>

      {expanded && (
        <Animated.View entering={FadeInUp.duration(300)} style={styles.expandedContent}>
          {children}
        </Animated.View>
      )}
    </Animated.View>
  );
}

export default function StudioScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

  const [alias, setAlias] = useState('Creator');
  const [interest, setInterest] = useState('Marketing Agency');

  const subScale = useSharedValue(1);
  const subAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: subScale.value }] }));

  const PREVIOUS_WORK = [
    { id: '1', title: 'Summer Promo', type: 'Generated Ad' },
    { id: '2', title: 'CEO Intro', type: 'Copywriting' },
    { id: '3', title: 'Q3 Flyer', type: 'Design Asset' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Header */}
        <Animated.View entering={FadeInUp.delay(100).duration(800)} style={styles.profileHeader}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.border }]}>
            <Ionicons name="person" size={40} color={theme.icon} />
          </View>
          <Text style={[styles.name, { color: theme.text }]}>{alias}</Text>
          <Text style={[styles.planBadge, { color: theme.primary, borderColor: theme.primary }]}>Free Plan</Text>
        </Animated.View>

        {/* Subscription & Credits */}
        <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.creditHeader}>
              <Ionicons name="flash" size={18} color="#FF9F0A" />
              <Text style={[styles.statLabel, { color: theme.icon }]}>Credits</Text>
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>150</Text>
          </View>
          
          <AnimatedPressable 
            style={[styles.subBox, subAnimatedStyle, { backgroundColor: theme.primary }]}
            onPressIn={() => { subScale.value = withSpring(0.95); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            onPressOut={() => subScale.value = withSpring(1)}
          >
            <Text style={[styles.subText, { color: theme.background }]}>Upgrade API</Text>
            <Text style={[styles.subDesc, { color: theme.background + 'dd' }]}>Connect RevenueCat</Text>
          </AnimatedPressable>
        </Animated.View>

        {/* Reintroduced Previous Work Module */}
        <Animated.View entering={FadeIn.delay(300).duration(600)} style={styles.historySection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Previous Generations</Text>
          <FlatList
             data={PREVIOUS_WORK}
             keyExtractor={i => i.id}
             horizontal
             showsHorizontalScrollIndicator={false}
             contentContainerStyle={styles.historyList}
             renderItem={({ item }) => (
               <View style={[styles.historyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                 <View style={[styles.historyImage, { backgroundColor: theme.border }]} />
                 <Text style={[styles.historyTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                 <Text style={[styles.historySubtitle, { color: theme.icon }]} numberOfLines={1}>{item.type}</Text>
               </View>
             )}
          />
        </Animated.View>

        {/* Scalable Expandable Settings List */}
        <Animated.View layout={Layout.springify()} entering={FadeIn.delay(400).duration(600)} style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Application Core</Text>
          
          <View style={styles.settingsBlock}>
             <ExpandableSettingsRow icon="person-outline" title="Creator Profile" description="Edit your Alias and preferences" theme={theme}>
                <View style={styles.editorContent}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.icon }]}>Alias</Text>
                    <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} value={alias} onChangeText={setAlias} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.icon }]}>Focus / Industry</Text>
                    <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} value={interest} onChangeText={setInterest} />
                  </View>
                </View>
             </ExpandableSettingsRow>

             <ExpandableSettingsRow icon="server-outline" title="Database Configuration" description="Environment connectivity & sync" theme={theme}>
               <Text style={[styles.mockEnvText, { color: theme.icon }]}>Syncing with SECURE_DB_URL via Expo dotenv. Subscriptions routed to RevenueCat identifiers.</Text>
             </ExpandableSettingsRow>

             <ExpandableSettingsRow icon="shield-checkmark-outline" title="Manage Permissions" description="Camera, Photos, Push Notifications" theme={theme}>
               <Text style={[styles.mockEnvText, { color: theme.text }]}>• Notifications: Enabled</Text>
               <Text style={[styles.mockEnvText, { color: theme.text }]}>• Photo Library: Off</Text>
             </ExpandableSettingsRow>
             
             <ExpandableSettingsRow icon="cart-outline" title="Restore Purchases" description="Sync your App Store subscriptions" theme={theme}>
                <Pressable style={[styles.miniButton, { backgroundColor: theme.primary }]}><Text style={styles.miniBtnText}>Restore via RevenueCat SDK</Text></Pressable>
             </ExpandableSettingsRow>

             <ExpandableSettingsRow icon="trash-outline" title="Delete Account" description="Erase all generation data" isDanger theme={theme}>
               <Text style={[styles.mockEnvText, { color: '#FF3B30' }]}>This action is irreversible and drops your configuration from the DB securely.</Text>
             </ExpandableSettingsRow>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingVertical: 24, paddingBottom: 100 },
  profileHeader: { alignItems: 'center', marginTop: 20, marginBottom: 32 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  name: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  planBadge: { fontSize: 13, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, overflow: 'hidden'},
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 40, paddingHorizontal: 24 },
  statBox: { flex: 1, padding: 20, borderRadius: 24, alignItems: 'flex-start', borderWidth: 1 },
  creditHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statValue: { fontSize: 32, fontWeight: '800' },
  statLabel: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase' },
  subBox: { flex: 1.2, padding: 20, borderRadius: 24, justifyContent: 'center' },
  subText: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  subDesc: { fontSize: 13, fontWeight: '500' },

  historySection: { marginBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16, paddingHorizontal: 24 },
  historyList: { paddingHorizontal: 24, gap: 12 },
  historyCard: { width: 140, padding: 12, borderRadius: 20, borderWidth: 1 },
  historyImage: { width: '100%', height: 100, borderRadius: 12, marginBottom: 12 },
  historyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  historySubtitle: { fontSize: 13, fontWeight: '500' },

  settingsSection: { marginBottom: 20 },
  settingsBlock: { gap: 12, paddingHorizontal: 24 },
  settingsRowContainer: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  settingsRowText: { flex: 1 },
  settingsRowTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  settingsRowDesc: { fontSize: 13, fontWeight: '500' },
  expandedContent: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.1)' },
  
  editorContent: { marginTop: 12 },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginLeft: 4, textTransform: 'uppercase' },
  input: { padding: 14, borderRadius: 16, borderWidth: 1, fontSize: 15, fontWeight: '500' },
  mockEnvText: { fontSize: 14, lineHeight: 22, marginTop: 8 },
  miniButton: { padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  miniBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
