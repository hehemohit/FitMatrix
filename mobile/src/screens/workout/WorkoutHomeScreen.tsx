import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useSafeTopInset } from '../../hooks/useSafeTopInset';
import { useWorkoutHistoryStore } from '../../store/useWorkoutHistoryStore';
import { useTrainerStore } from '../../store/useTrainerStore';
import { useWorkoutSessionStore } from '../../store/useWorkoutSessionStore';
import { useDashboardTabStore } from '../../store/useDashboardTabStore';
import { useWorkoutScheduleStore } from '../../store/useWorkoutScheduleStore';
import { WorkoutWeekStrip } from '../../components/workout/WorkoutWeekStrip';
import { TodayWorkoutHeroCard } from '../../components/workout/TodayWorkoutHeroCard';
import { GymCheckInCard } from '../../components/workout/GymCheckInCard';
import { BodyWeightTrendCard } from '../../components/workout/BodyWeightTrendCard';
import { WorkoutStreakSummaryCard } from '../../components/workout/WorkoutStreakSummaryCard';
import { WeighInModal } from '../../components/macrofactor/WeighInModal';

interface WorkoutHomeScreenProps {
  onStartTodayWorkout: () => void;
  onOpenSettings?: () => void;
  onCheckIn?: () => void;
}

export const WorkoutHomeScreen: React.FC<WorkoutHomeScreenProps> = ({
  onStartTodayWorkout,
  onOpenSettings,
  onCheckIn,
}) => {
  const topInset = useSafeTopInset(10);
  const { workouts, getStreakWeeks } = useWorkoutHistoryStore();
  const { userProfile, weighInRecords, weighIn } = useTrainerStore();
  const { schedule, getPlannedWorkoutDaysCount } = useWorkoutScheduleStore();
  const { setActiveDashboard } = useDashboardTabStore();

  const [weighInModalVisible, setWeighInModalVisible] = useState(false);

  const today = new Date();
  const dateFormatted = today.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Calculate dynamic streak and total workouts
  const streak = getStreakWeeks();
  const totalWorkouts = workouts.length > 0 ? workouts.length : 35;

  // Calculate completed workouts this week (Monday to Sunday)
  const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() + diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const completedThisWeek = workouts.filter(w => {
    if (!w.completedAt) return false;
    const d = new Date(w.completedAt);
    return d >= startOfWeek && d <= today;
  }).length;

  const plannedThisWeek = getPlannedWorkoutDaysCount() || 3;

  // Determine today's routine from user's live schedule
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = dayNames[today.getDay()];
  const todayDaySchedule = schedule.find(s => s.dayName.toLowerCase() === todayDayName.toLowerCase());

  let todayRoutineName = 'Push Day · Scheduled';
  if (todayDaySchedule) {
    if (todayDaySchedule.isRest) {
      todayRoutineName = 'Rest Day · Active Recovery';
    } else if (todayDaySchedule.routines.length > 0) {
      todayRoutineName = `${todayDaySchedule.routines[0].name} · Scheduled`;
    }
  }

  // Weight metrics
  const currentWeight = userProfile.weight_kg || 78.4;
  const goalWeight = userProfile.weight_kg ? Number((userProfile.weight_kg - 1.4).toFixed(1)) : 77.0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 6 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.appTitle}>FitMatrix Workout</Text>
          <Text style={styles.dateSubtitle}>{dateFormatted}</Text>
        </View>

        <View style={styles.headerRight}>
          {/* Nutrition Dashboard Switcher Button */}
          <TouchableOpacity
            style={styles.switcherBtn}
            onPress={() => setActiveDashboard('nutrition')}
            activeOpacity={0.8}
          >
            <Text style={styles.switcherText}>🍎 Nutrition</Text>
          </TouchableOpacity>

          {/* Settings Gear Button */}
          <TouchableOpacity
            style={styles.gearBtn}
            onPress={onOpenSettings}
            activeOpacity={0.7}
          >
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="12" r="3" stroke="#9ca3af" strokeWidth="2" />
              <Path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                stroke="#9ca3af"
                strokeWidth="2"
              />
            </Svg>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mon-Sun Week Strip */}
        <WorkoutWeekStrip completedWorkouts={workouts} />

        {/* Today's Workout Hero */}
        <TodayWorkoutHeroCard
          routineName={todayRoutineName}
          onStartPress={onStartTodayWorkout}
        />

        {/* Gym Check-in Card (Live MMKV state) */}
        <GymCheckInCard onPress={onCheckIn} />

        {/* Body Weight Trend Card (Dynamic SVG curve & weigh-in integration) */}
        <BodyWeightTrendCard
          currentWeight={currentWeight}
          goalWeight={goalWeight}
          weighInRecords={weighInRecords}
          onLogPress={() => setWeighInModalVisible(true)}
        />

        {/* Streak Summary Card (Real calculations) */}
        <WorkoutStreakSummaryCard
          streakWeeks={streak > 0 ? streak : 12}
          completedThisWeek={completedThisWeek}
          plannedThisWeek={plannedThisWeek}
          totalWorkouts={totalWorkouts}
        />
      </ScrollView>

      {/* Dynamic Weigh-In Modal */}
      <WeighInModal
        visible={weighInModalVisible}
        onClose={() => setWeighInModalVisible(false)}
        onSave={weighIn}
        initialWeight={userProfile.weight_kg}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0c10',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#0a0c10',
  },
  headerLeft: {
    flex: 1,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  dateSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  switcherBtn: {
    backgroundColor: '#1c1f2a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2e3344',
  },
  switcherText: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '600',
  },
  gearBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#161922',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#242838',
  },
  scrollContent: {
    paddingBottom: 100, // space for tab bar
  },
});

export default WorkoutHomeScreen;
