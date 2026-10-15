import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import Svg, { Rect, Path, Line } from 'react-native-svg';
import { useSafeTopInset } from '../../hooks/useSafeTopInset';
import { useTrainerStore } from '../../store/useTrainerStore';
import { useDashboardTabStore } from '../../store/useDashboardTabStore';

interface RoutineScheduleItem {
  id: string;
  name: string;
  exerciseCount: number;
  iconType: 'push' | 'pull' | 'legs';
}

interface DaySchedule {
  dayName: string;
  isRest: boolean;
  routines: RoutineScheduleItem[];
}

const INITIAL_SCHEDULE: DaySchedule[] = [
  {
    dayName: 'Monday',
    isRest: false,
    routines: [{ id: '1', name: 'Push Day', exerciseCount: 6, iconType: 'push' }],
  },
  {
    dayName: 'Tuesday',
    isRest: true,
    routines: [],
  },
  {
    dayName: 'Wednesday',
    isRest: false,
    routines: [{ id: '2', name: 'Pull Day', exerciseCount: 5, iconType: 'pull' }],
  },
  {
    dayName: 'Thursday',
    isRest: true,
    routines: [],
  },
  {
    dayName: 'Friday',
    isRest: false,
    routines: [{ id: '3', name: 'Leg Day', exerciseCount: 6, iconType: 'legs' }],
  },
  {
    dayName: 'Saturday',
    isRest: true,
    routines: [],
  },
  {
    dayName: 'Sunday',
    isRest: true,
    routines: [],
  },
];

interface WorkoutPlanScreenProps {
  onSelectRoutine?: (routineName: string) => void;
  onOpenCoach?: () => void;
  onAddRoutine?: (dayName: string) => void;
}

