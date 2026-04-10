import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, Pressable, Modal, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeInRight, useSharedValue, useAnimatedStyle, withSpring, Layout, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const EVENT_COLORS = ['#6C63FF', '#FF375F', '#32ADE6', '#34C759', '#FF9F0A', '#E1306C'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function toDateString(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const EventCard = ({ event, theme, onDelete }: any) => {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View layout={Layout.springify()} entering={FadeInRight.duration(400)}>
      <AnimatedPressable
        style={[styles.eventCard, animStyle, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPressIn={() => { scale.value = withSpring(0.97); }}
        onPressOut={() => scale.value = withSpring(1)}
      >
        <View style={[styles.eventIconBox, { backgroundColor: event.icon_color + '22' }]}>
          <Ionicons name={event.icon || 'calendar-outline'} size={22} color={event.icon_color || theme.primary} />
        </View>
        <View style={styles.eventInfo}>
          <Text style={[styles.eventTitle, { color: theme.text }]}>{event.title}</Text>
          {event.description && <Text style={[styles.eventSubtitle, { color: theme.icon }]} numberOfLines={2}>{event.description}</Text>}
          {event.event_time && <Text style={[styles.eventTime, { color: event.icon_color || theme.primary }]}>{event.event_time.slice(0, 5)}</Text>}
        </View>
        <Pressable onPress={() => onDelete(event.id)} style={styles.deleteBtn} hitSlop={10}>
          <Ionicons name="trash-outline" size={18} color="#FF3B30" />
        </Pressable>
      </AnimatedPressable>
    </Animated.View>
  );
};

export default function CalendarScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [events, setEvents] = useState<any[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTime, setNewTime] = useState('');
  const [selectedColor, setSelectedColor] = useState(EVENT_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const selectedDateStr = toDateString(currentYear, currentMonth, selectedDay);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const startDate = toDateString(currentYear, currentMonth, 1);
    const endDate = toDateString(currentYear, currentMonth, daysInMonth);
    
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('event_date', startDate)
      .lte('event_date', endDate)
      .order('event_time', { ascending: true });

    if (!error) {
      setAllEvents(data || []);
    }
    setLoading(false);
  }, [currentYear, currentMonth, daysInMonth]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Supabase Realtime Subscription
  useEffect(() => {
    const channel = supabase.channel('calendar_events_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => { 
      if (channel) supabase.removeChannel(channel); 
    };
  }, [fetchEvents]);

  useEffect(() => {
    const dayEvents = allEvents.filter(e => e.event_date === selectedDateStr);
    setEvents(dayEvents);
  }, [selectedDay, allEvents, selectedDateStr]);

  const getDotDates = () => {
    const dates = new Set<string>();
    allEvents.forEach(e => dates.add(e.event_date));
    return dates;
  };
  const dotDates = getDotDates();

  const handlePrevMonth = () => {
    Haptics.selectionAsync();
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    Haptics.selectionAsync();
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
    setSelectedDay(1);
  };

  const handleAddEvent = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('calendar_events').insert({
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      event_date: selectedDateStr,
      event_time: newTime || null,
      icon: 'calendar-outline',
      icon_color: selectedColor,
    });
    if (!error) {
      setNewTitle('');
      setNewDesc('');
      setNewTime('');
      setSelectedColor(EVENT_COLORS[0]);
      setShowAddModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setSaving(false);
  };

  const handleDeleteEvent = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await supabase.from('calendar_events').delete().eq('id', id);
  };

  const isToday = (day: number) =>
    day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <Animated.View entering={FadeInUp.delay(50).duration(600)} style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Plan</Text>
            <Text style={[styles.subtitle, { color: theme.icon }]}>Your marketing rhythm</Text>
          </View>
          <Pressable
            style={[styles.addButton, { backgroundColor: theme.primary }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAddModal(true); }}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </Animated.View>

        {/* Month Navigator */}
        <Animated.View entering={FadeInUp.delay(100).duration(600)} style={[styles.monthNav, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Pressable onPress={handlePrevMonth} style={styles.monthNavBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <View style={styles.monthLabel}>
            <Text style={[styles.monthText, { color: theme.text }]}>{MONTHS[currentMonth]}</Text>
            <Text style={[styles.yearText, { color: theme.icon }]}>{currentYear}</Text>
          </View>
          <Pressable onPress={handleNextMonth} style={styles.monthNavBtn}>
            <Ionicons name="chevron-forward" size={22} color={theme.text} />
          </Pressable>
        </Animated.View>

        {/* Calendar Grid */}
        <Animated.View entering={FadeInUp.delay(150).duration(600)} style={[styles.calendarGrid, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Day Labels */}
          <View style={styles.dayLabels}>
            {DAYS_SHORT.map(d => (
              <Text key={d} style={[styles.dayLabel, { color: theme.icon }]}>{d}</Text>
            ))}
          </View>

          {/* Date Grid */}
          <View style={styles.datesGrid}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.dateCell} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected = selectedDay === day;
              const isTodayDate = isToday(day);
              const dateStr = toDateString(currentYear, currentMonth, day);
              const hasEvent = dotDates.has(dateStr);

              return (
                <Pressable
                  key={day}
                  style={[
                    styles.dateCell,
                    isSelected && { backgroundColor: theme.primary, borderRadius: 14 },
                    !isSelected && isTodayDate && { borderWidth: 2, borderColor: theme.primary, borderRadius: 14 }
                  ]}
                  onPress={() => { Haptics.selectionAsync(); setSelectedDay(day); }}
                >
                  <Text style={[
                    styles.dateNum,
                    { color: isSelected ? '#fff' : isTodayDate ? theme.primary : theme.text }
                  ]}>
                    {day}
                  </Text>
                  {hasEvent && <View style={[styles.eventDot, { backgroundColor: isSelected ? '#ffffffbb' : theme.primary }]} />}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Events Section */}
        <View style={styles.eventsSection}>
          <Animated.View layout={Layout.springify()} style={styles.eventsSectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {isToday(selectedDay) && currentMonth === today.getMonth() && currentYear === today.getFullYear()
                ? "Today's Agenda"
                : `${MONTHS[currentMonth]} ${selectedDay}`}
            </Text>
            {loading && <ActivityIndicator size="small" color={theme.primary} />}
          </Animated.View>

          {!loading && events.length === 0 ? (
            <Animated.View entering={FadeIn.duration(400)} style={styles.emptyState}>
              <Ionicons name="calendar-clear-outline" size={40} color={theme.icon} />
              <Text style={[styles.emptyText, { color: theme.icon }]}>Nothing planned for this day.</Text>
              <Pressable
                style={[styles.emptyCta, { backgroundColor: theme.primary }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAddModal(true); }}
              >
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.emptyCtaText}>Add an Event</Text>
              </Pressable>
            </Animated.View>
          ) : (
            <View style={styles.eventList}>
              {events.map((event) => (
                <EventCard key={event.id} event={event} theme={theme} onDelete={handleDeleteEvent} />
              ))}
            </View>
          )}
        </View>

      </ScrollView>

      {/* Add Event Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
            
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>New Event</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Ionicons name="close-circle" size={28} color={theme.icon} />
              </Pressable>
            </View>

            <Text style={[styles.modalDateLabel, { color: theme.primary }]}>
              {MONTHS[currentMonth]} {selectedDay}, {currentYear}
            </Text>

            <View style={styles.modalForm}>
              <Text style={[styles.inputLabel, { color: theme.icon }]}>Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g., Post scheduled, Strategy sync..."
                placeholderTextColor={theme.icon}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={[styles.inputLabel, { color: theme.icon }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                placeholder="Optional details..."
                placeholderTextColor={theme.icon}
                value={newDesc}
                onChangeText={setNewDesc}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.inputLabel, { color: theme.icon }]}>Time (HH:MM)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g., 14:30"
                placeholderTextColor={theme.icon}
                value={newTime}
                onChangeText={setNewTime}
                keyboardType="numbers-and-punctuation"
              />

              <Text style={[styles.inputLabel, { color: theme.icon }]}>Color</Text>
              <View style={styles.colorRow}>
                {EVENT_COLORS.map(c => (
                  <Pressable
                    key={c}
                    style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotSelected]}
                    onPress={() => { Haptics.selectionAsync(); setSelectedColor(c); }}
                  />
                ))}
              </View>
            </View>

            <Pressable
              style={[styles.saveBtn, { backgroundColor: newTitle.trim() ? theme.primary : theme.border }]}
              onPress={handleAddEvent}
              disabled={!newTitle.trim() || saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Save Event</Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 16, fontWeight: '500' },
  addButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 16 },
  monthNavBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  monthLabel: { alignItems: 'center' },
  monthText: { fontSize: 18, fontWeight: '700' },
  yearText: { fontSize: 13, fontWeight: '500', marginTop: 2 },

  calendarGrid: { borderRadius: 24, borderWidth: 1, padding: 16, marginBottom: 28 },
  dayLabels: { flexDirection: 'row', marginBottom: 8 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  datesGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dateCell: { width: `${100 / 7}%`, aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  dateNum: { fontSize: 15, fontWeight: '600' },
  eventDot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },

  eventsSection: {},
  eventsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 22, fontWeight: '700' },
  eventList: { gap: 12 },
  eventCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, borderWidth: 1, gap: 14 },
  eventIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  eventSubtitle: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  eventTime: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  deleteBtn: { padding: 4 },
  emptyState: { paddingVertical: 40, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500' },
  emptyCta: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, gap: 8, marginTop: 4 },
  emptyCtaText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  modalContainer: { flex: 1, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 22, fontWeight: '800' },
  modalDateLabel: { fontSize: 14, fontWeight: '600', marginBottom: 24 },
  modalForm: { gap: 6, marginBottom: 24 },
  inputLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 12 },
  input: { padding: 14, borderRadius: 16, borderWidth: 1, fontSize: 15, fontWeight: '500' },
  textArea: { height: 80, textAlignVertical: 'top' },
  colorRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: '#fff', transform: [{ scale: 1.15 }] },
  saveBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 56, borderRadius: 28, gap: 10 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
