import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTrainerStore } from '../../store/useTrainerStore';
import { useWorkoutHistoryStore } from '../../store/useWorkoutHistoryStore';

const DEFAULT_PLANNED_VOLUME: Record<string, number> = {
  Chest: 16,
  Back: 18,
  'Upper Legs': 20,
  Shoulders: 14,
  'Upper Arms': 12,
  Waist: 10,
  'Lower Legs': 8,
};

export const WeeklyPlanVolumeCard: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const { workoutPlan } = useTrainerStore();
  const { workouts } = useWorkoutHistoryStore();

  // Compute planned weekly sets from workoutPlan days if available
  const plannedMuscles = useMemo(() => {
    const counts: Record<string, number> = { ...DEFAULT_PLANNED_VOLUME };

    if (workoutPlan?.days && workoutPlan.days.length > 0) {
      // Clear defaults if custom plan exists
      const customCounts: Record<string, number> = {};
      workoutPlan.days.forEach(day => {
        const groups = day.targetMuscleGroups || [];
        const plannedExercisesCount = 5;
        const setsPerEx = 3;
        groups.forEach(g => {
          customCounts[g] = (customCounts[g] || 0) + plannedExercisesCount * setsPerEx;
        });
      });
      if (Object.keys(customCounts).length > 0) {
        return customCounts;
      }
    }
    return counts;
  }, [workoutPlan]);

  const sortedList = useMemo(() => {
    return Object.entries(plannedMuscles).sort((a, b) => b[1] - a[1]);
  }, [plannedMuscles]);

  const maxVal = sortedList.length > 0 ? sortedList[0][1] : 20;
  const displayed = expanded ? sortedList : sortedList.slice(0, 4);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Weekly muscle volume</Text>
      <Text style={styles.subtitle}>Planned sets per week, from your routine</Text>

      <View style={styles.list}>
        {displayed.map(([muscle, sets]) => {
          const fillPct = Math.min(100, Math.round((sets / maxVal) * 100));

          return (
            <View key={muscle} style={styles.row}>
              <Text style={styles.muscleName} numberOfLines={1}>
                {muscle}
              </Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${fillPct}%` }]} />
              </View>
              <Text style={styles.setsVal}>{sets} sets</Text>
            </View>
          );
        })}
      </View>

      {sortedList.length > 4 && (
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={() => setExpanded(v => !v)}
          activeOpacity={0.7}
        >
          <Text style={styles.toggleBtnText}>
            {expanded ? 'Show less ⌃' : 'Show more ⌄'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#161922',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#242838',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 14,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  muscleName: {
    width: 90,
    fontSize: 13,
    color: '#e5e7eb',
    fontWeight: '600',
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#10131a',
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  setsVal: {
    width: 55,
    textAlign: 'right',
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
  },
  toggleBtn: {
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
  },
  toggleBtnText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '700',
  },
});
