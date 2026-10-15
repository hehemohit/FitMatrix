import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface WorkoutStreakCardProps {
  streakWeeks: number;
  workoutsDoneThisWeek: number;
  workoutsPlannedThisWeek?: number;
  totalWorkoutsLogged: number;
  onPress?: () => void;
}

export const WorkoutStreakCard: React.FC<WorkoutStreakCardProps> = ({
  streakWeeks,
  workoutsDoneThisWeek,
  workoutsPlannedThisWeek = 4,
  totalWorkoutsLogged,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.leftCol}>
        <View style={styles.streakRow}>
          <Text style={styles.flameIcon}>🔥</Text>
          <Text style={styles.streakText}>
            {streakWeeks} {streakWeeks === 1 ? 'Week' : 'Weeks'} Streak
          </Text>
        </View>
        <Text style={styles.subText}>
          {workoutsDoneThisWeek} / {workoutsPlannedThisWeek} this week • {totalWorkoutsLogged}{' '}
          {totalWorkoutsLogged === 1 ? 'workout' : 'workouts'} total
        </Text>
      </View>
      <View style={styles.rightCol}>
        <Text style={styles.calendarIcon}>📅</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161922',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222836',
    marginBottom: 16,
  },
  leftCol: {
    flex: 1,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  flameIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  streakText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  subText: {
    color: '#717f96',
    fontSize: 12,
    fontWeight: '600',
  },
  rightCol: {
    paddingLeft: 12,
  },
  calendarIcon: {
    fontSize: 18,
  },
});
