import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeInRight, useSharedValue, useAnimatedStyle, withSpring, Layout } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const EventCard = ({ title, subtitle, icon, iconColor, theme }: any) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View layout={Layout.springify()}>
      <AnimatedPressable 
        style={[styles.eventCard, animatedStyle, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPressIn={() => { scale.value = withSpring(0.96); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        onPressOut={() => scale.value = withSpring(1)}
      >
        <Ionicons name={icon} size={24} color={iconColor} />
        <View style={styles.eventInfo}>
          <Text style={[styles.eventTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.eventSubtitle, { color: theme.icon }]}>{subtitle}</Text>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

// Mock data referencing specific days
const MOCK_CALENDAR_DATA: Record<number, any[]> = {
  12: [{ id: 1, title: 'Strategy Sync', subtitle: 'Review Monthly Goals', icon: 'chatbubbles-outline', color: '#5E5CE6' }],
  13: [
    { id: 2, title: 'Tip: Engage Audience', subtitle: 'Add AI-generated captions to your stories.', icon: 'sparkles', color: '#FF375F' },
    { id: 3, title: 'Draft Post', subtitle: 'Instagram Reel • Marketing Campaign', icon: 'image-outline', color: '#32ADE6' }
  ],
  14: [{ id: 4, title: 'Post Published', subtitle: 'Facebook Ad - Q3', icon: 'checkmark-circle-outline', color: '#34C759' }],
  15: [{ id: 5, title: 'Analytics Review', subtitle: 'Check reach on recent posts', icon: 'bar-chart-outline', color: '#FF9F0A' }],
  16: [],
};

export default function CalendarScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  
  // Reactivity State
  const [selectedDay, setSelectedDay] = useState(13);
  const currentEvents = MOCK_CALENDAR_DATA[selectedDay] || [];

  const handleDaySelect = (day: number) => {
    Haptics.selectionAsync();
    setSelectedDay(day);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(100).duration(800)} style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Plan</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>Your marketing rhythm</Text>
        </Animated.View>

        {/* Date Strip */}
        <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.dateStrip}>
          {[12, 13, 14, 15, 16].map((day, ix) => {
            const isSelected = selectedDay === day;
            const daysArr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
            return (
              <Pressable 
                key={day} 
                onPress={() => handleDaySelect(day)}
                style={[styles.dateBox, isSelected && { backgroundColor: theme.primary }]}
              >
                <Text style={[styles.dayText, { color: isSelected ? theme.background : theme.icon }]}>{daysArr[ix]}</Text>
                <Text style={[styles.dateText, { color: isSelected ? theme.background : theme.text }]}>{day}</Text>
              </Pressable>
            );
          })}
        </Animated.View>

        {/* Action Items */}
        <Animated.View layout={Layout.springify()} style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {selectedDay === 13 ? "Today's Focus" : "Agenda"}
          </Text>
        </Animated.View>

        <View style={styles.eventList}>
          {currentEvents.length > 0 ? (
            currentEvents.map((event, index) => (
              <Animated.View key={event.id} entering={FadeInRight.delay(index * 100)}>
                <EventCard 
                  title={event.title} 
                  subtitle={event.subtitle} 
                  icon={event.icon} 
                  iconColor={event.color || theme.primary} 
                  theme={theme} 
                />
              </Animated.View>
            ))
          ) : (
            <Animated.View entering={FadeInUp} style={styles.emptyState}>
               <Text style={[styles.emptyStateText, { color: theme.icon }]}>No tasks scheduled for this day.</Text>
               <Pressable 
                 style={[styles.emptyCta, { backgroundColor: theme.primary }]}
                 onPress={() => router.push('/(tabs)/tools')}
               >
                 <Text style={styles.emptyCtaText}>Generate a Campaign</Text>
                 <Ionicons name="arrow-forward" size={16} color="#fff" />
               </Pressable>
            </Animated.View>
          )}
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
  dateStrip: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  dateBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16 },
  dayText: { fontSize: 13, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  dateText: { fontSize: 20, fontWeight: '700' },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 22, fontWeight: '700' },
  eventList: { gap: 16 },
  eventCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, borderWidth: 1, gap: 16 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  eventSubtitle: { fontSize: 14, fontWeight: '500' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyStateText: { fontSize: 16, fontWeight: '500', marginBottom: 16 },
  emptyCta: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, gap: 8 },
  emptyCtaText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