export const WorkoutPlanScreen: React.FC<WorkoutPlanScreenProps> = ({
  onSelectRoutine,
  onOpenCoach,
  onAddRoutine,
}) => {
  const topInset = useSafeTopInset(10);
  const { setActiveDashboard } = useDashboardTabStore();
  const [schedule, setSchedule] = useState<DaySchedule[]>(INITIAL_SCHEDULE);

  const handleToggleRest = (index: number) => {
    const updated = [...schedule];
    const day = updated[index];
    if (day.isRest) {
      day.isRest = false;
      day.routines = [
        {
          id: `r_${Date.now()}`,
          name: 'Custom Workout',
          exerciseCount: 4,
          iconType: 'push',
        },
      ];
    } else {
      day.isRest = true;
      day.routines = [];
    }
    setSchedule(updated);
  };

  const handleRemoveRoutine = (dayIndex: number, routineId: string) => {
    const updated = [...schedule];
    updated[dayIndex].routines = updated[dayIndex].routines.filter(r => r.id !== routineId);
    if (updated[dayIndex].routines.length === 0) {
      updated[dayIndex].isRest = true;
    }
    setSchedule(updated);
  };

  const handleAddRoutine = (dayIndex: number) => {
    if (onAddRoutine) {
      onAddRoutine(schedule[dayIndex].dayName);
    } else {
      const updated = [...schedule];
      updated[dayIndex].isRest = false;
      updated[dayIndex].routines.push({
        id: `r_${Date.now()}`,
        name: 'New Routine',
        exerciseCount: 4,
        iconType: 'push',
      });
      setSchedule(updated);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 6 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.appTitle}>Plan</Text>
          <Text style={styles.subtitle}>Your weekly routine</Text>
        </View>

        <View style={styles.headerRight}>
          {/* Nutrition Switcher Button */}
          <TouchableOpacity
            style={styles.switcherBtn}
            onPress={() => setActiveDashboard('nutrition')}
            activeOpacity={0.8}
          >
            <Text style={styles.switcherText}>🍎 Nutrition</Text>
          </TouchableOpacity>

          {/* Export / Share Button */}
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={() => Alert.alert('Share Plan', 'Weekly routine copied to clipboard')}
            activeOpacity={0.7}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M4 12V20C4 20.5523 4.44772 21 5 21H19C19.5523 21 20 20.5523 20 20V12"
                stroke="#9ca3af"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <Path
                d="M12 3V15"
                stroke="#9ca3af"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <Path
                d="M7 8L12 3L17 8"
                stroke="#9ca3af"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Coach Hero Card */}
        <TouchableOpacity
          style={styles.coachCard}
          onPress={onOpenCoach}
          activeOpacity={0.85}
        >
          <View style={styles.coachLeft}>
            <View style={styles.coachIconBox}>
              <Text style={styles.coachSparkle}>✦</Text>
            </View>
            <View style={styles.coachTextWrap}>
              <Text style={styles.coachTitle}>Coach</Text>
              <Text style={styles.coachSubtitle}>
                Plan design and reviews, from your own training
              </Text>
            </View>
          </View>
          <Text style={styles.coachChevron}>›</Text>
        </TouchableOpacity>

        {/* Week Schedule Section */}
        <Text style={styles.sectionHeader}>Week schedule</Text>

        {/* Days List */}
        {schedule.map((day, dayIdx) => (
          <View key={day.dayName} style={styles.dayCard}>
            {day.isRest ? (
              // Rest Day Card
              <View style={styles.restDayRow}>
                <Text style={styles.dayNameText}>{day.dayName}</Text>
                <TouchableOpacity
                  style={styles.restPill}
                  onPress={() => handleToggleRest(dayIdx)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.restPillText}>Rest ›</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Active Routine Day Card
              <View>
                <View style={styles.activeDayHeader}>
                  <Text style={styles.dayNameText}>{day.dayName}</Text>
                  <Text style={styles.routineCountText}>
                    {day.routines.length} routines
                  </Text>
                </View>

                {/* Routine Items */}
                {day.routines.map(routine => (
                  <TouchableOpacity
                    key={routine.id}
                    style={styles.routineRow}
                    onPress={() => onSelectRoutine && onSelectRoutine(routine.name)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.routineLeft}>
                      <View style={styles.routineIconBox}>
                        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                          <Rect x="2" y="9" width="3" height="6" rx="1" fill="#000000" />
                          <Rect x="5" y="7" width="2" height="10" rx="1" fill="#000000" />
                          <Line x1="7" y1="12" x2="17" y2="12" stroke="#000000" strokeWidth="2.5" />
                          <Rect x="17" y="7" width="2" height="10" rx="1" fill="#000000" />
                          <Rect x="19" y="9" width="3" height="6" rx="1" fill="#000000" />
                        </Svg>
                      </View>
                      <View>
                        <Text style={styles.routineName}>{routine.name}</Text>
                        <Text style={styles.routineExerciseCount}>
                          {routine.exerciseCount} exercises
                        </Text>
                      </View>
                    </View>

                    {/* Delete Routine Cross */}
                    <TouchableOpacity
                      style={styles.crossBtn}
                      onPress={() => handleRemoveRoutine(dayIdx, routine.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.crossText}>✕</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}

                {/* + Add Routine Button */}
                <TouchableOpacity
                  style={styles.addRoutineBtn}
                  onPress={() => handleAddRoutine(dayIdx)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addRoutineText}>+ Add routine</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
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
    paddingBottom: 12,
    backgroundColor: '#0a0c10',
  },
  headerLeft: {
    flex: 1,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtitle: {
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
  exportBtn: {
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
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  coachCard: {
    backgroundColor: '#101d16',
    borderWidth: 1,
    borderColor: '#1e3a29',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 20,
  },
  coachLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  coachIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  coachSparkle: {
    color: '#000000',
    fontSize: 22,
    fontWeight: '900',
  },
  coachTextWrap: {
    flex: 1,
  },
  coachTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 3,
  },
  coachSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
  coachChevron: {
    fontSize: 22,
    color: '#22c55e',
    fontWeight: '400',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 12,
  },
  dayCard: {
    backgroundColor: '#161922',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#242838',
  },
  restDayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayNameText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  restPill: {
    backgroundColor: '#232838',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  restPillText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
  },
  activeDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routineCountText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  routineRow: {
    backgroundColor: '#12141c',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1f2332',
  },
  routineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  routineIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  routineName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  routineExerciseCount: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  crossBtn: {
    padding: 6,
  },
  crossText: {
    color: '#9ca3af',
    fontSize: 15,
    fontWeight: '600',
  },
  addRoutineBtn: {
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  addRoutineText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default WorkoutPlanScreen;
