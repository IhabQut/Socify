import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, Pressable, 
  ActivityIndicator, Dimensions, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { 
  FadeInUp, 
  FadeIn, 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  Layout,
  interpolateColor
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { StorageService } from '@/services/storageService';
import { usePurchases } from '@/hooks/use-purchases';
import { NotificationService } from '@/services/notificationService';

const { width } = Dimensions.get('window');

// 30 Days of Content with multiple tasks
const ROADMAP_CONTENT: Record<number, { title: string; tasks: { id: string; title: string; desc: string; reward: number }[] }> = {};

const taskTemplates = [
  { title: "Audit & Fix", desc: "Review and refine your profile elements." },
  { title: "Engagement", desc: "Connect with others in your niche." },
  { title: "Content Strategy", desc: "Plan and create high-value posts." },
  { title: "Analytics", desc: "Measure performance and adapt." }
];

// Seed 30 days of content
for (let i = 1; i <= 30; i++) {
  ROADMAP_CONTENT[i] = {
    title: `Phase ${Math.ceil(i/7)}: Day ${i}`,
    tasks: [
      { id: `${i}_1`, title: `${taskTemplates[(i-1)%4].title}`, desc: `${taskTemplates[(i-1)%4].desc}`, reward: 5 },
      { id: `${i}_2`, title: `Growth Task ${i}`, desc: "Special activity for today's objective.", reward: 5 }
    ]
  };
}

const WEEKLY_BONUS = 50;

export default function CalendarScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const { isPro, isLoading: subLoading } = usePurchases();

  const [loading, setLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [planStartDate, setPlanStartDate] = useState<number | null>(null);
  const [credits, setCredits] = useState(0);
  const [selectedDay, setSelectedDay] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);

  const dayListRef = useRef<FlatList>(null);

  useEffect(() => {
    initData();
  }, [isPro]);

  const initData = async () => {
    if (!isPro) return;
    setLoading(true);
    
    let start = await StorageService.getPlanStartDate();
    if (!start) {
      start = Date.now();
      await StorageService.setPlanStartDate(start);
    }
    setPlanStartDate(start);

    // Calculate current day and set as default selected
    const diff = Date.now() - start;
    const currentDay = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    const clampedDay = Math.min(Math.max(currentDay, 1), 30);
    setSelectedDay(clampedDay);
    
    // Scroll to today
    setTimeout(() => {
      dayListRef.current?.scrollToIndex({ index: clampedDay - 1, animated: true, viewPosition: 0.5 });
    }, 500);

    const completed = await StorageService.getCompletedTasks();
    setCompletedTasks(completed);

    const balance = await StorageService.getUserCredits();
    setCredits(balance);

    // Schedule daily reminder at 10 AM if not already set
    NotificationService.scheduleDailyReminder(10, 0);
    
    setLoading(false);
  };

  const currentPlanDay = useMemo(() => {
    if (!planStartDate) return 1;
    const diff = Date.now() - planStartDate;
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  }, [planStartDate]);

  const getDayStatus = (dayId: number) => {
    const tasks = ROADMAP_CONTENT[dayId].tasks;
    const isToday = dayId === currentPlanDay;
    const allDone = tasks.every(t => completedTasks.includes(t.id));
    
    if (allDone) return 'completed';
    if (dayId < currentPlanDay) return 'missed';
    if (isToday) return 'current';
    return 'locked';
  };

  const handleTaskComplete = async (taskId: string, reward: number) => {
    if (completedTasks.includes(taskId)) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const success = await StorageService.markTaskComplete(taskId);
    if (success) {
      await StorageService.grantCredits(reward);
      setCompletedTasks(prev => [...prev, taskId]);
      setCredits(prev => prev + reward);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
  };

  const selectedDayTasks = ROADMAP_CONTENT[selectedDay].tasks;
  const dayProgress = selectedDayTasks.filter(t => completedTasks.includes(t.id)).length / selectedDayTasks.length;

  if (loading || subLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!isPro) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.proLockedContainer}>
          <Ionicons name="lock-closed" size={64} color={theme.accent} />
          <Text style={[styles.proLockedTitle, { color: theme.text }]}>Unlock 30-Day Plan</Text>
          <Text style={[styles.proLockedSubtitle, { color: theme.icon }]}>Activate Socify Pro to get your personalized daily growth roadmap and earn credits.</Text>
          <Pressable style={[styles.proBtn, { backgroundColor: theme.primary }]} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}>
            <Text style={[styles.proBtnText, { color: theme.background }]}>View Plans</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Daily Plan</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>Day {currentPlanDay} Tracking</Text>
        </View>
        <View style={[styles.creditBadge, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="flash" size={14} color={theme.accent} />
          <Text style={[styles.creditText, { color: theme.text }]}>{credits} Credits</Text>
        </View>
      </View>

      {/* Horizontal Day Navigation */}
      <View style={[styles.navWrapper, { borderBottomColor: theme.border }]}>
        <FlatList
          ref={dayListRef}
          data={Object.keys(ROADMAP_CONTENT).map(Number)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayNavList}
          keyExtractor={(item) => item.toString()}
          getItemLayout={(_, index) => ({ length: 64, offset: 64 * index, index })}
          renderItem={({ item: dayId }) => {
            const status = getDayStatus(dayId);
            const isSelected = selectedDay === dayId;
            let bgColor = theme.card;
            let borderColor = theme.border;
            let textColor = theme.text;

            if (status === 'completed') { bgColor = theme.success + '20'; borderColor = theme.success; textColor = theme.success; }
            if (status === 'missed') { bgColor = theme.danger + '20'; borderColor = theme.danger; textColor = theme.danger; }
            if (status === 'current') { borderColor = theme.accent; textColor = theme.accent; }
            if (isSelected) { bgColor = theme.primary; borderColor = theme.primary; textColor = theme.background; }

            return (
              <Pressable 
                onPress={() => { setSelectedDay(dayId); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.dayCircle, { backgroundColor: bgColor, borderColor: borderColor }]}
              >
                <Text style={[styles.dayCircleText, { color: textColor }]}>D{dayId}</Text>
                {status === 'completed' && <Ionicons name="checkmark-circle" size={12} color={theme.success} style={styles.statusDot} />}
                {status === 'missed' && <Ionicons name="alert-circle" size={12} color={theme.danger} style={styles.statusDot} />}
              </Pressable>
            );
          }}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Selected Day Header */}
        <Animated.View entering={FadeInUp.duration(600)} style={[styles.dayHeader, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.dayTitleRow}>
            <Text style={[styles.dayTitle, { color: theme.text }]}>{ROADMAP_CONTENT[selectedDay].title}</Text>
            <Text style={[styles.progressText, { color: theme.accent }]}>{Math.round(dayProgress * 100)}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <Animated.View style={[styles.progressFill, { backgroundColor: theme.accent, width: `${dayProgress * 100}%` }]} />
          </View>
        </Animated.View>

        {/* Task List */}
        <View style={styles.taskList}>
          {selectedDayTasks.map((task, index) => {
            const isDone = completedTasks.includes(task.id);
            const canComplete = selectedDay <= currentPlanDay;

            return (
              <Animated.View 
                key={task.id} 
                entering={FadeInUp.delay(index * 100)}
                style={[styles.taskCard, { backgroundColor: theme.card, borderColor: isDone ? theme.success + '40' : theme.border, opacity: canComplete ? 1 : 0.6 }]}
              >
                <View style={styles.taskInfo}>
                  <Text style={[styles.taskTitle, { color: theme.text, textDecorationLine: isDone ? 'line-through' : 'none' }]}>{task.title}</Text>
                  <Text style={[styles.taskDesc, { color: theme.icon }]}>{task.desc}</Text>
                </View>
                
                {isDone ? (
                  <View style={styles.doneBadge}>
                    <Ionicons name="checkmark-done" size={20} color={theme.success} />
                  </View>
                ) : (
                  <Pressable 
                    onPress={() => handleTaskComplete(task.id, task.reward)}
                    disabled={!canComplete}
                    style={[styles.checkBtn, { backgroundColor: canComplete ? theme.primary : theme.border }]}
                  >
                    <Ionicons name="flash" size={16} color={theme.background} />
                    <Text style={[styles.checkBtnText, { color: theme.background }]}>+{task.reward}</Text>
                  </Pressable>
                )}
              </Animated.View>
            );
          })}
        </View>

        {selectedDay > currentPlanDay && (
          <View style={styles.lockedHint}>
            <Ionicons name="lock-closed" size={16} color={theme.icon} />
            <Text style={[styles.lockedHintText, { color: theme.icon }]}>This day will unlock in {selectedDay - currentPlanDay} days.</Text>
          </View>
        )}

      </ScrollView>

      {/* Success Overlay */}
      {showSuccess && (
        <Animated.View entering={FadeIn} style={[styles.successOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.successPop, { backgroundColor: theme.card }]}>
            <Ionicons name="star" size={50} color={theme.accent} />
            <Text style={[styles.successPopTitle, { color: theme.text }]}>Task Done!</Text>
            <Text style={[styles.successPopSub, { color: theme.icon }]}>Credits added to your balance.</Text>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  title: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  subtitle: { fontSize: 14, fontWeight: '600' },
  creditBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  creditText: { fontSize: 14, fontWeight: '800' },

  navWrapper: { paddingVertical: 12, borderBottomWidth: 1 },
  dayNavList: { paddingHorizontal: 20, gap: 12 },
  dayCircle: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  dayCircleText: { fontSize: 14, fontWeight: '800' },
  statusDot: { position: 'absolute', top: -2, right: -2 },

  scrollContent: { padding: 20, paddingBottom: 100 },
  dayHeader: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 24 },
  dayTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dayTitle: { fontSize: 20, fontWeight: '800' },
  progressText: { fontSize: 16, fontWeight: '800' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

  taskList: { gap: 16 },
  taskCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 24, borderWidth: 1 },
  taskInfo: { flex: 1, gap: 4 },
  taskTitle: { fontSize: 17, fontWeight: '700' },
  taskDesc: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  checkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  checkBtnText: { fontSize: 14, fontWeight: '800' },
  doneBadge: { width: 40, alignItems: 'center' },

  lockedHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 40 },
  lockedHintText: { fontSize: 14, fontWeight: '600' },

  proLockedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 20 },
  proLockedTitle: { fontSize: 26, fontWeight: '900' },
  proLockedSubtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  proBtn: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 30 },
  proBtnText: { fontSize: 16, fontWeight: '800' },

  successOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  successPop: { padding: 40, borderRadius: 32, alignItems: 'center', gap: 16, elevation: 5 },
  successPopTitle: { fontSize: 24, fontWeight: '900' },
  successPopSub: { fontSize: 15, fontWeight: '500', textAlign: 'center' },
});
