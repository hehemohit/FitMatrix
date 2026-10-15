import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';

interface WorkoutStreakSummaryCardProps {
  streakWeeks?: number;
  completedThisWeek?: number;
  plannedThisWeek?: number;
  totalWorkouts?: number;
}

export const WorkoutStreakSummaryCard: React.FC<WorkoutStreakSummaryCardProps> = ({
  streakWeeks = 12,
  completedThisWeek = 3,
  plannedThisWeek = 3,
  totalWorkouts = 35,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.flameEmoji}>🔥</Text>
          <Text style={styles.streakTitle}>{streakWeeks} week streak</Text>
        </View>

        {/* Outline Calendar Icon */}
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="4" width="18" height="18" rx="2" stroke="#9ca3af" strokeWidth="2" />
          <Line x1="3" y1="9" x2="21" y2="9" stroke="#9ca3af" strokeWidth="2" />
          <Line x1="8" y1="2" x2="8" y2="5" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
          <Line x1="16" y1="2" x2="16" y2="5" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
        </Svg>
      </View>

      <Text style={styles.subtext}>
        {completedThisWeek} / {plannedThisWeek} this week · {totalWorkouts} workouts total
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#161922',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#242838',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flameEmoji: {
    fontSize: 20,
  },
  streakTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtext: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
});

export default WorkoutStreakSummaryCard;
